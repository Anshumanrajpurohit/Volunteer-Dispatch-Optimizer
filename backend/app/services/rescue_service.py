from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.db_utils import commit_session, database_unavailable, refresh_instance
from app.models.enums import RescueStatus
from app.models.rescue_request import RescueRequest
from app.schemas.rescue_request import RescueRequestCreate


def create_rescue_request(db: Session, payload: RescueRequestCreate) -> RescueRequest:
    rescue_request = RescueRequest(**payload.model_dump())
    db.add(rescue_request)
    commit_session(
        db,
        integrity_detail="Invalid rescue request data",
        unavailable_detail="Unable to create rescue request",
    )
    refresh_instance(db, rescue_request, unavailable_detail="Unable to load created rescue request")
    return rescue_request


def list_rescue_requests(db: Session) -> list[RescueRequest]:
    try:
        return db.query(RescueRequest).order_by(RescueRequest.created_at.desc()).all()
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to list rescue requests") from exc


def get_rescue_request_or_404(db: Session, rescue_request_id: int) -> RescueRequest:
    try:
        rescue_request = db.query(RescueRequest).filter(RescueRequest.id == rescue_request_id).first()
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load rescue request") from exc

    if rescue_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rescue request not found")
    return rescue_request


def update_rescue_status(
    db: Session,
    rescue_request_id: int,
    status_value: RescueStatus,
) -> RescueRequest:
    rescue_request = get_rescue_request_or_404(db, rescue_request_id)
    rescue_request.status = status_value
    commit_session(db, unavailable_detail="Unable to update rescue request status")
    refresh_instance(db, rescue_request, unavailable_detail="Unable to load updated rescue request")
    return rescue_request
