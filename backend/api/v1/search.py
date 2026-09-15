from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.database import get_db
from models.models import User, Video, VideoStatus
from schemas.schemas import VideoSearchItem, VideoSearchResponse
from services.rag_service import get_rag_service

router = APIRouter(prefix="/search", tags=["Semantic Search"])
rag_service = get_rag_service()


@router.get("/videos", response_model=VideoSearchResponse)
def search_videos(
    q: str = Query(..., min_length=2, description="Search query"),
    video_id: Optional[int] = Query(None, description="Optional specific video ID filter"),
    top_k: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Video).filter(
        Video.user_id == current_user.id,
        Video.status == VideoStatus.COMPLETED.value
    )
    if video_id:
        query = query.filter(Video.id == video_id)

    user_videos = query.all()
    video_ids = [v.id for v in user_videos]

    if not video_ids:
        return VideoSearchResponse(query=q, results=[])

    raw_results = rag_service.search_video_transcripts(
        query=q,
        video_ids=video_ids,
        top_k=top_k
    )

    items = [
        VideoSearchItem(
            video_id=r["video_id"],
            video_title=r["video_title"],
            chunk_id=int(str(r["chunk_id"]).split("_")[-1]) if "_" in str(r["chunk_id"]) else 0,
            text=r["text"],
            start_time=r["start_time"],
            end_time=r["end_time"],
            timestamp_formatted=r["timestamp_formatted"],
            similarity_score=r["similarity_score"]
        )
        for r in raw_results
    ]

    return VideoSearchResponse(query=q, results=items)
