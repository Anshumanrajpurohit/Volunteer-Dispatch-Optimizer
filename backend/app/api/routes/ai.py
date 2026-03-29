from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.ai import (
    AIAssistScopeRequest,
    MessageAssistRequest,
    MessageAssistResponse,
    RescueFormAssistRequest,
    RescueFormAssistResponse,
    SmartDispatchResponse,
    VolunteerRecommendationResponse,
)
from app.services.ai_service import assist_message, assist_rescue_form, recommend_volunteer, smart_dispatch


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/rescue-form-assist", response_model=RescueFormAssistResponse)
def rescue_form_assist_endpoint(
    payload: RescueFormAssistRequest,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return assist_rescue_form(payload)


@router.post("/recommend-volunteer/{rescue_request_id}", response_model=VolunteerRecommendationResponse)
def recommend_volunteer_endpoint(
    rescue_request_id: int,
    payload: AIAssistScopeRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return recommend_volunteer(db, rescue_request_id, payload)


@router.post("/message-assist/{rescue_request_id}/{volunteer_id}", response_model=MessageAssistResponse)
def message_assist_endpoint(
    rescue_request_id: int,
    volunteer_id: int,
    payload: MessageAssistRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return assist_message(db, rescue_request_id, volunteer_id, payload)


@router.post("/smart-dispatch/{rescue_request_id}", response_model=SmartDispatchResponse)
def smart_dispatch_endpoint(
    rescue_request_id: int,
    payload: AIAssistScopeRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return smart_dispatch(db, rescue_request_id, payload)
