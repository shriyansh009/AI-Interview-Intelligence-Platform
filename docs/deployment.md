# Deployment Guide

## 1. Production Docker Deployment

Deploy the entire stack (PostgreSQL + pgvector, FastAPI Backend, React/Nginx Frontend) using Docker Compose:

```bash
cd AI-Interview-Intelligence

# 1. Set environment keys
cp .env.example .env
# Edit .env with your production GEMINI_API_KEY, MISTRAL_API_KEY, and SECRET_KEY

# 2. Build and launch containers
docker-compose up -d --build
```

### Accessing the Deployment
- **Frontend Web UI:** `http://<your-server-ip>:5173` (or port 80 via reverse proxy)
- **FastAPI REST API:** `http://<your-server-ip>:8000`
- **Swagger Documentation:** `http://<your-server-ip>:8000/docs`

---

## 2. Cloud Production Deployment Checklist

1. **Security:**
   - Change `SECRET_KEY` in `.env` to a cryptographically secure 64-character string.
   - Set `DEBUG=False` in backend configuration.
   - Configure restrictive CORS `origins` in `backend/main.py`.
2. **Database:**
   - Run Alembic migrations against managed PostgreSQL instance.
   - Ensure `pgvector` or disk-backed ChromaDB vector storage volume is persistently mounted.
3. **Hardware Acceleration (Optional):**
   - For high-volume Whisper transcription, attach an NVIDIA GPU and install `torch` with CUDA support in `docker/Dockerfile.backend`.
