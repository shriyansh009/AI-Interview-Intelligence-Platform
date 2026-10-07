import os
import shutil
from fastapi import APIRouter, HTTPException, status
from config import get_settings
from db.database import check_db_health
from services.embedding_service import get_embedding_service

router = APIRouter(prefix="/health", tags=["Health & Readiness"])
settings = get_settings()


@router.get("", status_code=status.HTTP_200_OK)
def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENV,
        "llm_provider": settings.LLM_PROVIDER
    }


@router.get("/live", status_code=status.HTTP_200_OK)
def liveness_probe():
    """Kubernetes / Docker container liveness probe."""
    return {"status": "alive"}


@router.get("/ready", status_code=status.HTTP_200_OK)
def readiness_probe():
    """Readiness probe checking database connectivity and vector storage availability."""
    checks = {}

    # 1. Database Check
    db_ok = check_db_health()
    checks["database"] = "connected" if db_ok else "unreachable"

    # 2. Vector DB directory accessibility
    vector_dir_ok = os.path.exists(settings.VECTOR_DB_DIR) and os.access(settings.VECTOR_DB_DIR, os.W_OK)
    checks["vector_storage"] = "ready" if vector_dir_ok else "storage_path_error"

    # 3. Upload directory accessibility
    upload_dir_ok = os.path.exists(settings.UPLOAD_DIR) and os.access(settings.UPLOAD_DIR, os.W_OK)
    checks["upload_storage"] = "ready" if upload_dir_ok else "upload_path_error"

    all_ready = db_ok and vector_dir_ok and upload_dir_ok

    if not all_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "checks": checks}
        )

    return {
        "status": "ready",
        "checks": checks
    }
