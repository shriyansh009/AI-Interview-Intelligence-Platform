import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from core.logging import logger, RequestLoggingMiddleware
from core.middleware import SecurityHeadersMiddleware, RateLimiterMiddleware, global_exception_handler
from db.database import init_db

# Routers
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
from api.v1.health import router as health_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for graceful startup and shutdown."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENV}]")

    # Ensure required runtime directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.VECTOR_DB_DIR, exist_ok=True)

    # Initialize Database
    try:
        init_db()
    except Exception as e:
        logger.error(f"Critical error initializing database: {e}")

    yield

    logger.info("Shutting down application...")


# FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    description="Production Full-Stack AI Interview Preparation, Resume Intelligence & Multi-Source RAG Platform",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG or settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.DEBUG or settings.ENV != "production" else None,
    lifespan=lifespan,
)

# 1. Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# 2. Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 3. Rate Limiting Middleware
app.add_middleware(RateLimiterMiddleware)

# 4. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time-Ms", "Content-Range", "Accept-Ranges"],
)

# 5. Global Exception Handler
app.add_exception_handler(Exception, global_exception_handler)

# 6. Register Health Check Routers
app.include_router(health_router)

# 7. Register API v1 Routers
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
        "environment": settings.ENV,
        "status": "online",
        "api_v1": api_prefix
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
