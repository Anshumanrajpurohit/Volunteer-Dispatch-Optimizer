from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.db_utils import database_unavailable
from app.models.dispatch_log import DispatchLog


def list_dispatch_logs(
    db: Session,
    *,
    rescue_request_id: int | None = None,
    volunteer_id: int | None = None,
) -> list[DispatchLog]:
    try:
        query = (
            select(DispatchLog)
            .options(
                joinedload(DispatchLog.volunteer),
                joinedload(DispatchLog.rescue_request),
            )
            .order_by(DispatchLog.created_at.desc(), DispatchLog.id.desc())
        )
        if rescue_request_id is not None:
            query = query.where(DispatchLog.rescue_request_id == rescue_request_id)
        if volunteer_id is not None:
            query = query.where(DispatchLog.volunteer_id == volunteer_id)
        return list(db.scalars(query).unique().all())
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to list dispatch logs") from exc


def get_dispatch_log_or_404(db: Session, dispatch_log_id: int) -> DispatchLog:
    try:
        dispatch_log = db.scalar(
            select(DispatchLog)
            .options(
                joinedload(DispatchLog.volunteer),
                joinedload(DispatchLog.rescue_request),
            )
            .where(DispatchLog.id == dispatch_log_id)
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load dispatch log") from exc

    if dispatch_log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch log not found")
    return dispatch_log
