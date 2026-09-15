from fastapi import APIRouter, Depends
from core.auth import get_current_user
from models.models import User
from schemas.schemas import EvaluationSummaryResponse
from services.evaluation_service import get_evaluation_service

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])
eval_service = get_evaluation_service()


@router.get("/metrics", response_model=EvaluationSummaryResponse)
def get_evaluation_metrics(current_user: User = Depends(get_current_user)):
    summary = eval_service.get_system_evaluation_summary()
    return EvaluationSummaryResponse(
        categories=summary["categories"],
        last_updated=summary["last_updated"]
    )
