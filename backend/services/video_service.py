import os
import shutil
import subprocess
import tempfile
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled

from config import get_settings
from services.embedding_service import get_embedding_service
from services.llm_service import get_llm_service

settings = get_settings()

try:
    import whisper
except ImportError:
    whisper = None

try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None


class VideoService:
    def __init__(self):
        self.whisper_model_name = settings.WHISPER_MODEL
        self._whisper_model = None
        self.embedding_service = get_embedding_service()
        self.llm_service = get_llm_service()

    def _get_whisper(self):
        if self._whisper_model is None:
            if whisper is None:
                raise RuntimeError("Whisper is not installed. Please install openai-whisper.")
            print(f"[VideoService] Loading Whisper model '{self.whisper_model_name}'...")
            self._whisper_model = whisper.load_model(self.whisper_model_name)
            print("[VideoService] Whisper model loaded successfully.")
        return self._whisper_model

    @staticmethod
    def format_timestamp(seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        return f"{minutes:02d}:{secs:02d}"

    def extract_audio(self, media_path: str) -> str:
        """Convert video/audio to 16kHz mono WAV using ffmpeg."""
        temp_dir = tempfile.mkdtemp(prefix="audio_extract_")
        wav_path = os.path.join(temp_dir, "audio_16k.wav")
        command = [
            "ffmpeg",
            "-y",
            "-i",
            media_path,
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            wav_path,
        ]
        try:
            subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return wav_path
        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise RuntimeError(f"FFmpeg audio extraction failed: {e}")

    def download_youtube_info(self, url: str) -> Dict[str, Any]:
        """Fetch YouTube video title, duration, and metadata."""
        ydl_opts = {"quiet": True, "no_warnings": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "id": info.get("id"),
                "title": info.get("title", "YouTube Video"),
                "duration": info.get("duration", 0),
            }

    def download_youtube_transcript(self, url: str) -> Optional[List[Dict[str, Any]]]:
        """Fetch YouTube captions if available."""
        try:
            info = self.download_youtube_info(url)
            video_id = info["id"]
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            segments = []
            for item in transcript_list:
                start = float(item["start"])
                duration = float(item.get("duration", 2.0))
                segments.append({
                    "start": start,
                    "end": start + duration,
                    "text": item["text"].strip()
                })
            return segments
        except Exception:
            return None

    def download_youtube_audio(self, url: str) -> Tuple[str, str]:
        """Download YouTube audio track and return (wav_path, temp_dir)."""
        temp_dir = tempfile.mkdtemp(prefix="yt_audio_")
        output_template = os.path.join(temp_dir, "media.%(ext)s")
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_template,
            "quiet": True,
            "noplaylist": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        downloaded_files = list(Path(temp_dir).glob("media.*"))
        if not downloaded_files:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise RuntimeError("Failed to download YouTube audio.")

        media_file = str(downloaded_files[0])
        wav_path = self.extract_audio(media_file)
        return wav_path, temp_dir

    def transcribe_with_whisper(self, wav_path: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Transcribe audio using Whisper and extract timestamped segments.
        Returns (full_text, segments_list).
        """
        model = self._get_whisper()
        result = model.transcribe(wav_path, task="transcribe", verbose=False)
        full_text = result.get("text", "").strip()

        raw_segments = result.get("segments", [])
        segments = []
        for s in raw_segments:
            segments.append({
                "start": float(s["start"]),
                "end": float(s["end"]),
                "text": s["text"].strip()
            })

        return full_text, segments

    def chunk_segments(
        self,
        segments: List[Dict[str, Any]],
        target_chunk_words: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Combine short speech segments into coherent timestamped chunks.
        Every chunk retains start_time and end_time.
        """
        if not segments:
            return []

        chunks = []
        current_words = []
        start_time = segments[0]["start"]
        end_time = segments[0]["end"]

        for seg in segments:
            seg_text = seg["text"].strip()
            if not seg_text:
                continue
            words = seg_text.split()
            if not current_words:
                start_time = seg["start"]

            current_words.extend(words)
            end_time = seg["end"]

            if len(current_words) >= target_chunk_words:
                chunk_text = " ".join(current_words)
                chunks.append({
                    "start_time": round(start_time, 2),
                    "end_time": round(end_time, 2),
                    "text": chunk_text
                })
                current_words = []

        if current_words:
            chunk_text = " ".join(current_words)
            chunks.append({
                "start_time": round(start_time, 2),
                "end_time": round(end_time, 2),
                "text": chunk_text
            })

        return chunks

    def extract_insights(self, transcript_text: str) -> Dict[str, Any]:
        """Generate summary, action items, key decisions, and questions using LLM."""
        system_prompt = (
            "You are an AI intelligence assistant analyzing a video/meeting transcript. "
            "Extract a concise summary, key action items, important decisions, and open questions. "
            "Return valid JSON matching: "
            '{"summary": "...", "action_items": ["..."], "key_decisions": ["..."], "open_questions": ["..."]}'
        )
        prompt = f"Transcript:\n{transcript_text[:12000]}"
        insights = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        if not isinstance(insights, dict):
            insights = {}
        return {
            "summary": insights.get("summary", "Summary not available."),
            "action_items": insights.get("action_items", []),
            "key_decisions": insights.get("key_decisions", []),
            "open_questions": insights.get("open_questions", []),
        }

    def index_video_chunks(self, video_id: int, video_title: str, chunks: List[Dict[str, Any]]):
        """Index video chunks into a dedicated ChromaDB collection."""
        collection_name = f"video_{video_id}"
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "source_type": "video",
                "video_id": video_id,
                "video_title": video_title,
                "chunk_index": i,
                "start_time": c["start_time"],
                "end_time": c["end_time"],
                "timestamp_formatted": self.format_timestamp(c["start_time"]),
            }
            for i, c in enumerate(chunks)
        ]
        ids = [f"vid_{video_id}_chk_{i}" for i in range(len(chunks))]
        self.embedding_service.add_documents(
            collection_name=collection_name,
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )


_default_video_service: Optional[VideoService] = None


def get_video_service() -> VideoService:
    global _default_video_service
    if _default_video_service is None:
        _default_video_service = VideoService()
    return _default_video_service
