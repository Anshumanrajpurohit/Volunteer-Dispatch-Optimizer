from datetime import datetime

from sqlalchemy import ARRAY, DateTime, Float, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RescueRequest(Base):
    __tablename__ = "rescue_requests"
    __table_args__ = {"schema": "app"}

    id: Mapped[int] = mapped_column(primary_key=True)
    location: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    animal_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    urgency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    required_skills: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, server_default=text("'open'"))
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    dispatch_logs: Mapped[list["DispatchLog"]] = relationship(back_populates="rescue_request")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="rescue_request")
