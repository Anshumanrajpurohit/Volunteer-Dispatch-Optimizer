from typing import Any

from pydantic import BaseModel, Field, field_validator


class AIAssistScopeRequest(BaseModel):
    scope: str = Field(default="this_page", pattern="^(this_page|full_rescue)$")
    current_data: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)

    @field_validator("scope")
    @classmethod
    def normalize_scope(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("current_data", "context", mode="before")
    @classmethod
    def normalize_object_payload(cls, value: object) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}


class RescueFormAssistRequest(AIAssistScopeRequest):
    description: str | None = Field(default=None, max_length=5000)

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class AIAssistResponseEnvelope(BaseModel):
    fields: dict[str, Any] = Field(default_factory=dict)
    message: str | None = Field(default=None, max_length=5000)
    suggested_status: str | None = Field(default=None, min_length=2, max_length=50)
    recommended_volunteer_id: int | None = None
    explanation: str | None = Field(default=None, min_length=2, max_length=2000)
    warnings: list[str] = Field(default_factory=list)

    @field_validator("fields", mode="before")
    @classmethod
    def normalize_fields(cls, value: object) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}

    @field_validator("suggested_status")
    @classmethod
    def normalize_suggested_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized or None

    @field_validator("warnings", mode="before")
    @classmethod
    def normalize_warnings(cls, value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]


class RescueFormAssistResponse(AIAssistResponseEnvelope):
    location: str | None = None
    animal_type: str | None = None
    urgency: int | None = Field(default=None, ge=1, le=4)
    required_skills: list[str] = Field(default_factory=list)
    notes: str | None = None

    @field_validator("required_skills")
    @classmethod
    def normalize_skills(cls, value: list[str]) -> list[str]:
        return sorted({skill.strip().lower() for skill in value if skill and skill.strip()})


class VolunteerRecommendationResponse(AIAssistResponseEnvelope):
    recommended_volunteer_id: int | None = None
    recommendation_reason: str = Field(..., min_length=2, max_length=2000)


class MessageAssistRequest(AIAssistScopeRequest):
    current_message: str | None = Field(default=None, max_length=5000)


class MessageAssistResponse(AIAssistResponseEnvelope):
    generated_message: str = Field(..., min_length=5, max_length=5000)


class SmartDispatchResponse(AIAssistResponseEnvelope):
    volunteer_id: int | None = None
    message: str = Field(..., min_length=5, max_length=5000)
    suggested_status: str = Field(default="contacted", min_length=2, max_length=50)
    suggested_notes: str | None = Field(default=None, max_length=5000)
    rationale: str = Field(..., min_length=2, max_length=2000)

    @field_validator("suggested_status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        return value.strip().lower()
