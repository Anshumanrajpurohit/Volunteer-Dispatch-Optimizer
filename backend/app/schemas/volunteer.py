from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class VolunteerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    phone: str | None = Field(default=None, min_length=7, max_length=20)
    email: EmailStr | None = None
    latitude: float
    longitude: float
    skills: list[str] | None = None
    availability_start: time | None = None
    availability_end: time | None = None
    total_dispatches: int = Field(default=0, ge=0)
    successful_responses: int = Field(default=0, ge=0)
    active_status: bool = True

    @field_validator("email")
    @classmethod
    def validate_email_length(cls, value: EmailStr | None) -> EmailStr | None:
        if value is not None and len(str(value)) > 150:
            raise ValueError("Email must be 150 characters or fewer.")
        return value

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

    @field_validator("skills")
    @classmethod
    def normalize_skills(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        cleaned = sorted({skill.strip().lower() for skill in value if skill and skill.strip()})
        return cleaned or None

    @model_validator(mode="after")
    def validate_response_counts(self):
        if self.successful_responses > self.total_dispatches:
            raise ValueError("Successful responses cannot exceed total dispatches.")
        return self


class VolunteerCreate(VolunteerBase):
    pass


class VolunteerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = Field(default=None, min_length=7, max_length=20)
    email: EmailStr | None = None
    latitude: float | None = None
    longitude: float | None = None
    skills: list[str] | None = None
    availability_start: time | None = None
    availability_end: time | None = None
    total_dispatches: int | None = Field(default=None, ge=0)
    successful_responses: int | None = Field(default=None, ge=0)
    active_status: bool | None = None

    @field_validator("email")
    @classmethod
    def validate_email_length(cls, value: EmailStr | None) -> EmailStr | None:
        if value is not None and len(str(value)) > 150:
            raise ValueError("Email must be 150 characters or fewer.")
        return value

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if not -90 <= value <= 90:
            raise ValueError("Latitude must be between -90 and 90.")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if not -180 <= value <= 180:
            raise ValueError("Longitude must be between -180 and 180.")
        return value

    @field_validator("skills")
    @classmethod
    def normalize_skills(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        cleaned = sorted({skill.strip().lower() for skill in value if skill and skill.strip()})
        return cleaned or None

    @model_validator(mode="after")
    def validate_response_counts(self):
        if (
            self.total_dispatches is not None
            and self.successful_responses is not None
            and self.successful_responses > self.total_dispatches
        ):
            raise ValueError("Successful responses cannot exceed total dispatches.")
        return self


class VolunteerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str | None = None
    email: EmailStr | None = None
    latitude: float
    longitude: float
    skills: list[str] | None = None
    availability_start: time | None = None
    availability_end: time | None = None
    total_dispatches: int | None = None
    successful_responses: int | None = None
    active_status: bool | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
