import logging

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


def database_unavailable(detail: str = "Database unavailable") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=detail,
    )


def commit_session(
    db: Session,
    *,
    integrity_detail: str = "Database constraint violation",
    integrity_status_code: int = status.HTTP_400_BAD_REQUEST,
    generic_detail: str = "Database write failed",
) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.warning("Database integrity error", exc_info=exc)
        raise HTTPException(
            status_code=integrity_status_code,
            detail=integrity_detail,
        ) from exc
    except OperationalError as exc:
        db.rollback()
        logger.exception("Database connection error", exc_info=exc)
        raise database_unavailable(generic_detail) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database write error", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=generic_detail,
        ) from exc


def refresh_instance(db: Session, instance: object, *, detail: str = "Database refresh failed") -> None:
    try:
        db.refresh(instance)
    except OperationalError as exc:
        db.rollback()
        logger.exception("Database connection error during refresh", exc_info=exc)
        raise database_unavailable(detail) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database refresh error", exc_info=exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail) from exc
