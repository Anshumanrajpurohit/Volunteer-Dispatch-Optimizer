from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.serializers import to_schema, to_schema_list
from app.core.security import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.dispatch_log import DispatchLogRead
from app.schemas.rescue_request import (
    RescueAssignmentCreate,
    RescueRequestCreate,
    RescueRequestRead,
    RescueRequestStatusUpdate,
)
from app.services.rescue_request_service import (
    assign_volunteer,
    create_rescue_request,
    get_rescue_request_or_404,
    list_rescue_requests,
    update_rescue_request_status,
)


router = APIRouter(prefix="/rescue-requests", tags=["rescue-requests"])


@router.post("", response_model=RescueRequestRead, status_code=status.HTTP_201_CREATED)
def create_rescue_request_endpoint(
    payload: RescueRequestCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema(RescueRequestRead, create_rescue_request(db, payload))


@router.get("", response_model=list[RescueRequestRead])
def list_rescue_requests_endpoint(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema_list(RescueRequestRead, list_rescue_requests(db))


@router.get("/{rescue_request_id}", response_model=RescueRequestRead)
def get_rescue_request_endpoint(
    rescue_request_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema(RescueRequestRead, get_rescue_request_or_404(db, rescue_request_id))


@router.post("/{rescue_request_id}/assign", response_model=DispatchLogRead, status_code=status.HTTP_201_CREATED)
def assign_volunteer_endpoint(
    rescue_request_id: int,
    payload: RescueAssignmentCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema(DispatchLogRead, assign_volunteer(db, rescue_request_id, payload))


@router.patch("/{rescue_request_id}/status", response_model=RescueRequestRead)
def update_rescue_status_endpoint(
    rescue_request_id: int,
    payload: RescueRequestStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema(RescueRequestRead, update_rescue_request_status(db, rescue_request_id, payload))
