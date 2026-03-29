from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.db_utils import commit_session, database_unavailable
from app.models.dispatch_log import DispatchLog
from app.models.user import User
from app.schemas.volunteer_portal import VolunteerAlertRead, VolunteerAssignedRescueRead, VolunteerRescueRespondRequest
from app.services.rescue_request_service import get_rescue_request_or_404
from app.services.volunteer_service import get_volunteer_by_email


def get_current_volunteer_or_403(db: Session, current_user: User):
    volunteer = get_volunteer_by_email(db, current_user.email)
    if volunteer is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Volunteer profile not linked to this user account",
        )
    return volunteer


def list_current_volunteer_rescues(db: Session, current_user: User) -> list[VolunteerAssignedRescueRead]:
    volunteer = get_current_volunteer_or_403(db, current_user)
    volunteer_logs = _list_dispatch_logs_for_volunteer(db, volunteer.id)
    rescue_ids = [log.rescue_request_id for log in volunteer_logs if log.rescue_request_id is not None]
    latest_logs = _list_latest_dispatch_logs_for_rescue_ids(db, rescue_ids)
    volunteer_history = _group_logs_by_rescue(volunteer_logs)

    summaries = []
    for latest_log in latest_logs:
        rescue_request_id = latest_log.rescue_request_id
        if rescue_request_id is None or latest_log.volunteer_id != volunteer.id:
            continue
        history = volunteer_history.get(rescue_request_id, [])
        if not history:
            continue
        summaries.append(_build_rescue_summary(latest_log, history))

    summaries.sort(key=lambda item: (item.last_update_at is not None, item.last_update_at), reverse=True)
    return summaries


def get_current_volunteer_rescue_or_404(
    db: Session,
    rescue_request_id: int,
    current_user: User,
) -> VolunteerAssignedRescueRead:
    volunteer = get_current_volunteer_or_403(db, current_user)
    latest_log = _get_latest_dispatch_log_for_rescue(db, rescue_request_id)
    if latest_log is None or latest_log.volunteer_id != volunteer.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned rescue not found")

    history = _list_dispatch_logs_for_rescue_and_volunteer(db, rescue_request_id, volunteer.id)
    if not history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned rescue not found")
    return _build_rescue_summary(latest_log, history)


def respond_to_volunteer_rescue(
    db: Session,
    rescue_request_id: int,
    payload: VolunteerRescueRespondRequest,
    current_user: User,
) -> VolunteerAssignedRescueRead:
    volunteer = get_current_volunteer_or_403(db, current_user)
    latest_log = _get_latest_dispatch_log_for_rescue(db, rescue_request_id)
    if latest_log is None or latest_log.volunteer_id != volunteer.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned rescue not found")

    rescue_request = latest_log.rescue_request or get_rescue_request_or_404(db, rescue_request_id)
    history = _list_dispatch_logs_for_rescue_and_volunteer(db, rescue_request_id, volunteer.id)
    dispatch_message = _extract_dispatch_message(history)

    response_log = DispatchLog(
        rescue_request_id=rescue_request_id,
        volunteer_id=volunteer.id,
        dispatch_status=payload.status,
        message_snapshot=dispatch_message,
        notes=payload.notes or f"Volunteer updated status to {payload.status}.",
    )
    db.add(response_log)

    if payload.status == "declined":
        rescue_request.status = "open"
    elif payload.status == "completed":
        rescue_request.status = "resolved"
    else:
        rescue_request.status = "dispatched"

    if payload.status in {"accepted", "completed"} and not any(
        (log.dispatch_status or "").strip().lower() in {"accepted", "completed"}
        for log in history
    ):
        volunteer.successful_responses = (volunteer.successful_responses or 0) + 1

    commit_session(db, generic_detail="Unable to update volunteer rescue response")
    return get_current_volunteer_rescue_or_404(db, rescue_request_id, current_user)


def list_volunteer_alerts(db: Session, current_user: User) -> list[VolunteerAlertRead]:
    alerts = []
    for rescue in list_current_volunteer_rescues(db, current_user):
        if rescue.rescue_status != "dispatched" or rescue.current_response_status != "contacted":
            continue
        alerts.append(
            VolunteerAlertRead(
                rescue_request_id=rescue.id,
                location=rescue.location,
                animal_type=rescue.animal_type,
                urgency=rescue.urgency,
                dispatch_message=rescue.dispatch_message,
                created_at=rescue.assigned_at,
                current_response_status=rescue.current_response_status,
                volunteer_id=rescue.volunteer_id,
                volunteer_name=rescue.volunteer_name,
            )
        )
    return alerts


def _list_dispatch_logs_for_volunteer(db: Session, volunteer_id: int) -> list[DispatchLog]:
    try:
        return list(
            db.scalars(
                select(DispatchLog)
                .options(joinedload(DispatchLog.rescue_request), joinedload(DispatchLog.volunteer))
                .where(DispatchLog.volunteer_id == volunteer_id)
                .order_by(DispatchLog.created_at.desc(), DispatchLog.id.desc())
            ).unique().all()
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load volunteer rescue assignments") from exc


def _list_dispatch_logs_for_rescue_and_volunteer(
    db: Session,
    rescue_request_id: int,
    volunteer_id: int,
) -> list[DispatchLog]:
    try:
        return list(
            db.scalars(
                select(DispatchLog)
                .options(joinedload(DispatchLog.rescue_request), joinedload(DispatchLog.volunteer))
                .where(
                    DispatchLog.rescue_request_id == rescue_request_id,
                    DispatchLog.volunteer_id == volunteer_id,
                )
                .order_by(DispatchLog.created_at.desc(), DispatchLog.id.desc())
            ).unique().all()
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load volunteer rescue history") from exc


def _list_latest_dispatch_logs_for_rescue_ids(db: Session, rescue_ids: list[int]) -> list[DispatchLog]:
    if not rescue_ids:
        return []

    try:
        logs = list(
            db.scalars(
                select(DispatchLog)
                .options(joinedload(DispatchLog.rescue_request), joinedload(DispatchLog.volunteer))
                .where(DispatchLog.rescue_request_id.in_(rescue_ids))
                .order_by(DispatchLog.created_at.desc(), DispatchLog.id.desc())
            ).unique().all()
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load rescue assignment history") from exc

    latest_by_rescue = {}
    for log in logs:
        if log.rescue_request_id is None or log.rescue_request_id in latest_by_rescue:
            continue
        latest_by_rescue[log.rescue_request_id] = log
    return list(latest_by_rescue.values())


def _get_latest_dispatch_log_for_rescue(db: Session, rescue_request_id: int) -> DispatchLog | None:
    try:
        return db.scalar(
            select(DispatchLog)
            .options(joinedload(DispatchLog.rescue_request), joinedload(DispatchLog.volunteer))
            .where(DispatchLog.rescue_request_id == rescue_request_id)
            .order_by(DispatchLog.created_at.desc(), DispatchLog.id.desc())
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to validate volunteer assignment") from exc


def _group_logs_by_rescue(logs: list[DispatchLog]) -> dict[int, list[DispatchLog]]:
    grouped: dict[int, list[DispatchLog]] = defaultdict(list)
    for log in logs:
        if log.rescue_request_id is None:
            continue
        grouped[log.rescue_request_id].append(log)
    return grouped


def _extract_dispatch_message(history: list[DispatchLog]) -> str | None:
    for log in reversed(history):
        if log.message_snapshot and log.message_snapshot.strip():
            return log.message_snapshot.strip()
    return None


def _build_rescue_summary(
    latest_log: DispatchLog,
    history: list[DispatchLog],
) -> VolunteerAssignedRescueRead:
    rescue = latest_log.rescue_request
    if rescue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned rescue not found")

    volunteer = latest_log.volunteer
    assigned_log = history[-1]
    dispatch_message = _extract_dispatch_message(history)
    current_response_status = (latest_log.dispatch_status or "contacted").strip().lower()
    rescue_status = (rescue.status or "open").strip().lower()

    return VolunteerAssignedRescueRead(
        id=rescue.id,
        location=rescue.location,
        latitude=rescue.latitude,
        longitude=rescue.longitude,
        animal_type=rescue.animal_type,
        urgency=rescue.urgency,
        required_skills=rescue.required_skills,
        notes=rescue.notes,
        rescue_status=rescue_status,
        volunteer_id=latest_log.volunteer_id or 0,
        volunteer_name=volunteer.name if volunteer is not None else None,
        volunteer_email=volunteer.email if volunteer is not None else None,
        dispatch_message=dispatch_message,
        current_response_status=current_response_status,
        assigned_at=assigned_log.created_at,
        last_update_at=latest_log.created_at,
        chat_enabled=rescue_status == "dispatched" and latest_log.volunteer_id is not None,
    )
