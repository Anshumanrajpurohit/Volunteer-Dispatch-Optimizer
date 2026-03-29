from app.models.rescue_request import RescueRequest
from app.models.volunteer import Volunteer


URGENCY_LABELS = {
    1: "low",
    2: "moderate",
    3: "high",
    4: "critical",
}


def build_dispatch_message(rescue_request: RescueRequest, volunteer: Volunteer) -> str:
    urgency_label = URGENCY_LABELS.get(rescue_request.urgency, f"level {rescue_request.urgency}")
    skills_text = ", ".join(rescue_request.required_skills) if rescue_request.required_skills else "general handling"
    notes_text = rescue_request.notes or "No additional notes provided."
    animal_type = rescue_request.animal_type or "animal"

    return (
        f"Hi {volunteer.name}, a {urgency_label} urgency {animal_type} rescue needs support at "
        f"{rescue_request.location}. Required skills: {skills_text}. Notes: {notes_text} "
        "Please confirm if you can respond."
    )
