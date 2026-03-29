from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.db_utils import commit_session, database_unavailable, refresh_instance
from app.models.volunteer import Volunteer
from app.schemas.volunteer import VolunteerCreate, VolunteerUpdate


def list_volunteers(db: Session) -> list[Volunteer]:
    try:
        return list(db.scalars(select(Volunteer).order_by(Volunteer.name.asc(), Volunteer.id.asc())).all())
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to list volunteers") from exc


def list_active_volunteers(db: Session) -> list[Volunteer]:
    try:
        return list(
            db.scalars(
                select(Volunteer)
                .where(Volunteer.active_status.is_(True))
                .order_by(Volunteer.name.asc(), Volunteer.id.asc())
            ).all()
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to list active volunteers") from exc


def get_volunteer_by_id(db: Session, volunteer_id: int) -> Volunteer | None:
    try:
        return db.scalar(select(Volunteer).where(Volunteer.id == volunteer_id))
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load volunteer") from exc


def get_volunteer_by_email(db: Session, email: str | None) -> Volunteer | None:
    if not email:
        return None
    try:
        return db.scalar(select(Volunteer).where(Volunteer.email == email))
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load volunteer") from exc


def get_volunteer_or_404(db: Session, volunteer_id: int) -> Volunteer:
    volunteer = get_volunteer_by_id(db, volunteer_id)
    if volunteer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer not found")
    return volunteer


def create_volunteer(db: Session, payload: VolunteerCreate) -> Volunteer:
    try:
        volunteer = Volunteer(**payload.model_dump())
        db.add(volunteer)
        commit_session(
            db,
            integrity_detail="Volunteer email already exists",
            generic_detail="Unable to create volunteer",
        )
        refresh_instance(db, volunteer, detail="Unable to load created volunteer")
        return volunteer
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise database_unavailable("Unable to create volunteer") from exc


def update_volunteer(db: Session, volunteer_id: int, payload: VolunteerUpdate) -> Volunteer:
    try:
        volunteer = get_volunteer_or_404(db, volunteer_id)
        updates = payload.model_dump(exclude_unset=True)

        total_dispatches = updates.get("total_dispatches", volunteer.total_dispatches or 0)
        successful_responses = updates.get("successful_responses", volunteer.successful_responses or 0)
        if successful_responses > total_dispatches:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Successful responses cannot exceed total dispatches",
            )

        for field, value in updates.items():
            setattr(volunteer, field, value)

        commit_session(
            db,
            integrity_detail="Volunteer email already exists",
            generic_detail="Unable to update volunteer",
        )
        refresh_instance(db, volunteer, detail="Unable to load updated volunteer")
        return volunteer
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise database_unavailable("Unable to update volunteer") from exc


def delete_volunteer(db: Session, volunteer_id: int) -> None:
    try:
        volunteer = get_volunteer_or_404(db, volunteer_id)
        db.delete(volunteer)
        commit_session(
            db,
            integrity_detail="Volunteer cannot be deleted because it is referenced by dispatch logs",
            integrity_status_code=status.HTTP_409_CONFLICT,
            generic_detail="Unable to delete volunteer",
        )
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise database_unavailable("Unable to delete volunteer") from exc
