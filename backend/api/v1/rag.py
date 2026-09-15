from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.database import get_db
from models.models import ChatMessage, ChatSession, User, Video, VideoStatus
from schemas.schemas import RAGQueryRequest, RAGQueryResponse, SourceCitation
from services.rag_service import get_rag_service

router = APIRouter(prefix="/rag", tags=["Multi-Source RAG"])
rag_service = get_rag_service()


@router.post("/query", response_model=RAGQueryResponse)
def query_rag(
    payload: RAGQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Fetch user's completed video IDs
    user_videos = db.query(Video).filter(
        Video.user_id == current_user.id,
        Video.status == VideoStatus.COMPLETED.value
    ).all()
    video_ids = [v.id for v in user_videos]

    # Optional history retrieval
    conversation_history = []
    if payload.session_id:
        msgs = db.query(ChatMessage).filter(
            ChatMessage.session_id == payload.session_id,
            ChatMessage.user_id == current_user.id
        ).order_by(ChatMessage.created_at.asc()).limit(6).all()
        conversation_history = [{"role": m.role, "content": m.content} for m in msgs]

    result = rag_service.query_rag(
        question=payload.question,
        user_id=current_user.id,
        source_types=payload.sources,
        video_ids=video_ids,
        conversation_history=conversation_history
    )

    citations = [
        SourceCitation(
            source_type=c["source_type"],
            source_id=c.get("source_id"),
            title=c.get("title"),
            section=c.get("section"),
            start_time=c.get("start_time"),
            end_time=c.get("end_time"),
            timestamp_formatted=c.get("timestamp_formatted"),
            text_snippet=c["text_snippet"],
            similarity=c["similarity"]
        )
        for c in result["sources"]
    ]

    return RAGQueryResponse(
        question=result["question"],
        answer=result["answer"],
        sources=citations,
        response_time_ms=result["response_time_ms"]
    )
