# Project Structure and Working Overview

## 1. Project Purpose

This project is an AI-powered interview preparation and video intelligence platform. It helps a user:

- upload and analyze a resume against a target job description,
- compute ATS-style skill match and gap analysis,
- upload or ingest interview videos and transcribe them with timestamps,
- search video knowledge using semantic retrieval,
- chat with a grounded AI assistant using multi-source context,
- generate mock interview questions and evaluate answers,
- monitor evaluation metrics for the generated system.

The system combines a React + TypeScript frontend, a FastAPI backend, SQLAlchemy models, a PostgreSQL-compatible database, and a Chroma vector store for embeddings and retrieval.

---

## 2. Root-Level Structure

```text
AI-Interview-Intelligence/
├── .env.example
├── docker-compose.yml
├── README.md
├── project_structure.md
├── backend/
│   ├── .env
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── analysis.py
│   │       ├── chat.py
│   │       ├── evaluation.py
│   │       ├── interviews.py
│   │       ├── jobs.py
│   │       ├── rag.py
│   │       ├── resumes.py
│   │       ├── search.py
│   │       └── videos.py
│   ├── core/
│   │   └── auth.py
│   ├── db/
│   │   └── database.py
│   ├── models/
│   │   └── models.py
│   ├── schemas/
│   │   └── schemas.py
│   ├── services/
│   │   ├── analysis_service.py
│   │   ├── embedding_service.py
│   │   ├── evaluation_service.py
│   │   ├── interview_service.py
│   │   ├── llm_service.py
│   │   ├── rag_service.py
│   │   ├── resume_service.py
│   │   ├── video_service.py
│   │   └── __init__.py
│   ├── tests/
│   │   ├── test_analysis.py
│   │   ├── test_auth.py
│   │   ├── test_e2e.py
│   │   ├── test_interviews.py
│   │   └── test_resumes.py
│   ├── uploads/
│   └── vector_db/
├── database/
│   └── schema.sql
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── docs/
│   ├── api.md
│   ├── database.md
│   ├── deployment.md
│   ├── evaluation.md
│   ├── rag.md
│   └── setup.md
├── evaluation/
│   ├── ats_eval.py
│   ├── evaluation_report.json
│   ├── interview_eval.py
│   ├── performance_eval.py
│   ├── rag_eval.py
│   ├── report.py
│   ├── retrieval_eval.py
│   ├── transcription_eval.py
│   └── datasets/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       ├── main.tsx
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── services/
│       └── types/
└── README.md
```

---

## 3. Major Components

### Backend

The backend is the main application engine. It is built with FastAPI and is initialized in `backend/main.py`.

Key responsibilities:

- register API routers under `/api/v1`,
- initialize database tables,
- enable CORS for the frontend,
- expose health and root endpoints,
- orchestrate domain features via service modules.

#### API Layer

The `backend/api/v1` routers are organized by feature:

- `auth.py`: signup, login, profile retrieval, JWT-based auth
- `resumes.py`: resume upload, parsing, listing, deletion
- `jobs.py`: job description creation and listing
- `analysis.py`: ATS scoring and skill-gap analysis
- `videos.py`: upload local and YouTube videos; transcript processing
- `search.py`: semantic search over transcript chunks
- `rag.py`: multi-source retrieval and grounded answer generation
- `interviews.py`: mock interview question generation and answer evaluation
- `chat.py`: conversational AI sessions and message history
- `evaluation.py`: evaluation metrics endpoints

#### Models and Database

The database layer is defined in:

- `backend/models/models.py`
- `backend/db/database.py`

The app uses SQLAlchemy models for:

- `User`
- `Resume`
- `JobDescription`
- `Analysis`
- `Video`, `VideoTranscript`, `TranscriptChunk`
- `InterviewSession`, `InterviewQuestion`, `InterviewAnswer`
- `ChatSession`, chat-related message structures

This supports both relational persistence and app-specific workflow state.

#### Services Layer

The core business logic lives in `backend/services`:

- `resume_service.py`: resume text extraction, deterministic skill matching, resume indexing
- `analysis_service.py`: ATS and gap analysis against job descriptions
- `video_service.py`: ffmpeg extraction, transcript generation, summarization, chunking, indexing
- `embedding_service.py`: vector DB embedding generation and semantic querying
- `rag_service.py`: multi-source retrieval and grounded answer synthesis
- `interview_service.py`: mock interview question generation and scoring logic
- `llm_service.py`: unified provider abstraction for Gemini and Mistral
- `evaluation_service.py`: evaluation metrics and measurement logic

The project relies on:

- PostgreSQL or SQLite compatibility for DB initialization,
- ChromaDB for vector retrieval,
- SentenceTransformers embedding model (`all-MiniLM-L6-v2`),
- Gemini or Mistral-backed LLM calls.

### Frontend

The frontend is built with React 18, TypeScript, Vite, Tailwind CSS, and React Router.

Main structure:

- `frontend/src/App.tsx`: app-level routing and protected layout
- `frontend/src/pages`: dashboard, login, signup, resume/job analysis, video library, semantic search, mock interviews, chat, evaluation
- `frontend/src/components`: shared UI like sidebar, navbar, ATS gauge, skills panel, citations
- `frontend/src/context/AuthContext.tsx`: auth state management
- `frontend/src/services/api.ts`: centralized API client with auth token injection and service methods
- `frontend/src/types/index.ts`: TypeScript models for application data

The UI is organized around a protected app shell, where users navigate through dashboard sections after login.

### Evaluation and Documentation

The `evaluation/` folder contains benchmarking and scoring scripts:

- `ats_eval.py`
- `interview_eval.py`
- `performance_eval.py`
- `rag_eval.py`
- `retrieval_eval.py`
- `transcription_eval.py`
- `report.py`

These scripts generate evaluation reports and measure:

- ATS alignment,
- retrieval quality,
- transcript quality,
- answer relevance,
- interview scoring,
- latency and performance metrics.

The `docs/` folder contains product and setup guidance for architecture, API usage, deployment, and evaluation.

---

## 4. How the System Works End-to-End

### A. Authentication and User Context

1. The frontend calls `/api/v1/auth/signup` or `/api/v1/auth/login`.
2. FastAPI validates credentials, hashes the password, and issues a JWT token.
3. The frontend stores the token in local storage and uses it in all authenticated requests through the Axios interceptor.

### B. Resume + Job Analysis Flow

1. User uploads a resume (PDF, DOCX, or TXT).
2. `resumes.py` stores the file under `backend/uploads/user_<id>/`.
3. `ResumeService.extract_text_from_file()` extracts raw text.
4. Parsed skills and experience are extracted using a mix of:
   - deterministic regex-based technical skill matching,
   - LLM-based structured extraction.
5. The resume text is chunked and embedded into a Chroma collection like `resume_<user_id>`.
6. User adds or submits a target job description.
7. `analysis.py` computes an ATS-style score and identifies:
   - matching skills,
   - missing skills,
   - partial skills,
   - suggestions.
8. This result is stored in the `analyses` table and shown in the dashboard.

### C. Video Intelligence Pipeline

1. User uploads a local video or provides a YouTube URL.
2. `videos.py` creates a `Video` record with status `pending`.
3. A background task processes the media in `process_video_background()`.
4. For uploaded videos:
   - audio is extracted via FFmpeg,
   - Whisper transcribes the speech with timestamps.
5. For YouTube videos:
   - transcript is fetched when available,
   - otherwise audio is downloaded and transcribed.
6. Transcript chunks are saved into the database with start/end timestamps.
7. Chunks are embedded into a video-specific vector collection like `video_<video_id>`.
8. Video status becomes `completed` when indexing succeeds.

### D. Semantic Search and RAG

1. User asks a question in the UI.
2. `rag_service.py` queries multiple source collections:
   - resume vector store,
   - job description vector store,
   - selected video transcript collections.
3. Top matching chunks are ranked using similarity score.
4. The LLM generates a grounded answer using the retrieved evidence.
5. Citations include:
   - source type,
   - title,
   - timestamp where available,
   - snippet text,
   - similarity score.

This gives the app grounded, source-aware answers instead of pure model memory.

### E. Mock Interview Workflow

1. An analysis record is used as input to generate a mock interview.
2. `interview_service.py` creates question sets based on missing or weak skills.
3. User answers each question in the front-end.
4. The backend evaluates:
   - technical accuracy,
   - relevance,
   - completeness,
   - clarity,
   - confidence.
5. Scores and suggestions are stored in the interview answer records.
6. Session overall performance is summarized.

### F. Evaluation Layer

The evaluation scripts are used to benchmark the system on:

- retrieval relevance (Recall@K, nDCG, MRR),
- RAG answer quality,
- transcript quality (WER/CER),
- ATS skill extraction quality,
- interview scoring quality,
- latency and performance markers.

This separates product functionality from measurement and optimization work.

---

## 5. Config and Runtime Setup

### Environment Configuration

The project expects environment variables, notably in `backend/.env` or the root `.env` file.

Important settings include:

- `DATABASE_URL`
- `SECRET_KEY`
- `LLM_PROVIDER`
- `GEMINI_API_KEY` or `MISTRAL_API_KEY`
- `EMBEDDING_MODEL`
- `VECTOR_DB_DIR`
- `UPLOAD_DIR`

These are loaded by `backend/config.py` via `pydantic-settings`.

### Local Run

Backend:

```bash
cd backend
python -m venv venv
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Docker:

```bash
cp .env.example .env
docker-compose up -d --build
```

---

## 6. Architectural Summary

The project follows a layered architecture:

- Frontend UI
- API layer
- Service layer
- Data models
- Database persistence
- Vector database for semantic retrieval
- LLM providers for generation and analysis
- Evaluation scripts for quality metrics

The strongest design pattern in the project is the separation between:

- domain operations (resumes, job analysis, videos, interviews),
- retrieval and reasoning (RAG, embeddings, vector DB),
- and reporting/quality checks (evaluation scripts).

This makes the application modular and suitable for extension with more providers, data sources, or interview workflows.

---

## 7. Practical Conclusion

This repository is best understood as an end-to-end AI interview intelligence platform:

- it supports recruitment-oriented evaluation,
- combines structured database records with semantic vector retrieval,
- supports video transcript indexing and timestamp-aware answers,
- includes interview simulation and answer evaluation,
- and includes an evaluation framework for measuring quality.

In short, the app is not just a chat assistant—it is a full preparation and intelligence system for resume, job, and video-driven interview readiness.
