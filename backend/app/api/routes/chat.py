from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.serializers import to_schema, to_schema_list
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageRead
from app.services.chat_service import create_chat_message, list_chat_messages


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/send", response_model=ChatMessageRead)
def send_chat_message_endpoint(
    payload: ChatMessageCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return to_schema(ChatMessageRead, create_chat_message(db, payload, current_user))


@router.get("/{rescue_request_id}", response_model=list[ChatMessageRead])
def list_chat_messages_endpoint(
    rescue_request_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return to_schema_list(ChatMessageRead, list_chat_messages(db, rescue_request_id, current_user))
