from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db_utils import database_unavailable
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.auth import DBTestResponse, LoginRequest, TokenResponse
from app.services.auth_service import authenticate_user


router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    user = authenticate_user(db, payload.username, payload.password)
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(access_token=access_token)


@router.get("/db-test", response_model=DBTestResponse)
def db_test(
    db: Annotated[Session, Depends(get_db)],
) -> DBTestResponse:
    try:
        db.execute(text("SELECT 1")).scalar_one()
    except SQLAlchemyError as exc:
        raise database_unavailable("Database connectivity test failed") from exc
    return DBTestResponse(status="ok", database="reachable")
