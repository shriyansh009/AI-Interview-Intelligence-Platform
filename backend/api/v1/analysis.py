import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.database import get_db
from models.models import Analysis, JobDescription, Resume, User
from schemas.schemas import AnalysisRequest, AnalysisResponse
from services.analysis_service import get_analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis & ATS"])
analysis_service = get_analysis_service()


@router.post("/run", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
def run_analysis(
    payload: AnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == payload.resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    jd_text = ""
    if payload.job_description_id:
        jd = db.query(JobDescription).filter(
            JobDescription.id == payload.job_description_id,
            JobDescription.user_id == current_user.id
        ).first()
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found.")
        jd_text = jd.raw_text
    elif payload.job_description_text:
        jd_text = payload.job_description_text
    else:
        raise HTTPException(
            status_code=400,
            detail="Either job_description_id or job_description_text must be provided."
        )

    try:
        resume_skills = json.loads(resume.parsed_skills or "[]")
    except Exception:
        resume_skills = []

    analysis_data = analysis_service.generate_analysis(
        resume_text=resume.raw_text,
        resume_skills=resume_skills,
        jd_text=jd_text
    )

    db_analysis = Analysis(
        user_id=current_user.id,
        resume_id=resume.id,
        job_description_id=payload.job_description_id,
        job_description_text=jd_text,
        ats_score=analysis_data["ats_score"],
        matching_skills=json.dumps(analysis_data["matching_skills"]),
        missing_skills=json.dumps(analysis_data["missing_skills"]),
        partial_skills=json.dumps(analysis_data.get("partial_skills", [])),
        suggestions=json.dumps(analysis_data["suggestions"]),
    )
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)

    return db_analysis


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis


@router.get("", response_model=List[AnalysisResponse])
def list_analyses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Analysis).filter(
        Analysis.user_id == current_user.id
    ).order_by(Analysis.created_at.desc()).all()
