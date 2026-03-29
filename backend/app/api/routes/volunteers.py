from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.serializers import to_schema, to_schema_list
from app.core.security import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.volunteer import VolunteerCreate, VolunteerRead, VolunteerUpdate
from app.services.volunteer_service import (
    create_volunteer,
    delete_volunteer,
    get_volunteer_or_404,
    list_volunteers,
    update_volunteer,
)


router = APIRouter(prefix="/volunteers", tags=["volunteers"])


@router.post("", response_model=VolunteerRead, status_code=status.HTTP_201_CREATED)
def create_volunteer_endpoint(
    payload: VolunteerCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema(VolunteerRead, create_volunteer(db, payload))


@router.get("", response_model=list[VolunteerRead])
def list_volunteers_endpoint(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema_list(VolunteerRead, list_volunteers(db))


@router.get("/{volunteer_id}", response_model=VolunteerRead)
def get_volunteer_endpoint(
    volunteer_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema(VolunteerRead, get_volunteer_or_404(db, volunteer_id))


@router.put("/{volunteer_id}", response_model=VolunteerRead)
def update_volunteer_endpoint(
    volunteer_id: int,
    payload: VolunteerUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema(VolunteerRead, update_volunteer(db, volunteer_id, payload))


@router.delete("/{volunteer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_volunteer_endpoint(
    volunteer_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    delete_volunteer(db, volunteer_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
