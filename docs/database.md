# Database Architecture & Entity Relationships

## 1. Relational Schema (PostgreSQL)

The application maintains a single unified PostgreSQL database (`ai_interview_intelligence`) with 13 core entities:

```text
User (1) ─────────────< (N) Resume (1) ─────────────< (N) Analysis
  │                        │                                 │
  ├─< (N) JobDescription ──┘                                 ├─< (N) InterviewQuestion
  │                                                          │          │
  ├─< (N) Video (1) ────< (1) VideoTranscript                │          │
  │        │                                                 │          v
  │        └────────────< (N) TranscriptChunk                ├─< (N) InterviewSession
  │                                                          │          │
  ├─< (N) ChatSession (1) ──< (N) ChatMessage                │          └─< (N) InterviewAnswer
  │                                                          │
  └─< (N) EvaluationResult ──────────────────────────────────┘
```

---

## 2. Table Specifications

### `users`
- Primary user identity store with hashed passwords (`bcrypt`), role enforcement (`user`, `admin`), and status flags.

### `resumes`
- Stores candidate uploaded documents (PDF/DOCX), raw extracted text, and pre-parsed JSON skills.

### `job_descriptions`
- Target role specifications, responsibilities, and required/preferred competency lists.

### `analyses`
- Records ATS match scores (0-100), matched skill lists, missing skill gaps, and AI tailoring recommendations.

### `videos` & `video_transcripts`
- Tracks upload & processing status (`pending`, `processing`, `completed`, `failed`), full speech-to-text transcripts, and executive summaries.

### `transcript_chunks`
- Timestamped segments (`start_time`, `end_time`, `chunk_index`, `text`) enabling cue-point video playback on search matches.

### `interview_sessions`, `interview_questions`, `interview_answers`
- Full tracking of personalized mock interview interactions, multi-dimensional rubric evaluations (accuracy, relevance, completeness, clarity, confidence), and final summary reports.

### `chat_sessions` & `chat_messages`
- Persists conversational interactions with embedded multi-source citations and response latencies.
