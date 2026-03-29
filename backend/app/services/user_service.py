from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.db_utils import database_unavailable
from app.models.user import User


def list_users(db: Session) -> list[User]:
    try:
        return list(db.scalars(select(User).order_by(User.id.asc())).all())
    except SQLAlchemyError as exc:
        raise database_unavailable("Unable to list users") from exc
