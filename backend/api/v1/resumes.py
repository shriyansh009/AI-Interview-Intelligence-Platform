import os
import shutil
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from config import get_settings
from core.auth import get_current_user
from db.database import get_db
from models.models import Resume, User
from schemas.schemas import ResumeResponse
from services.resume_service import get_resume_service, process_resume_background

router = APIRouter(prefix="/resumes", tags=["Resumes"])
settings = get_settings()
resume_service = get_resume_service()


@router.post(
    "/upload",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename or "resume.pdf"

    ext = os.path.splitext(filename)[1].lower()

    if ext not in [".pdf", ".docx", ".doc", ".txt"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format."
        )

    user_upload_dir = os.path.join(
        settings.UPLOAD_DIR,
        f"user_{current_user.id}"
    )

    os.makedirs(user_upload_dir, exist_ok=True)

    saved_path = os.path.join(
        user_upload_dir,
        filename
    )

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create DB record only
        db_resume = Resume(
            user_id=current_user.id,
            filename=filename,
            file_path=saved_path,
            raw_text="",
            status="processing"
        )

        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)

        # Start expensive processing AFTER response work
        background_tasks.add_task(
            process_resume_background,
            db_resume.id,
            current_user.id,
            filename,
            saved_path
        )

        return db_resume

    except Exception as e:
        if os.path.exists(saved_path):
            os.remove(saved_path)

        raise HTTPException(
            status_code=400,
            detail=f"Resume upload failed: {str(e)}"
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