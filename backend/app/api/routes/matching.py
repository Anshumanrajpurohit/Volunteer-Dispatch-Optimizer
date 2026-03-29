from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.matching import MatchingResponse
from app.services.matching import rank_volunteers_for_rescue


router = APIRouter(prefix="/rescue-requests", tags=["rescue-requests"])


@router.get("/{rescue_request_id}/matches", response_model=MatchingResponse)
def match_volunteers_endpoint(
    rescue_request_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return rank_volunteers_for_rescue(db, rescue_request_id)
