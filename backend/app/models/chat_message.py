from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "app"}

    id: Mapped[int] = mapped_column(primary_key=True)
    rescue_request_id: Mapped[int] = mapped_column(
        ForeignKey("app.rescue_requests.id"),
        nullable=False,
        index=True,
    )
    volunteer_id: Mapped[int] = mapped_column(
        ForeignKey("app.volunteers.id"),
        nullable=False,
        index=True,
    )
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    rescue_request: Mapped["RescueRequest"] = relationship(back_populates="chat_messages")
    volunteer: Mapped["Volunteer"] = relationship(back_populates="chat_messages")
