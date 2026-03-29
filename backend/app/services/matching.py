from sqlalchemy.orm import Session

from app.schemas.matching import MatchedVolunteer, MatchingResponse, ScoreBreakdown
from app.services.rescue_request_service import get_rescue_request_or_404
from app.services.scoring import (
    compute_availability_score,
    compute_distance_score,
    compute_final_score,
    compute_response_rate_score,
    compute_skill_score,
    get_current_availability_status,
    get_matched_skills,
    haversine_distance_km,
)
from app.services.volunteer_service import list_active_volunteers


def rank_volunteers_for_rescue(db: Session, rescue_request_id: int) -> MatchingResponse:
    rescue_request = get_rescue_request_or_404(db, rescue_request_id)
    volunteers = list_active_volunteers(db)

    ranked_results: list[MatchedVolunteer] = []
    for volunteer in volunteers:
        distance_km = haversine_distance_km(
            rescue_request.latitude,
            rescue_request.longitude,
            volunteer.latitude,
            volunteer.longitude,
        )
        distance_score = compute_distance_score(distance_km)
        matched_skills = get_matched_skills(volunteer.skills, rescue_request.required_skills)
        skill_score = compute_skill_score(volunteer.skills, rescue_request.required_skills)
        availability_score = compute_availability_score(
            volunteer.availability_start,
            volunteer.availability_end,
        )
        availability_status = get_current_availability_status(
            volunteer.availability_start,
            volunteer.availability_end,
        )
        response_rate_score = compute_response_rate_score(
            volunteer.total_dispatches,
            volunteer.successful_responses,
        )
        final_score = compute_final_score(
            distance_score,
            skill_score,
            availability_score,
            response_rate_score,
        )

        score_breakdown = ScoreBreakdown(
            distance_score=distance_score,
            skill_score=skill_score,
            availability_score=availability_score,
            response_rate_score=response_rate_score,
            final_score=final_score,
        )

        ranked_results.append(
            MatchedVolunteer(
                volunteer_id=volunteer.id,
                volunteer_name=volunteer.name,
                phone=volunteer.phone,
                email=volunteer.email,
                final_score=final_score,
                distance_score=distance_score,
                skill_score=skill_score,
                availability_score=availability_score,
                response_rate_score=response_rate_score,
                matched_skills=matched_skills,
                distance_km=round(distance_km, 2),
                current_availability_status=availability_status,
                total_dispatches=volunteer.total_dispatches or 0,
                successful_responses=volunteer.successful_responses or 0,
                active_status=volunteer.active_status is not False,
                score_breakdown=score_breakdown,
            )
        )

    ranked_results.sort(
        key=lambda item: (-item.final_score, -item.skill_score, item.distance_km, item.volunteer_name.lower()),
    )

    return MatchingResponse(
        rescue_request_id=rescue_request.id,
        ranked_volunteers=ranked_results,
    )
