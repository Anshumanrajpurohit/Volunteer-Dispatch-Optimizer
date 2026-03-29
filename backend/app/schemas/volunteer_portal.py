from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserRead
from app.schemas.volunteer import VolunteerRead

_ALLOWED_VOLUNTEER_RESPONSES = {"accepted", "declined", "on_the_way", "completed"}


class VolunteerMeRead(BaseModel):
    user: UserRead
    volunteer: VolunteerRead


class VolunteerAssignedRescueRead(BaseModel):
    id: int
    location: str
    latitude: float
    longitude: float
    animal_type: str | None = None
    urgency: int | None = None
    required_skills: list[str] | None = None
    notes: str | None = None
    rescue_status: str | None = None
    volunteer_id: int
    volunteer_name: str | None = None
    volunteer_email: EmailStr | None = None
    dispatch_message: str | None = None
    current_response_status: str | None = None
    assigned_at: datetime | None = None
    last_update_at: datetime | None = None
    chat_enabled: bool = False

    @field_validator("rescue_status", "current_response_status")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized or None


class VolunteerAlertRead(BaseModel):
    rescue_request_id: int
    location: str
    animal_type: str | None = None
    urgency: int | None = None
    dispatch_message: str | None = None
    created_at: datetime | None = None
    current_response_status: str | None = None
    volunteer_id: int
    volunteer_name: str | None = None

    @field_validator("current_response_status")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized or None


class VolunteerRescueRespondRequest(BaseModel):
    status: str = Field(..., min_length=2, max_length=50)
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in _ALLOWED_VOLUNTEER_RESPONSES:
            raise ValueError("Status must be accepted, declined, on_the_way, or completed")
        return normalized

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
