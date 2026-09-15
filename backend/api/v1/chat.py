import json
import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.database import get_db
from models.models import (
    Analysis,
    ChatMessage,
    ChatSession,
    User,
    Video,
    VideoStatus,
)
from schemas.schemas import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
)
from services.rag_service import get_rag_service

router = APIRouter(prefix="/chat", tags=["AI Chat"])
rag_service = get_rag_service()


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = ChatSession(
        user_id=current_user.id,
        analysis_id=payload.analysis_id,
        title=payload.title or "New Conversation",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    return db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()


@router.post("/message", response_model=ChatMessageResponse)
def send_message(
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Find or create session
    if payload.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == payload.session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found.")
    else:
        # Create fresh session
        session = ChatSession(
            user_id=current_user.id,
            analysis_id=payload.analysis_id,
            title=payload.message[:30] + "..."
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 1. Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        user_id=current_user.id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)
    db.commit()

    # 2. Query multi-source RAG
    user_videos = db.query(Video).filter(
        Video.user_id == current_user.id,
        Video.status == VideoStatus.COMPLETED.value
    ).all()
    video_ids = [v.id for v in user_videos]

    recent_msgs = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.asc()).limit(6).all()
    history = [{"role": m.role, "content": m.content} for m in recent_msgs]

    rag_result = rag_service.query_rag(
        question=payload.message,
        user_id=current_user.id,
        source_types=["resume", "job_description", "video"],
        video_ids=video_ids,
        conversation_history=history
    )

    # 3. Save assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        user_id=current_user.id,
        role="assistant",
        content=rag_result["answer"],
        sources=json.dumps(rag_result["sources"]),
        response_time_ms=rag_result["response_time_ms"]
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return assistant_msg
