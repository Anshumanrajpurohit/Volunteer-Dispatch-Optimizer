import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.db_utils import commit_session, database_unavailable, refresh_instance
from app.models.chat_message import ChatMessage
from app.models.dispatch_log import DispatchLog
from app.models.user import User
from app.schemas.chat import ChatMessageCreate
from app.services.rescue_request_service import get_rescue_request_or_404
from app.services.volunteer_portal_service import get_current_volunteer_or_403


logger = logging.getLogger(__name__)


def list_chat_messages(db: Session, rescue_request_id: int, current_user: User) -> list[ChatMessage]:
    assignment = get_current_assignment_or_400(db, rescue_request_id)
    _validate_chat_access(db, current_user, assignment)

    try:
        return list(
            db.scalars(
                select(ChatMessage)
                .where(
                    ChatMessage.rescue_request_id == rescue_request_id,
                    ChatMessage.volunteer_id == assignment.volunteer_id,
                )
                .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
            ).all()
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load chat messages") from exc


def create_chat_message(db: Session, payload: ChatMessageCreate, current_user: User) -> ChatMessage:
    assignment = get_current_assignment_or_400(db, payload.rescue_request_id)
    if assignment.volunteer_id != payload.volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat is only available for the currently assigned volunteer",
        )

    _validate_chat_access(db, current_user, assignment)
    _validate_sender_type(current_user, payload.sender_type)

    try:
        chat_message = ChatMessage(**payload.model_dump())
        db.add(chat_message)
        commit_session(db, generic_detail="Unable to send chat message")
        refresh_instance(db, chat_message, detail="Unable to load sent chat message")
        return chat_message
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise database_unavailable("Unable to send chat message") from exc


def get_current_assignment_or_400(db: Session, rescue_request_id: int) -> DispatchLog:
    rescue_request = get_rescue_request_or_404(db, rescue_request_id)
    if (rescue_request.status or "").strip().lower() != "dispatched":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat is available only when the rescue request is currently assigned",
        )

    try:
        assignment = db.scalar(
            select(DispatchLog)
            .where(
                DispatchLog.rescue_request_id == rescue_request_id,
                DispatchLog.volunteer_id.is_not(None),
            )
            .order_by(DispatchLog.created_at.desc(), DispatchLog.id.desc())
        )
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to validate chat assignment") from exc

    if assignment is None or assignment.volunteer_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat is available only after a volunteer has been assigned",
        )
    return assignment


def _validate_chat_access(db: Session, current_user: User, assignment: DispatchLog) -> None:
    user_role = (current_user.role or "").strip().lower()
    if user_role in {"admin", "coordinator"}:
        return
    if user_role != "volunteer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    volunteer = get_current_volunteer_or_403(db, current_user)
    if assignment.volunteer_id != volunteer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Volunteers can only access chats for rescues assigned to them",
        )


def _validate_sender_type(current_user: User, sender_type: str) -> None:
    user_role = (current_user.role or "").strip().lower()
    allowed_sender_type = "volunteer" if user_role == "volunteer" else "coordinator"
    if sender_type != allowed_sender_type:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Users with role {user_role or 'unknown'} must send chat messages as {allowed_sender_type}",
        )
