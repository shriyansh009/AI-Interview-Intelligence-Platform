import os
import re
import json
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from config import get_settings

settings = get_settings()


class BaseLLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.3) -> str:
        """Generate text completion from a prompt."""
        pass

    @abstractmethod
    def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Any:
        """Generate structured JSON response."""
        pass


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model or settings.GEMINI_MODEL
        self._client = None

    def _get_client(self):
        if self._client is None:
            from langchain_google_genai import ChatGoogleGenerativeAI
            self._client = ChatGoogleGenerativeAI(
                model=self.model_name,
                google_api_key=self.api_key,
                temperature=0.3
            )
        return self._client

    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.3) -> str:
        if not self.api_key:
            return "Note: GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env file."
        try:
            from langchain_core.prompts import ChatPromptTemplate
            client = self._get_client()
            messages = []
            if system_prompt:
                messages.append(("system", system_prompt))
            messages.append(("human", "{prompt}"))
            chain = ChatPromptTemplate.from_messages(messages) | client
            response = chain.invoke({"prompt": prompt})
            content = response.content
            if isinstance(content, list):
                return " ".join(b.get("text", "") for b in content if isinstance(b, dict))
            return str(content)
        except Exception as e:
            return f"[Gemini Error: {str(e)}]"

    def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Any:
        full_system = (system_prompt or "") + "\nYou MUST return only valid, raw JSON. Do not include markdown code block backticks."
        raw = self.generate(prompt, full_system, temperature=0.1)
        cleaned = re.sub(r"^```json\s*", "", raw, flags=re.MULTILINE)
        cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.MULTILINE).strip()
        try:
            return json.loads(cleaned)
        except Exception:
            return {}


class MistralProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.MISTRAL_API_KEY
        self.model_name = model or settings.MISTRAL_MODEL
        self._client = None

    def _get_client(self):
        if self._client is None:
            from langchain_mistralai import ChatMistralAI
            self._client = ChatMistralAI(
                model=self.model_name,
                mistral_api_key=self.api_key,
                temperature=0.3
            )
        return self._client

    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.3) -> str:
        if not self.api_key:
            return "Note: MISTRAL_API_KEY is not configured. Please set MISTRAL_API_KEY in your .env file."
        try:
            from langchain_core.prompts import ChatPromptTemplate
            client = self._get_client()
            messages = []
            if system_prompt:
                messages.append(("system", system_prompt))
            messages.append(("human", "{prompt}"))
            chain = ChatPromptTemplate.from_messages(messages) | client
            response = chain.invoke({"prompt": prompt})
            return str(response.content)
        except Exception as e:
            return f"[Mistral Error: {str(e)}]"

    def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Any:
        full_system = (system_prompt or "") + "\nYou MUST return only valid raw JSON without markdown backticks."
        raw = self.generate(prompt, full_system, temperature=0.1)
        cleaned = re.sub(r"^```json\s*", "", raw, flags=re.MULTILINE)
        cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.MULTILINE).strip()
        try:
            return json.loads(cleaned)
        except Exception:
            return {}


class LLMService:
    """Unified LLM Service with dynamic provider switching."""

    def __init__(self, provider: Optional[str] = None):
        self.provider_name = provider or settings.LLM_PROVIDER
        if self.provider_name.lower() == "mistral":
            self.provider = MistralProvider()
        else:
            self.provider = GeminiProvider()

    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.3) -> str:
        return self.provider.generate(prompt, system_prompt, temperature)

    def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Any:
        return self.provider.generate_json(prompt, system_prompt)


_default_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _default_llm_service
    if _default_llm_service is None:
        _default_llm_service = LLMService()
    return _default_llm_service
