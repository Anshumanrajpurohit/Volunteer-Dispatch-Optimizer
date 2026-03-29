from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"
    __table_args__ = {"schema": "app"}

    id: Mapped[int] = mapped_column(primary_key=True)
    rescue_request_id: Mapped[int | None] = mapped_column(
        ForeignKey("app.rescue_requests.id"),
        nullable=True,
        index=True,
    )
    volunteer_id: Mapped[int | None] = mapped_column(
        ForeignKey("app.volunteers.id"),
        nullable=True,
        index=True,
    )
    dispatch_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    rescue_request: Mapped["RescueRequest"] = relationship(back_populates="dispatch_logs")
    volunteer: Mapped["Volunteer"] = relationship(back_populates="dispatch_logs")
