from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# User Schemas
# ==============================================================================
class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    username: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==============================================================================
# Resume Schemas
# ==============================================================================
class ResumeResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    raw_text: str
    parsed_skills: Optional[str] = "[]"
    parsed_experience: Optional[str] = "[]"
    parsed_education: Optional[str] = "[]"
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Job Description Schemas
# ==============================================================================
class JobDescriptionCreate(BaseModel):
    title: str = "Target Job"
    company: Optional[str] = None
    raw_text: str


class JobDescriptionResponse(BaseModel):
    id: int
    title: str
    company: Optional[str] = None
    raw_text: str
    required_skills: Optional[str] = "[]"
    preferred_skills: Optional[str] = "[]"
    responsibilities: Optional[str] = "[]"
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Analysis & ATS Schemas
# ==============================================================================
class AnalysisRequest(BaseModel):
    resume_id: int
    job_description_id: Optional[int] = None
    job_description_text: Optional[str] = None


class AnalysisResponse(BaseModel):
    id: int
    resume_id: int
    job_description_id: Optional[int] = None
    job_description_text: str
    ats_score: float
    matching_skills: str  # JSON list
    missing_skills: str  # JSON list
    partial_skills: Optional[str] = "[]"
    suggestions: str  # JSON list
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Video Schemas
# ==============================================================================
class VideoResponse(BaseModel):
    id: int
    title: str
    source_type: str
    source_url: Optional[str] = None
    file_path: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    duration_seconds: float
    created_at: datetime

    class Config:
        from_attributes = True


class TranscriptChunkResponse(BaseModel):
    id: int
    chunk_index: int
    text: str
    start_time: float
    end_time: float
    language: str

    class Config:
        from_attributes = True


class VideoDetailResponse(VideoResponse):
    summary: Optional[str] = None
    action_items: Optional[str] = "[]"
    key_decisions: Optional[str] = "[]"
    open_questions: Optional[str] = "[]"
    chunks: List[TranscriptChunkResponse] = []


class VideoSearchItem(BaseModel):
    video_id: int
    video_title: str
    chunk_id: int
    text: str
    start_time: float
    end_time: float
    timestamp_formatted: str
    similarity_score: float


class VideoSearchResponse(BaseModel):
    query: str
    results: List[VideoSearchItem]


# ==============================================================================
# RAG Schemas
# ==============================================================================
class SourceCitation(BaseModel):
    source_type: str  # "video", "resume", "job_description", "history"
    source_id: Optional[int] = None
    title: Optional[str] = None
    section: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    timestamp_formatted: Optional[str] = None
    text_snippet: str
    similarity: float


class RAGQueryRequest(BaseModel):
    question: str
    sources: Optional[List[str]] = ["resume", "job_description", "video"]
    analysis_id: Optional[int] = None
    session_id: Optional[int] = None


class RAGQueryResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceCitation]
    response_time_ms: int


# ==============================================================================
# Interview Schemas
# ==============================================================================
class QuestionGenerateRequest(BaseModel):
    analysis_id: int
    question_types: Optional[List[str]] = ["technical", "behavioral", "hr", "system_design"]
    count: Optional[int] = 5


class InterviewQuestionResponse(BaseModel):
    id: int
    session_id: Optional[int] = None
    analysis_id: Optional[int] = None
    question_type: str
    question_text: str
    model_answer: Optional[str] = None
    category: str
    order_index: int

    class Config:
        from_attributes = True


class InterviewSessionCreate(BaseModel):
    analysis_id: Optional[int] = None
    title: Optional[str] = "Mock Interview"


class AnswerSubmitRequest(BaseModel):
    question_id: int
    answer_text: str


class AnswerEvaluationResponse(BaseModel):
    answer_id: int
    question_id: int
    technical_accuracy: float
    relevance: float
    completeness: float
    clarity: float
    confidence: float
    overall_score: float
    strengths: List[str]
    weaknesses: List[str]
    missing_concepts: List[str]
    suggested_answer: Optional[str] = None


class InterviewSessionResponse(BaseModel):
    id: int
    analysis_id: Optional[int] = None
    title: str
    status: str
    overall_score: Optional[float] = None
    summary_feedback: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    questions: List[InterviewQuestionResponse] = []

    class Config:
        from_attributes = True


# ==============================================================================
# Chat Schemas
# ==============================================================================
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    analysis_id: Optional[int] = None


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    analysis_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    message: str
    session_id: Optional[int] = None
    analysis_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    sources: Optional[str] = "[]"
    model_name: Optional[str] = None
    response_time_ms: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Evaluation Dashboard Schemas
# ==============================================================================
class MetricItem(BaseModel):
    name: str
    value: float
    formatted_value: str
    description: Optional[str] = None


class EvaluationCategorySummary(BaseModel):
    category: str
    metrics: List[MetricItem]


class EvaluationSummaryResponse(BaseModel):
    categories: List[EvaluationCategorySummary]
    last_updated: datetime
