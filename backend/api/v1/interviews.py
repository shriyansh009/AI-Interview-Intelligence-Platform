import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.database import get_db
from models.models import (
    Analysis,
    InterviewAnswer,
    InterviewQuestion,
    InterviewSession,
    InterviewStatus,
    Resume,
    User,
)
from schemas.schemas import (
    AnswerEvaluationResponse,
    AnswerSubmitRequest,
    InterviewQuestionResponse,
    InterviewSessionCreate,
    InterviewSessionResponse,
    QuestionGenerateRequest,
)
from services.interview_service import get_interview_service

router = APIRouter(prefix="/interviews", tags=["AI Mock Interview"])
interview_service = get_interview_service()


@router.post("/generate/{analysis_id}", response_model=List[InterviewQuestionResponse])
def generate_questions(
    analysis_id: int,
    payload: Optional[QuestionGenerateRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    resume = db.query(Resume).filter(Resume.id == analysis.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Associated resume not found.")

    try:
        matched = json.loads(analysis.matching_skills or "[]")
        missing = json.loads(analysis.missing_skills or "[]")
    except Exception:
        matched, missing = [], []

    q_types = payload.question_types if payload else ["technical", "behavioral", "hr", "system_design"]
    count = payload.count if payload else 5

    generated = interview_service.generate_personalized_questions(
        resume_text=resume.raw_text,
        jd_text=analysis.job_description_text,
        matched_skills=matched,
        missing_skills=missing,
        question_types=q_types,
        count=count
    )

    db_questions = []
    for i, q in enumerate(generated):
        db_q = InterviewQuestion(
            analysis_id=analysis.id,
            question_type=q.get("question_type", "technical"),
            question_text=q["question_text"],
            model_answer=q.get("model_answer"),
            category=q.get("category", "General"),
            order_index=i
        )
        db.add(db_q)
        db_questions.append(db_q)

    db.commit()
    for q in db_questions:
        db.refresh(q)

    return db_questions


@router.post("/sessions", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED)
def create_interview_session(
    payload: InterviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = InterviewSession(
        user_id=current_user.id,
        analysis_id=payload.analysis_id,
        title=payload.title or "Mock Technical Interview",
        status=InterviewStatus.IN_PROGRESS.value,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # If analysis_id provided, link existing questions or generate fresh ones
    if payload.analysis_id:
        existing_qs = db.query(InterviewQuestion).filter(
            InterviewQuestion.analysis_id == payload.analysis_id,
            InterviewQuestion.session_id == None
        ).all()
        for q in existing_qs:
            q.session_id = session.id
        db.commit()

    return session


@router.get("/sessions", response_model=List[InterviewSessionResponse])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.started_at.desc()).all()


@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    return session


@router.post("/sessions/{session_id}/answer", response_model=AnswerEvaluationResponse)
def submit_answer(
    session_id: int,
    payload: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == payload.question_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    eval_result = interview_service.evaluate_candidate_answer(
        question_text=question.question_text,
        model_answer=question.model_answer,
        candidate_answer=payload.answer_text,
        question_type=question.question_type
    )

    db_answer = InterviewAnswer(
        session_id=session.id,
        question_id=question.id,
        user_id=current_user.id,
        answer_text=payload.answer_text,
        technical_accuracy=eval_result["technical_accuracy"],
        relevance=eval_result["relevance"],
        completeness=eval_result["completeness"],
        clarity=eval_result["clarity"],
        confidence=eval_result["confidence"],
        overall_score=eval_result["overall_score"],
        strengths=json.dumps(eval_result["strengths"]),
        weaknesses=json.dumps(eval_result["weaknesses"]),
        missing_concepts=json.dumps(eval_result["missing_concepts"]),
        suggested_answer=eval_result.get("suggested_answer"),
    )
    db.add(db_answer)
    db.commit()
    db.refresh(db_answer)

    return AnswerEvaluationResponse(
        answer_id=db_answer.id,
        question_id=question.id,
        technical_accuracy=eval_result["technical_accuracy"],
        relevance=eval_result["relevance"],
        completeness=eval_result["completeness"],
        clarity=eval_result["clarity"],
        confidence=eval_result["confidence"],
        overall_score=eval_result["overall_score"],
        strengths=eval_result["strengths"],
        weaknesses=eval_result["weaknesses"],
        missing_concepts=eval_result["missing_concepts"],
        suggested_answer=eval_result.get("suggested_answer")
    )


@router.post("/sessions/{session_id}/complete", response_model=InterviewSessionResponse)
def complete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    answers = db.query(InterviewAnswer).filter(
        InterviewAnswer.session_id == session.id
    ).all()

    answers_data = [
        {
            "overall_score": a.overall_score,
            "strengths": json.loads(a.strengths or "[]"),
            "weaknesses": json.loads(a.weaknesses or "[]"),
        }
        for a in answers
    ]

    report = interview_service.generate_final_report(
        session_title=session.title,
        evaluations=answers_data
    )

    session.status = InterviewStatus.COMPLETED.value
    session.overall_score = report["overall_score"]
    session.summary_feedback = report["summary_feedback"]
    session.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(session)

    return session
