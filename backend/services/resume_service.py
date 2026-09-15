import json
import os
import re
from typing import Any, Dict, List, Optional

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import docx
except ImportError:
    docx = None

from config import get_settings
from services.embedding_service import get_embedding_service
from services.llm_service import get_llm_service

settings = get_settings()

COMMON_TECH_SKILLS = [
    "python", "javascript", "typescript", "react", "vue", "angular", "node.js", "express",
    "fastapi", "django", "flask", "postgresql", "mysql", "mongodb", "redis", "sqlite",
    "docker", "kubernetes", "aws", "gcp", "azure", "git", "github", "gitlab", "ci/cd",
    "linux", "html", "css", "tailwind css", "rest api", "graphql", "grpc", "microservices",
    "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch",
    "scikit-learn", "pandas", "numpy", "rag", "langchain", "llamaindex", "faiss", "chromadb",
    "whisper", "speech-to-text", "ffmpeg", "kafka", "rabbitmq", "celery", "c++", "c#", "java",
    "golang", "rust", "sql", "nosql", "system design", "data structures", "algorithms"
]


class ResumeService:
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.llm_service = get_llm_service()

    def extract_text_from_file(self, file_path: str) -> str:
        """Extract plain text from PDF or DOCX file."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return self._extract_text_from_pdf(file_path)
        elif ext in [".docx", ".doc"]:
            return self._extract_text_from_docx(file_path)
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        else:
            raise ValueError(f"Unsupported resume file extension: {ext}")

    def _extract_text_from_pdf(self, pdf_path: str) -> str:
        text_parts = []
        doc = fitz.open(pdf_path)
        for page in doc:
            page_text = page.get_text()
            if page_text:
                text_parts.append(page_text)
        return "\n".join(text_parts).strip()

    def _extract_text_from_docx(self, docx_path: str) -> str:
        doc = docx.Document(docx_path)
        text_parts = [para.text for para in doc.paragraphs if para.text]
        return "\n".join(text_parts).strip()

    def extract_deterministic_skills(self, text: str) -> List[str]:
        """Extract known skills deterministically using regex word boundaries."""
        lower_text = text.lower()
        found = set()
        for skill in COMMON_TECH_SKILLS:
            # Match whole skill name
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, lower_text):
                found.add(skill.title() if len(skill) > 3 else skill.upper())
        return sorted(list(found))

    def parse_resume_structure(self, text: str) -> Dict[str, Any]:
        """Parse structured sections: skills, experience, education, projects."""
        deterministic_skills = self.extract_deterministic_skills(text)

        system_prompt = (
            "You are an expert HR resume parser. Extract structured details from the resume text. "
            "Return valid JSON matching: "
            '{"skills": ["..."], "experience": [{"company": "...", "role": "...", "duration": "...", "highlights": ["..."]}], "education": [{"degree": "...", "institution": "...", "year": "..."}], "projects": [{"title": "...", "technologies": ["..."], "description": "..."}]}'
        )
        prompt = f"Resume Text:\n{text[:8000]}"
        parsed = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        if not isinstance(parsed, dict):
            parsed = {}

        # Merge deterministic and LLM-extracted skills
        llm_skills = [s.strip().title() for s in parsed.get("skills", []) if isinstance(s, str)]
        merged_skills = sorted(list(set(deterministic_skills + llm_skills)))

        return {
            "skills": merged_skills,
            "experience": parsed.get("experience", []),
            "education": parsed.get("education", []),
            "projects": parsed.get("projects", []),
        }

    def index_resume(self, user_id: int, resume_id: int, filename: str, text: str):
        """Chunk and index resume text into user's ChromaDB collection."""
        collection_name = f"resume_{user_id}"
        chunks = self.embedding_service.split_text(text, chunk_size=400, overlap=80)
        metadatas = [
            {
                "source_type": "resume",
                "user_id": user_id,
                "resume_id": resume_id,
                "filename": filename,
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]
        ids = [f"res_{resume_id}_chk_{i}" for i in range(len(chunks))]
        self.embedding_service.add_documents(
            collection_name=collection_name,
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )


_default_resume_service: Optional[ResumeService] = None


def get_resume_service() -> ResumeService:
    global _default_resume_service
    if _default_resume_service is None:
        _default_resume_service = ResumeService()
    return _default_resume_service
