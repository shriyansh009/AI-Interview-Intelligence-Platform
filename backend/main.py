from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from db.database import init_db
from api.v1.auth import router as auth_router
from api.v1.resumes import router as resumes_router
from api.v1.jobs import router as jobs_router
from api.v1.analysis import router as analysis_router
from api.v1.videos import router as videos_router
from api.v1.search import router as search_router
from api.v1.rag import router as rag_router
from api.v1.interviews import router as interviews_router
from api.v1.chat import router as chat_router
from api.v1.evaluation import router as evaluation_router

settings = get_settings()

# Initialize Database Schema
init_db()

app = FastAPI(
    title=settings.APP_NAME,
    description="Unified AI Interview Preparation, Resume Intelligence, Semantic Video Search & Multi-Source RAG Platform",
    version=settings.APP_VERSION,
)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
api_prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=api_prefix)
app.include_router(resumes_router, prefix=api_prefix)
app.include_router(jobs_router, prefix=api_prefix)
app.include_router(analysis_router, prefix=api_prefix)
app.include_router(videos_router, prefix=api_prefix)
app.include_router(search_router, prefix=api_prefix)
app.include_router(rag_router, prefix=api_prefix)
app.include_router(interviews_router, prefix=api_prefix)
app.include_router(chat_router, prefix=api_prefix)
app.include_router(evaluation_router, prefix=api_prefix)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "api_v1": api_prefix
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "provider": settings.LLM_PROVIDER}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
