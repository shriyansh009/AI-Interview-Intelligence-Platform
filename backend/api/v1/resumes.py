import json
import os
import shutil
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from config import get_settings
from core.auth import get_current_user
from db.database import get_db
from models.models import Resume, User
from schemas.schemas import ResumeResponse
from services.resume_service import get_resume_service

router = APIRouter(prefix="/resumes", tags=["Resumes"])
settings = get_settings()
resume_service = get_resume_service()


@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename or "resume.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc", ".txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF, DOCX, or TXT."
        )

    user_upload_dir = os.path.join(settings.UPLOAD_DIR, f"user_{current_user.id}")
    os.makedirs(user_upload_dir, exist_ok=True)
    saved_path = os.path.join(user_upload_dir, filename)

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        raw_text = resume_service.extract_text_from_file(saved_path)
        if not raw_text.strip():
            raise ValueError("No text could be extracted from the uploaded resume.")

        parsed_data = resume_service.parse_resume_structure(raw_text)

        db_resume = Resume(
            user_id=current_user.id,
            filename=filename,
            file_path=saved_path,
            raw_text=raw_text,
            parsed_skills=json.dumps(parsed_data.get("skills", [])),
            parsed_experience=json.dumps(parsed_data.get("experience", [])),
            parsed_education=json.dumps(parsed_data.get("education", [])),
        )
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)

        # Index in ChromaDB
        resume_service.index_resume(
            user_id=current_user.id,
            resume_id=db_resume.id,
            filename=filename,
            text=raw_text
        )

        return db_resume
    except Exception as e:
        if os.path.exists(saved_path):
            try:
                os.remove(saved_path)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resume processing failed: {str(e)}"
        )


@router.get("", response_model=List[ResumeResponse])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).all()


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_200_OK)
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    if os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except Exception:
            pass

    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted successfully."}
