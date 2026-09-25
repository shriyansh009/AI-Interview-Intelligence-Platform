import json
import os
import re
from importlib import import_module
from typing import Any, Dict, List, Optional
from db.database import SessionLocal
from models.models import Resume

try:
    fitz = import_module("pymupdf")
except ImportError:
    fitz = None

try:
    docx = import_module("docx")
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
            return self._extract_text_from_text_file(file_path)
        else:
            raise ValueError(f"Unsupported resume file extension: {ext}")

    def _extract_text_from_text_file(self, text_path: str) -> str:
        with open(text_path, "rb") as file:
            content = file.read()

        for encoding in ("utf-8-sig", "utf-16", "cp1252", "latin-1"):
            try:
                return content.decode(encoding)
            except UnicodeDecodeError:
                continue

        return content.decode("utf-8", errors="replace")

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
            "You are an expert HR resume parser. Extract only information explicitly present in the resume. "
            "Return exactly one JSON object with these keys and types: "
            '{"skills": ["string"], "experience": [{"company": "string", "role": "string", "duration": "string", "highlights": ["string"]}], '
            '"education": [{"degree": "string", "institution": "string", "year": "string"}], '
            '"projects": [{"title": "string", "technologies": ["string"], "description": "string"}]}. '
            "Use empty strings for unknown scalar values and empty arrays for missing sections. "
            "Do not return markdown, comments, or additional keys."
        )
        prompt = f"Resume Text:\n{text[:8000]}"
        parsed = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        if not isinstance(parsed, dict):
            parsed = {}

        # Merge deterministic and LLM-extracted skills
        llm_skills = [s.strip().title() for s in self._string_list(parsed.get("skills"))]
        merged_skills = sorted(list(set(deterministic_skills + llm_skills)))

        return {
            "skills": merged_skills,
            "experience": self._object_list(parsed.get("experience")),
            "education": self._object_list(parsed.get("education")),
            "projects": self._object_list(parsed.get("projects")),
        }

    @staticmethod
    def _string_list(value: Any) -> List[str]:
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return []

    @staticmethod
    def _object_list(value: Any) -> List[Dict[str, Any]]:
        if not isinstance(value, list):
            return []

        normalized = []
        for item in value:
            if not isinstance(item, dict):
                continue
            normalized_item = dict(item)
            for key in ("highlights", "technologies"):
                if key in normalized_item and isinstance(normalized_item[key], str):
                    normalized_item[key] = [normalized_item[key]]
            normalized.append(normalized_item)
        return normalized

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

def process_resume_background(
    resume_id: int,
    user_id: int,
    filename: str,
    saved_path: str
):
    db = SessionLocal()
    resume_service = get_resume_service()

    try:
        # 1. Extract text
        raw_text = resume_service.extract_text_from_file(saved_path)

        if not raw_text or not raw_text.strip():
            raise ValueError("No text could be extracted from resume.")

        print(f"Extracted {len(raw_text)} characters from {filename}")

        # 2. Get resume
        resume = db.query(Resume).filter(
            Resume.id == resume_id
        ).first()

        if not resume:
            raise ValueError(
                f"Resume with id={resume_id} not found"
            )

        # 3. SAVE RAW TEXT FIRST
        resume.raw_text = raw_text
        resume.status = "processing"

        db.commit()

        print(
            f"Raw text saved for resume {resume_id}: "
            f"{len(raw_text)} characters"
        )

        # 4. Parse resume
        parsed_data = resume_service.parse_resume_structure(
            raw_text
        )

        # 5. Save parsed data
        resume.parsed_skills = json.dumps(
            parsed_data.get("skills", [])
        )

        resume.parsed_experience = json.dumps(
            parsed_data.get("experience", [])
        )

        resume.parsed_education = json.dumps(
            parsed_data.get("education", [])
        )

        db.commit()

        # 6. Index into Chroma
        resume_service.index_resume(
            user_id=user_id,
            resume_id=resume_id,
            filename=filename,
            text=raw_text
        )

        # 7. Mark completed
        resume.status = "completed"
        db.commit()

        print(f"Resume {resume_id} processed successfully.")

    except Exception as e:
        db.rollback()

        import traceback
        traceback.print_exc()

        try:
            resume = db.query(Resume).filter(
                Resume.id == resume_id
            ).first()

            if resume:
                resume.status = "failed"
                resume.processing_error = str(e)
                db.commit()

        except Exception:
            db.rollback()

    finally:
        db.close()


def get_resume_service() -> ResumeService:
    global _default_resume_service
    if _default_resume_service is None:
        _default_resume_service = ResumeService()
    return _default_resume_service
