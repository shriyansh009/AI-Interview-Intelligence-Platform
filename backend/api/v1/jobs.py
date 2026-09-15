import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.database import get_db
from models.models import JobDescription, User
from schemas.schemas import JobDescriptionCreate, JobDescriptionResponse
from services.analysis_service import get_analysis_service

router = APIRouter(prefix="/jobs", tags=["Job Descriptions"])
analysis_service = get_analysis_service()


@router.post("", response_model=JobDescriptionResponse, status_code=status.HTTP_201_CREATED)
def create_job_description(
    payload: JobDescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty.")

    parsed = analysis_service.parse_job_description(payload.raw_text)

    db_jd = JobDescription(
        user_id=current_user.id,
        title=payload.title or parsed.get("title", "Target Job"),
        company=payload.company,
        raw_text=payload.raw_text,
        required_skills=json.dumps(parsed.get("required_skills", [])),
        preferred_skills=json.dumps(parsed.get("preferred_skills", [])),
        responsibilities=json.dumps(parsed.get("responsibilities", [])),
    )
    db.add(db_jd)
    db.commit()
    db.refresh(db_jd)

    # Index in ChromaDB
    analysis_service.index_job_description(
        user_id=current_user.id,
        jd_id=db_jd.id,
        text=payload.raw_text
    )

    return db_jd


@router.get("", response_model=List[JobDescriptionResponse])
def list_job_descriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(JobDescription).filter(
        JobDescription.user_id == current_user.id
    ).order_by(JobDescription.created_at.desc()).all()


@router.get("/{jd_id}", response_model=JobDescriptionResponse)
def get_job_description(
    jd_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    jd = db.query(JobDescription).filter(
        JobDescription.id == jd_id,
        JobDescription.user_id == current_user.id
    ).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")
    return jd


@router.delete("/{jd_id}", status_code=status.HTTP_200_OK)
def delete_job_description(
    jd_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    jd = db.query(JobDescription).filter(
        JobDescription.id == jd_id,
        JobDescription.user_id == current_user.id
    ).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")

    db.delete(jd)
    db.commit()
    return {"message": "Job description deleted successfully."}
