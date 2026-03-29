from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.db_utils import database_unavailable
from app.core.security import verify_password
from app.models.user import User


def get_user_by_username(db: Session, username: str) -> User | None:
    try:
        return db.scalar(select(User).where(User.username == username))
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load user") from exc


def get_user_by_id(db: Session, user_id: int) -> User | None:
    try:
        return db.scalar(select(User).where(User.id == user_id))
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to load user") from exc


def authenticate_user(db: Session, username: str, password: str) -> User:
    user = get_user_by_username(db, username)
    if user is None or not user.hashed_password or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

