# AI Interview & Video Intelligence Assistant

> **AI Interview & Video Intelligence Assistant** is an AI-powered interview preparation platform that combines resume and job-description analysis, personalized interview generation, timestamp-aware semantic video search, and multi-source Retrieval-Augmented Generation (RAG). The system analyzes a candidate's skills against a target job, identifies preparation gaps, retrieves relevant information from resumes, job descriptions, and interview videos, and provides grounded AI responses with video timestamps. It also supports AI-powered mock interviews and answer evaluation. The system is evaluated using retrieval, generation, speech recognition, skill extraction, interview quality, and system performance metrics.

---

## 🌟 Key Features

1. **Resume Intelligence & Parsing:**
   - PDF & DOCX text extraction with automated skill extraction.
   - Structured experience, education, and project identification.

2. **Job Description & Deterministic ATS Scoring:**
   - Verifiable, deterministic match scoring based on required skill overlap (50%), token Jaccard similarity (30%), and section completeness (20%).
   - Automatic categorization into **Matched**, **Missing**, and **Partial** skills with tailored recommendations.

3. **Video Intelligence & Timestamp-Aware Whisper STT:**
   - Local video (MP4, MKV, MOV) upload and YouTube URL processing.
   - Audio extraction with FFmpeg and speech-to-text with OpenAI Whisper (`word_timestamps=True`).
   - Timestamped transcript chunking stored in isolated ChromaDB vector collections.

4. **Timestamp-Aware Semantic Video Search:**
   - Query video libraries using natural language.
   - Jump directly to the exact second where interviewers or speakers explain specific technical topics.

5. **Multi-Source Grounded RAG:**
   - Unified cross-retrieval across Resume, Job Description, Video Transcripts, and Chat History.
   - Rich citations with video timestamps and resume references.

6. **Interactive AI Mock Interviews:**
   - Personalized interview questions generated from identified candidate skill gaps.
   - Rubric-based scoring across Technical Accuracy, Relevance, Completeness, Clarity, and Confidence (1-10 scale).
   - Generates constructive strengths, weaknesses, missing concepts, model answers, and final performance reports.

7. **System Evaluation & Benchmark Framework:**
   - Automated computation of Recall@K, Precision@K, MRR, nDCG@5, Faithfulness, Answer Relevance, WER/CER, Skill F1, and P50/P95 latencies.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, Axios, React Router |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Pydantic v2, Uvicorn |
| **Database** | PostgreSQL 16 (Relational Schema) |
| **Vector Store** | ChromaDB (Cosine similarity, per-source collections) |
| **Embeddings** | `SentenceTransformers` (`all-MiniLM-L6-v2`) |
| **LLM Engine** | Abstracted `LLMService` supporting **Google Gemini** and **Mistral AI** |
| **Speech-to-Text** | OpenAI Whisper + FFmpeg + yt-dlp |
| **Documents** | PyMuPDF (fitz) + python-docx |

---

## 🚀 Quick Start Guide

### 1. Backend

```bash
cd backend
python -m venv venv
# Activate venv:
# Windows: .\venv\Scripts\Activate.ps1 | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
- UI Dashboard: `http://localhost:5173`

---

## 🐳 Docker Deployment

```bash
cp .env.example .env
docker-compose up -d --build
```

---

## 🧪 Testing

```bash
cd backend
python -m unittest discover tests
```

---

## 📊 Evaluation Framework

```bash
cd evaluation
python report.py
```

---

## 📚 Documentation Index

- [Setup & Installation](docs/setup.md)
- [Architecture Report](docs/current-architecture.md)
- [API Documentation](docs/api.md)
- [Database Schema](docs/database.md)
- [Multi-Source RAG Guide](docs/rag.md)
- [System Evaluation Benchmark](docs/evaluation.md)
- [Production Deployment](docs/deployment.md)
