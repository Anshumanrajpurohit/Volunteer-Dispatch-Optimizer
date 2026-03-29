from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User


settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
VALID_ROLES = {role.value for role in UserRole}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expires_at = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    from app.services.auth_service import get_user_by_id

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise _credentials_exception()
        user_id = int(user_id)
    except (JWTError, TypeError, ValueError) as exc:
        raise _credentials_exception() from exc

    user = get_user_by_id(db, user_id)
    if user is None:
        raise _credentials_exception()

    user_role = (user.role or "").strip().lower()
    if user_role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role",
        )
    user.role = user_role
    return user


def require_roles(*roles: UserRole | str):
    allowed_roles = {
        role.value if isinstance(role, UserRole) else str(role).strip().lower()
        for role in roles
    }
    invalid_configured_roles = allowed_roles - VALID_ROLES
    if invalid_configured_roles:
        raise ValueError(f"Invalid configured roles: {sorted(invalid_configured_roles)}")

    def dependency(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        user_role = (current_user.role or "").strip().lower()
        if user_role not in VALID_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user role",
            )
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency

