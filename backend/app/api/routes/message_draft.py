from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.message import MessageDraftResponse
from app.services.message_generator import build_dispatch_message
from app.services.rescue_request_service import get_rescue_request_or_404
from app.services.volunteer_service import get_volunteer_or_404


router = APIRouter(prefix="/rescue-requests", tags=["rescue-requests"])


@router.post("/{rescue_request_id}/message-draft/{volunteer_id}", response_model=MessageDraftResponse)
def generate_message_draft_endpoint(
    rescue_request_id: int,
    volunteer_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    rescue_request = get_rescue_request_or_404(db, rescue_request_id)
    volunteer = get_volunteer_or_404(db, volunteer_id)
    message = build_dispatch_message(rescue_request, volunteer)
    return MessageDraftResponse(
        rescue_request_id=rescue_request_id,
        volunteer_id=volunteer_id,
        volunteer_name=volunteer.name,
        message=message,
    )
