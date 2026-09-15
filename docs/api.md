# API Architecture & Endpoint Documentation

All routes use the prefix `/api/v1` and require an `Authorization: Bearer <token>` header for protected resources.

---

## 1. Authentication (`/api/v1/auth`)

- `POST /api/v1/auth/signup` — Register a new account (`email`, `password`, `full_name`, `username`)
- `POST /api/v1/auth/login` — Authenticate and receive a JWT access token
- `GET /api/v1/auth/me` — Get the currently authenticated user profile

---

## 2. Resumes (`/api/v1/resumes`)

- `POST /api/v1/resumes/upload` — Upload PDF/DOCX/TXT resume; performs text extraction and ChromaDB indexing
- `GET /api/v1/resumes` — List all uploaded resumes for the current user
- `GET /api/v1/resumes/{id}` — Fetch details of a single resume
- `DELETE /api/v1/resumes/{id}` — Delete a resume and remove its vector index

---

## 3. Job Descriptions (`/api/v1/jobs`)

- `POST /api/v1/jobs` — Create and parse a target job description (`raw_text`, `title`, `company`)
- `GET /api/v1/jobs` — List all saved job descriptions
- `GET /api/v1/jobs/{id}` — Get single job description details
- `DELETE /api/v1/jobs/{id}` — Remove job description

---

## 4. ATS & Skill Gap Analysis (`/api/v1/analysis`)

- `POST /api/v1/analysis/run` — Run deterministic ATS scoring & skill gap analysis (`resume_id`, `job_description_id` or `job_description_text`)
- `GET /api/v1/analysis/{id}` — Get specific analysis report with matched/missing skills
- `GET /api/v1/analysis` — List all past analyses

---

## 5. Videos & Speech-to-Text (`/api/v1/videos`)

- `POST /api/v1/videos/upload` — Upload video file (MP4, MKV, WAV) for background Whisper transcription
- `POST /api/v1/videos/youtube` — Submit YouTube URL for automated transcription or caption retrieval
- `GET /api/v1/videos` — List user's processed videos and current status
- `GET /api/v1/videos/{id}` — Fetch video transcript, summary, and timestamped chunks
- `DELETE /api/v1/videos/{id}` — Delete video and its ChromaDB vector collection

---

## 6. Timestamp-Aware Semantic Search (`/api/v1/search`)

- `GET /api/v1/search/videos?q=...&video_id=...` — Search across video transcripts; returns exact timestamp snippets (`start_time`, `end_time`, `timestamp_formatted`)

---

## 7. Multi-Source RAG (`/api/v1/rag`)

- `POST /api/v1/rag/query` — Grounded question answering across Resume, Job Description, and Video transcripts with traceable citation badges

---

## 8. AI Mock Interview (`/api/v1/interviews`)

- `POST /api/v1/interviews/generate/{analysis_id}` — Generate personalized technical/behavioral questions targeting candidate skill gaps
- `POST /api/v1/interviews/sessions` — Start an interview session
- `POST /api/v1/interviews/sessions/{id}/answer` — Submit answer; returns rubric scores (1-10) across accuracy, relevance, completeness, clarity, confidence
- `POST /api/v1/interviews/sessions/{id}/complete` — Finish session and generate aggregated executive summary report

---

## 9. Chat (`/api/v1/chat`)

- `POST /api/v1/chat/sessions` — Create chat session
- `GET /api/v1/chat/sessions` — List user chat sessions
- `POST /api/v1/chat/message` — Send message with RAG context grounding

---

## 10. Evaluation (`/api/v1/evaluation`)

- `GET /api/v1/evaluation/metrics` — Fetch real-time system metrics for the Evaluation Dashboard
