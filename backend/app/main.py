import logging

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.routes import ai, auth, chat, dispatch_logs, matching, message_draft, rescue_requests, users, volunteer, volunteers
from app.core.config import get_settings
from app.core.db_utils import database_unavailable
from app.db.base import Base
from app.db.session import get_db
from app.models import ChatMessage, DispatchLog, RescueRequest, User, Volunteer  # noqa: F401


logger = logging.getLogger(__name__)
settings = get_settings()


def build_cors_origins() -> list[str]:
    origins: list[str] = []
    seen: set[str] = set()

    for origin in [*settings.cors_origins, "http://localhost:5173", "http://127.0.0.1:5173"]:
        normalized_origin = origin.strip().rstrip("/")
        if normalized_origin and normalized_origin not in seen:
            origins.append(normalized_origin)
            seen.add(normalized_origin)

    return origins


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=build_cors_origins(),
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(_: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.exception("Unhandled database error", exc_info=exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.get("/health", response_model=dict[str, str])
def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1")).scalar_one()
    except SQLAlchemyError as exc:
        raise database_unavailable("Database unavailable") from exc

    return {
        "status": "ok",
        "database": "reachable",
        "schema": settings.database_schema,
    }


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)
app.include_router(volunteers.router, prefix=settings.api_prefix)
app.include_router(volunteer.router, prefix=settings.api_prefix)
app.include_router(rescue_requests.router, prefix=settings.api_prefix)
app.include_router(matching.router, prefix=settings.api_prefix)
app.include_router(message_draft.router, prefix=settings.api_prefix)
app.include_router(dispatch_logs.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(ai.router, prefix=settings.api_prefix)
