import json
import os
import shutil
from typing import List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from config import get_settings
from core.auth import get_current_user
from db.database import SessionLocal, get_db
from models.models import (
    TranscriptChunk,
    User,
    Video,
    VideoStatus,
    VideoTranscript,
)
from schemas.schemas import (
    TranscriptChunkResponse,
    VideoDetailResponse,
    VideoResponse,
)
from services.video_service import get_video_service

router = APIRouter(prefix="/videos", tags=["Videos"])
settings = get_settings()
video_service = get_video_service()


def process_video_background(video_id: int):
    """Background pipeline for speech extraction, transcription, chunking, and indexing."""
    db = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        db.close()
        return

    video.status = VideoStatus.PROCESSING.value
    db.commit()

    temp_cleanup = []
    try:
        segments = []
        full_text = ""

        # 1. YouTube path
        if video.source_type == "youtube" and video.source_url:
            yt_captions = video_service.download_youtube_transcript(video.source_url)
            if yt_captions:
                segments = yt_captions
                full_text = " ".join([s["text"] for s in segments])
            else:
                wav_path, temp_dir = video_service.download_youtube_audio(video.source_url)
                temp_cleanup.append(temp_dir)
                full_text, segments = video_service.transcribe_with_whisper(wav_path)

        # 2. Local/Uploaded video file path
        elif video.file_path:
            wav_path = video_service.extract_audio(video.file_path)
            temp_cleanup.append(os.path.dirname(wav_path))
            full_text, segments = video_service.transcribe_with_whisper(wav_path)
        else:
            raise ValueError("No video source provided.")

        if not full_text.strip():
            raise ValueError("No speech or text could be transcribed from the video source.")

        # Chunk with timestamps
        chunks_data = video_service.chunk_segments(segments, target_chunk_words=60)

        # Generate summary and insights
        insights = video_service.extract_insights(full_text)

        # Save Transcript to DB
        transcript = VideoTranscript(
            video_id=video.id,
            full_text=full_text,
            language="english",
            summary=insights.get("summary"),
            action_items=json.dumps(insights.get("action_items", [])),
            key_decisions=json.dumps(insights.get("key_decisions", [])),
            open_questions=json.dumps(insights.get("open_questions", [])),
        )
        db.add(transcript)

        # Save Chunks to DB
        for i, c in enumerate(chunks_data):
            chunk_rec = TranscriptChunk(
                video_id=video.id,
                chunk_index=i,
                text=c["text"],
                start_time=c["start_time"],
                end_time=c["end_time"],
                language="en",
            )
            db.add(chunk_rec)

        db.commit()

        # Index chunks in ChromaDB
        video_service.index_video_chunks(
            video_id=video.id,
            video_title=video.title,
            chunks=chunks_data
        )

        video.status = VideoStatus.COMPLETED.value
        db.commit()

    except Exception as e:
        db.rollback()
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = VideoStatus.FAILED.value
            video.error_message = str(e)
            db.commit()
    finally:
        for p in temp_cleanup:
            if os.path.exists(p):
                shutil.rmtree(p, ignore_errors=True)
        db.close()


@router.post("/upload", response_model=VideoResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_upload_dir = os.path.join(settings.UPLOAD_DIR, f"videos_{current_user.id}")
    os.makedirs(user_upload_dir, exist_ok=True)
    filename = file.filename or "video.mp4"
    saved_path = os.path.join(user_upload_dir, filename)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    video_title = title or os.path.splitext(filename)[0]

    db_video = Video(
        user_id=current_user.id,
        title=video_title,
        source_type="upload",
        file_path=saved_path,
        status=VideoStatus.PENDING.value,
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    background_tasks.add_task(process_video_background, db_video.id)
    return db_video


@router.post("/youtube", response_model=VideoResponse, status_code=status.HTTP_202_ACCEPTED)
def process_youtube(
    background_tasks: BackgroundTasks,
    url: str = Form(...),
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        info = video_service.download_youtube_info(url)
        video_title = title or info.get("title", "YouTube Video")
        duration = float(info.get("duration", 0.0))
    except Exception:
        video_title = title or "YouTube Video"
        duration = 0.0

    db_video = Video(
        user_id=current_user.id,
        title=video_title,
        source_type="youtube",
        source_url=url,
        duration_seconds=duration,
        status=VideoStatus.PENDING.value,
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    background_tasks.add_task(process_video_background, db_video.id)
    return db_video


@router.get("", response_model=List[VideoResponse])
def list_videos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Video).filter(Video.user_id == current_user.id).order_by(Video.created_at.desc()).all()


@router.get("/{video_id}", response_model=VideoDetailResponse)
def get_video_detail(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(
        Video.id == video_id,
        Video.user_id == current_user.id
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    summary = video.transcript.summary if video.transcript else None
    action_items = video.transcript.action_items if video.transcript else "[]"
    key_decisions = video.transcript.key_decisions if video.transcript else "[]"
    open_questions = video.transcript.open_questions if video.transcript else "[]"

    chunks_resp = [
        TranscriptChunkResponse(
            id=c.id,
            chunk_index=c.chunk_index,
            text=c.text,
            start_time=c.start_time,
            end_time=c.end_time,
            language=c.language
        )
        for c in video.chunks
    ]

    return VideoDetailResponse(
        id=video.id,
        title=video.title,
        source_type=video.source_type,
        source_url=video.source_url,
        file_path=video.file_path,
        status=video.status,
        error_message=video.error_message,
        duration_seconds=video.duration_seconds,
        created_at=video.created_at,
        summary=summary,
        action_items=action_items,
        key_decisions=key_decisions,
        open_questions=open_questions,
        chunks=chunks_resp
    )


@router.delete("/{video_id}", status_code=status.HTTP_200_OK)
def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(
        Video.id == video_id,
        Video.user_id == current_user.id
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    if video.file_path and os.path.exists(video.file_path):
        try:
            os.remove(video.file_path)
        except Exception:
            pass

    # Delete ChromaDB collection
    try:
        video_service.embedding_service.delete_collection(f"video_{video.id}")
    except Exception:
        pass

    db.delete(video)
    db.commit()
    return {"message": "Video deleted successfully."}
