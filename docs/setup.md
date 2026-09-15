# Setup & Installation Guide

## AI Interview & Video Intelligence Assistant

---

## 1. Prerequisites

- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** & npm
- **PostgreSQL 14+** (with `pgvector` extension if available)
- **FFmpeg** installed and accessible on your system PATH:
  - Windows: `winget install Gyan.FFmpeg` or `choco install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

---

## 2. Backend Setup

```bash
# 1. Navigate to backend
cd AI-Interview-Intelligence/backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Configure environment
cp ../.env.example .env
# Edit .env with your PostgreSQL credentials, GEMINI_API_KEY, and/or MISTRAL_API_KEY

# 6. Run the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will start at: `http://localhost:8000`  
Swagger API Documentation: `http://localhost:8000/docs`

---

## 3. Frontend Setup

```bash
# 1. Navigate to frontend
cd AI-Interview-Intelligence/frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The frontend will start at: `http://localhost:5173`

---

## 4. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `JWT_SECRET` | `dev-secret...` | Secret key for JWT token hashing |
| `LLM_PROVIDER` | `gemini` | LLM engine (`gemini` or `mistral`) |
| `GEMINI_API_KEY` | - | Google Gemini API key |
| `MISTRAL_API_KEY` | - | Mistral AI API key |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | SentenceTransformer model |
| `VECTOR_DB_DIR` | `./vector_db` | ChromaDB vector storage directory |
| `WHISPER_MODEL` | `base` | Whisper model size (`tiny`, `base`, `small`, `medium`) |
| `UPLOAD_DIR` | `./uploads` | Local media & document storage |
