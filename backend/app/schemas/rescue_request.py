from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_status(value: str) -> str:
    normalized = value.strip().lower()
    if len(normalized) < 2 or len(normalized) > 50:
        raise ValueError("Status must be between 2 and 50 characters.")
    return normalized


class RescueRequestBase(BaseModel):
    location: str = Field(..., min_length=3)
    latitude: float
    longitude: float
    animal_type: str | None = Field(default=None, min_length=2, max_length=100)
    urgency: int = Field(..., ge=1, le=4)
    required_skills: list[str] | None = None
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float) -> float:
        if not -90 <= value <= 90:
            raise ValueError("Latitude must be between -90 and 90.")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float) -> float:
        if not -180 <= value <= 180:
            raise ValueError("Longitude must be between -180 and 180.")
        return value

    @field_validator("required_skills")
    @classmethod
    def normalize_skills(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        cleaned = sorted({skill.strip().lower() for skill in value if skill and skill.strip()})
        return cleaned or None


class RescueRequestCreate(RescueRequestBase):
    pass


class RescueRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    location: str
    latitude: float
    longitude: float
    animal_type: str | None = None
    urgency: int | None = None
    required_skills: list[str] | None = None
    notes: str | None = None
    status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RescueRequestStatusUpdate(BaseModel):
    status: str = Field(..., min_length=2, max_length=50)

    @field_validator("status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        return _normalize_status(value)


class RescueAssignmentCreate(BaseModel):
    volunteer_id: int
    message_snapshot: str = Field(..., min_length=5, max_length=5000)
    dispatch_status: str = Field(default="contacted", min_length=2, max_length=50)
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("dispatch_status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        return _normalize_status(value)
