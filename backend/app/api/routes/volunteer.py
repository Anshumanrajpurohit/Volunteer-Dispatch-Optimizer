from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.serializers import to_schema
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserRead
from app.schemas.volunteer import VolunteerRead
from app.schemas.volunteer_portal import (
    VolunteerAlertRead,
    VolunteerAssignedRescueRead,
    VolunteerMeRead,
    VolunteerRescueRespondRequest,
)
from app.services.volunteer_portal_service import (
    get_current_volunteer_or_403,
    get_current_volunteer_rescue_or_404,
    list_current_volunteer_rescues,
    list_volunteer_alerts,
    respond_to_volunteer_rescue,
)


router = APIRouter(prefix="/volunteer", tags=["volunteer"])


@router.get("/me", response_model=VolunteerMeRead)
def read_current_volunteer_profile(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.VOLUNTEER))],
):
    volunteer = get_current_volunteer_or_403(db, current_user)
    return VolunteerMeRead(
        user=to_schema(UserRead, current_user),
        volunteer=to_schema(VolunteerRead, volunteer),
    )


@router.get("/rescues", response_model=list[VolunteerAssignedRescueRead])
def read_current_volunteer_rescues(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.VOLUNTEER))],
):
    return list_current_volunteer_rescues(db, current_user)


@router.get("/rescues/{rescue_request_id}", response_model=VolunteerAssignedRescueRead)
def read_current_volunteer_rescue(
    rescue_request_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.VOLUNTEER))],
):
    return get_current_volunteer_rescue_or_404(db, rescue_request_id, current_user)


@router.post("/rescues/{rescue_request_id}/respond", response_model=VolunteerAssignedRescueRead)
def respond_to_current_volunteer_rescue(
    rescue_request_id: int,
    payload: VolunteerRescueRespondRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.VOLUNTEER))],
):
    return respond_to_volunteer_rescue(db, rescue_request_id, payload, current_user)


@router.get("/alerts", response_model=list[VolunteerAlertRead])
def read_current_volunteer_alerts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.VOLUNTEER))],
):
    return list_volunteer_alerts(db, current_user)
