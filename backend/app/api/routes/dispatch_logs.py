from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.serializers import to_schema, to_schema_list
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.dispatch_log import DispatchLogRead
from app.services.dispatch_service import get_dispatch_log_or_404, list_dispatch_logs


router = APIRouter(prefix="/dispatch-logs", tags=["dispatch-logs"])


@router.get("", response_model=list[DispatchLogRead])
def list_dispatch_logs_endpoint(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
    rescue_request_id: int | None = None,
    volunteer_id: int | None = None,
):
    return to_schema_list(DispatchLogRead, list_dispatch_logs(
        db,
        rescue_request_id=rescue_request_id,
        volunteer_id=volunteer_id,
    ))


@router.get("/{dispatch_log_id}", response_model=DispatchLogRead)
def get_dispatch_log_endpoint(
    dispatch_log_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR))],
):
    return to_schema(DispatchLogRead, get_dispatch_log_or_404(db, dispatch_log_id))
