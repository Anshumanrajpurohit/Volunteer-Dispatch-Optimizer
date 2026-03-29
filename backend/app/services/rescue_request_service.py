from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.db_utils import commit_session, database_unavailable, refresh_instance
from app.models.dispatch_log import DispatchLog
from app.models.rescue_request import RescueRequest
from app.schemas.rescue_request import (
    RescueAssignmentCreate,
    RescueRequestCreate,
    RescueRequestStatusUpdate,
)
from app.services.volunteer_service import get_volunteer_or_404


def list_rescue_requests(db: Session) -> list[RescueRequest]:
    try:
        return list(
            db.scalars(
                select(RescueRequest).order_by(RescueRequest.created_at.desc(), RescueRequest.id.desc())
            ).all()
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to list rescue requests") from exc


def get_rescue_request_by_id(db: Session, rescue_request_id: int) -> RescueRequest | None:
    try:
        return db.scalar(select(RescueRequest).where(RescueRequest.id == rescue_request_id))
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load rescue request") from exc


def get_rescue_request_or_404(db: Session, rescue_request_id: int) -> RescueRequest:
    rescue_request = get_rescue_request_by_id(db, rescue_request_id)
    if rescue_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rescue request not found")
    return rescue_request


def create_rescue_request(db: Session, payload: RescueRequestCreate) -> RescueRequest:
    try:
        rescue_request = RescueRequest(**payload.model_dump())
        db.add(rescue_request)
        commit_session(db, generic_detail="Unable to create rescue request")
        refresh_instance(db, rescue_request, detail="Unable to load created rescue request")
        return rescue_request
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise database_unavailable("Unable to create rescue request") from exc


def update_rescue_request_status(
    db: Session,
    rescue_request_id: int,
    payload: RescueRequestStatusUpdate,
) -> RescueRequest:
    try:
        rescue_request = get_rescue_request_or_404(db, rescue_request_id)
        rescue_request.status = payload.status
        commit_session(db, generic_detail="Unable to update rescue request status")
        refresh_instance(db, rescue_request, detail="Unable to load updated rescue request")
        return rescue_request
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise database_unavailable("Unable to update rescue request status") from exc


def assign_volunteer(
    db: Session,
    rescue_request_id: int,
    payload: RescueAssignmentCreate,
) -> DispatchLog:
    try:
        rescue_request = get_rescue_request_or_404(db, rescue_request_id)
        volunteer = get_volunteer_or_404(db, payload.volunteer_id)

        if (rescue_request.status or "").strip().lower() in {"resolved", "cancelled"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign a volunteer to a closed rescue request",
            )

        dispatch_log = DispatchLog(
            rescue_request_id=rescue_request.id,
            volunteer_id=volunteer.id,
            dispatch_status=payload.dispatch_status,
            message_snapshot=payload.message_snapshot,
            notes=payload.notes,
        )
        db.add(dispatch_log)

        volunteer.total_dispatches = (volunteer.total_dispatches or 0) + 1
        if payload.dispatch_status in {"accepted", "completed"}:
            volunteer.successful_responses = (volunteer.successful_responses or 0) + 1

        rescue_request.status = "dispatched"

        commit_session(db, generic_detail="Unable to assign volunteer")
        refresh_instance(db, dispatch_log, detail="Unable to load created dispatch log")
        return dispatch_log
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise database_unavailable("Unable to assign volunteer") from exc

