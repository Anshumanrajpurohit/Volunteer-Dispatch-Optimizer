from datetime import datetime, time

from sqlalchemy import ARRAY, Boolean, DateTime, Float, Integer, String, Text, Time, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Volunteer(Base):
    __tablename__ = "volunteers"
    __table_args__ = {"schema": "app"}

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    skills: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    availability_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    availability_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    total_dispatches: Mapped[int | None] = mapped_column(Integer, nullable=True, server_default=text("0"))
    successful_responses: Mapped[int | None] = mapped_column(Integer, nullable=True, server_default=text("0"))
    active_status: Mapped[bool | None] = mapped_column(Boolean, nullable=True, server_default=text("true"))
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

    dispatch_logs: Mapped[list["DispatchLog"]] = relationship(back_populates="volunteer")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="volunteer")
