from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


_ALLOWED_SENDER_TYPES = {"coordinator", "volunteer"}


class ChatMessageCreate(BaseModel):
    rescue_request_id: int
    volunteer_id: int
    sender_type: str = Field(..., min_length=5, max_length=20)
    message: str = Field(..., min_length=1, max_length=5000)

    @field_validator("sender_type")
    @classmethod
    def normalize_sender_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in _ALLOWED_SENDER_TYPES:
            raise ValueError("sender_type must be coordinator or volunteer")
        return normalized

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Message cannot be empty")
        return normalized


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rescue_request_id: int
    volunteer_id: int
    sender_type: str
    message: str
    created_at: datetime | None = None
