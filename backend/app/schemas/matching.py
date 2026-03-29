from pydantic import BaseModel, Field


class ScoreBreakdown(BaseModel):
    distance_score: float = Field(..., ge=0, le=100)
    skill_score: float = Field(..., ge=0, le=100)
    availability_score: float = Field(..., ge=0, le=100)
    response_rate_score: float = Field(..., ge=0, le=100)
    final_score: float = Field(..., ge=0, le=100)


class MatchedVolunteer(BaseModel):
    volunteer_id: int
    volunteer_name: str
    phone: str | None = None
    email: str | None = None
    final_score: float
    distance_score: float
    skill_score: float
    availability_score: float
    response_rate_score: float
    matched_skills: list[str]
    distance_km: float
    current_availability_status: str
    total_dispatches: int
    successful_responses: int
    active_status: bool
    score_breakdown: ScoreBreakdown


class MatchingResponse(BaseModel):
    rescue_request_id: int
    ranked_volunteers: list[MatchedVolunteer]
