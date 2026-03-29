import json
import logging
import re
from json import JSONDecodeError
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.schemas.ai import (
    AIAssistScopeRequest,
    MessageAssistRequest,
    MessageAssistResponse,
    RescueFormAssistRequest,
    RescueFormAssistResponse,
    SmartDispatchResponse,
    VolunteerRecommendationResponse,
)
from app.schemas.matching import MatchedVolunteer
from app.services.matching import rank_volunteers_for_rescue
from app.services.message_generator import build_dispatch_message
from app.services.rescue_request_service import get_rescue_request_or_404
from app.services.volunteer_service import get_volunteer_or_404


logger = logging.getLogger(__name__)
settings = get_settings()
_ALLOWED_STATUSES = {"contacted", "accepted", "completed", "declined"}
_ANIMAL_PATTERNS = {
    "dog": ["dog", "puppy", "canine"],
    "cat": ["cat", "kitten", "feline"],
    "bird": ["bird", "pigeon", "parrot", "crow", "owl"],
    "cow": ["cow", "calf"],
    "horse": ["horse", "foal"],
    "goat": ["goat", "kid"],
    "monkey": ["monkey", "langur"],
}
_SKILL_KEYWORDS = (
    ("water rescue", {"flood", "water", "river", "drain", "canal"}),
    ("first aid", {"injured", "bleeding", "hurt", "wound", "fracture"}),
    ("rescue extraction", {"stuck", "trapped", "roof", "tree", "ditch", "drain"}),
    ("transport", {"transport", "clinic", "hospital", "pickup", "move"}),
    ("dog handling", {"dog", "puppy", "canine"}),
    ("cat handling", {"cat", "kitten", "feline"}),
    ("bird handling", {"bird", "pigeon", "parrot", "owl", "crow"}),
)


def assist_rescue_form(payload: RescueFormAssistRequest) -> RescueFormAssistResponse:
    description = _resolve_rescue_description(payload)
    current_fields = _coerce_rescue_form_fields(payload.current_data)
    fallback = _fallback_rescue_form(description, current_fields)
    messages = [
        {
            "role": "system",
            "content": (
                "You are a rescue intake assistant. Review the current form values and optional page context, then "
                "return JSON only. Populate only rescue-form fields that are supported by the existing UI. "
                "Never invent coordinates or database identifiers. Use urgency 1 for low, 2 for moderate, "
                "3 for high, and 4 for critical. required_skills must be an array of short lowercase strings.\n\n"
                "Output schema:\n"
                "{\n"
                '  "fields": {"location": "...", "urgency": 1, "animal_type": "...", "required_skills": ["..."], "notes": "..."},\n'
                '  "message": "short visible summary for the coordinator",\n'
                '  "suggested_status": null,\n'
                '  "recommended_volunteer_id": null,\n'
                '  "explanation": "brief reason for the suggestions",\n'
                '  "warnings": ["..."]\n'
                "}"
            ),
        },
        {
            "role": "user",
            "content": _serialize_for_prompt(
                {
                    "scope": payload.scope,
                    "current_data": payload.current_data,
                    "context": payload.context,
                    "legacy_description": payload.description,
                }
            ),
        },
    ]
    ai_result = _call_model_json(messages)
    ai_fields = _coerce_rescue_form_fields(_extract_fields(ai_result))

    resolved_fields = {
        "location": ai_fields.get("location") or fallback.location,
        "animal_type": ai_fields.get("animal_type") or fallback.animal_type,
        "urgency": ai_fields.get("urgency") or fallback.urgency,
        "required_skills": ai_fields.get("required_skills") or fallback.required_skills,
        "notes": ai_fields.get("notes") or fallback.notes,
    }
    explanation = _clean_optional_text(_field_or_top_level(ai_result, "explanation"))
    message = _clean_optional_text(_field_or_top_level(ai_result, "message"))

    return RescueFormAssistResponse(
        location=resolved_fields["location"],
        animal_type=resolved_fields["animal_type"],
        urgency=resolved_fields["urgency"],
        required_skills=resolved_fields["required_skills"],
        notes=resolved_fields["notes"],
        fields=resolved_fields,
        message=message,
        suggested_status=None,
        recommended_volunteer_id=None,
        explanation=explanation or "Suggested rescue form updates based on the current intake details.",
        warnings=_normalize_warnings(ai_result, fallback_warning=ai_result is None),
    )


def recommend_volunteer(
    db: Session,
    rescue_request_id: int,
    payload: AIAssistScopeRequest,
) -> VolunteerRecommendationResponse:
    ranking = rank_volunteers_for_rescue(db, rescue_request_id)
    rescue_request = get_rescue_request_or_404(db, rescue_request_id)
    top_match = ranking.ranked_volunteers[0] if ranking.ranked_volunteers else None

    if top_match is None:
        reason = "No active volunteer currently meets the optimizer criteria for this rescue."
        return VolunteerRecommendationResponse(
            recommended_volunteer_id=None,
            recommendation_reason=reason,
            fields={},
            message=None,
            suggested_status=None,
            explanation=reason,
            warnings=["No eligible volunteer recommendation is available."],
        )

    fallback_reason = _build_recommendation_reason(top_match, rescue_request.location, rescue_request.urgency)
    messages = [
        {
            "role": "system",
            "content": (
                "You explain a dispatch recommendation to a rescue coordinator. The backend optimizer remains authoritative "
                "for the volunteer choice. Return JSON only.\n\n"
                "Output schema:\n"
                "{\n"
                '  "fields": {},\n'
                '  "message": "short visible summary",\n'
                '  "suggested_status": null,\n'
                '  "recommended_volunteer_id": 123,\n'
                '  "explanation": "brief explanation of why the recommendation fits",\n'
                '  "warnings": ["..."]\n'
                "}"
            ),
        },
        {
            "role": "user",
            "content": _serialize_for_prompt(
                {
                    "scope": payload.scope,
                    "current_data": payload.current_data,
                    "context": payload.context,
                    "rescue_request": _serialize_rescue_request(rescue_request),
                    "matches": [_serialize_match(match) for match in ranking.ranked_volunteers[:5]],
                    "optimizer_recommendation": _serialize_match(top_match),
                }
            ),
        },
    ]
    ai_result = _call_model_json(messages)
    explanation = (
        _clean_optional_text(_field_or_top_level(ai_result, "explanation"))
        or _clean_optional_text(_field_or_top_level(ai_result, "message"))
        or fallback_reason
    )

    return VolunteerRecommendationResponse(
        recommended_volunteer_id=top_match.volunteer_id,
        recommendation_reason=explanation,
        fields={},
        message=_clean_optional_text(_field_or_top_level(ai_result, "message")),
        suggested_status=None,
        explanation=explanation,
        warnings=_normalize_warnings(ai_result, fallback_warning=ai_result is None),
    )


def assist_message(
    db: Session,
    rescue_request_id: int,
    volunteer_id: int,
    payload: MessageAssistRequest,
) -> MessageAssistResponse:
    rescue_request = get_rescue_request_or_404(db, rescue_request_id)
    volunteer = get_volunteer_or_404(db, volunteer_id)
    ranking = rank_volunteers_for_rescue(db, rescue_request_id)
    selected_match = next((item for item in ranking.ranked_volunteers if item.volunteer_id == volunteer_id), None)

    fallback_message = payload.current_message.strip() if payload.current_message else build_dispatch_message(rescue_request, volunteer)
    messages = [
        {
            "role": "system",
            "content": (
                "You write concise dispatch outreach for rescue volunteers. Keep the draft operational and plain text. "
                "Return JSON only.\n\n"
                "Output schema:\n"
                "{\n"
                '  "fields": {},\n'
                '  "message": "complete outreach message text",\n'
                '  "suggested_status": null,\n'
                '  "recommended_volunteer_id": null,\n'
                '  "explanation": "brief reason for the wording",\n'
                '  "warnings": ["..."]\n'
                "}"
            ),
        },
        {
            "role": "user",
            "content": _serialize_for_prompt(
                {
                    "scope": payload.scope,
                    "current_data": payload.current_data,
                    "context": payload.context,
                    "rescue_request": _serialize_rescue_request(rescue_request),
                    "selected_volunteer": _serialize_volunteer(volunteer),
                    "selected_match": _serialize_match(selected_match),
                    "fallback_message": fallback_message,
                    "current_message": payload.current_message,
                }
            ),
        },
    ]
    ai_result = _call_model_json(messages)
    generated_message = (
        _clean_optional_text(_field_or_top_level(ai_result, "message"))
        or _clean_optional_text(_field_or_top_level(ai_result, "generated_message"))
        or fallback_message
    )

    return MessageAssistResponse(
        generated_message=generated_message,
        fields={"message": generated_message},
        message=generated_message,
        suggested_status=None,
        recommended_volunteer_id=volunteer_id,
        explanation=(
            _clean_optional_text(_field_or_top_level(ai_result, "explanation"))
            or "Updated dispatch draft using the current rescue and volunteer context."
        ),
        warnings=_normalize_warnings(ai_result, fallback_warning=ai_result is None),
    )


def smart_dispatch(
    db: Session,
    rescue_request_id: int,
    payload: AIAssistScopeRequest,
) -> SmartDispatchResponse:
    rescue_request = get_rescue_request_or_404(db, rescue_request_id)
    ranking = rank_volunteers_for_rescue(db, rescue_request_id)
    top_match = ranking.ranked_volunteers[0] if ranking.ranked_volunteers else None

    if top_match is None:
        rationale = "No active volunteers qualified under the current optimizer criteria."
        message = "No ranked volunteer is available for automatic preparation. Review the queue and assign manually if needed."
        suggested_notes = "No active volunteer recommendation available."
        return SmartDispatchResponse(
            volunteer_id=None,
            message=message,
            suggested_status="contacted",
            suggested_notes=suggested_notes,
            rationale=rationale,
            fields={"message": message, "dispatch_status": "contacted", "notes": suggested_notes},
            recommended_volunteer_id=None,
            explanation=rationale,
            warnings=["No eligible volunteer recommendation is available."],
        )

    volunteer = get_volunteer_or_404(db, top_match.volunteer_id)
    fallback_message = build_dispatch_message(rescue_request, volunteer)
    fallback_status = _fallback_dispatch_status(rescue_request.urgency, top_match)
    fallback_notes = _fallback_dispatch_notes(rescue_request.location, top_match)
    fallback_rationale = _build_recommendation_reason(top_match, rescue_request.location, rescue_request.urgency)
    messages = [
        {
            "role": "system",
            "content": (
                "You prepare an editable dispatch panel for a rescue coordinator. The backend optimizer remains authoritative "
                "for the volunteer choice. Return JSON only. suggested_status must be one of contacted, accepted, completed, "
                "or declined. Use conservative recommendations.\n\n"
                "Output schema:\n"
                "{\n"
                '  "fields": {"notes": "..."},\n'
                '  "message": "dispatch message",\n'
                '  "suggested_status": "contacted",\n'
                '  "recommended_volunteer_id": 123,\n'
                '  "explanation": "brief explanation for the preparation",\n'
                '  "warnings": ["..."]\n'
                "}"
            ),
        },
        {
            "role": "user",
            "content": _serialize_for_prompt(
                {
                    "scope": payload.scope,
                    "current_data": payload.current_data,
                    "context": payload.context,
                    "rescue_request": _serialize_rescue_request(rescue_request),
                    "recommended_volunteer": _serialize_volunteer(volunteer),
                    "recommended_match": _serialize_match(top_match),
                    "matches": [_serialize_match(match) for match in ranking.ranked_volunteers[:5]],
                    "fallback_message": fallback_message,
                    "fallback_status": fallback_status,
                    "fallback_notes": fallback_notes,
                }
            ),
        },
    ]
    ai_result = _call_model_json(messages)
    ai_fields = _extract_fields(ai_result)
    resolved_message = _clean_optional_text(_field_or_top_level(ai_result, "message")) or fallback_message
    resolved_status = _sanitize_status(_field_or_top_level(ai_result, "suggested_status")) or fallback_status
    resolved_notes = (
        _clean_optional_text(ai_fields.get("notes"))
        or _clean_optional_text(_field_or_top_level(ai_result, "suggested_notes"))
        or fallback_notes
    )
    resolved_rationale = (
        _clean_optional_text(_field_or_top_level(ai_result, "explanation"))
        or _clean_optional_text(_field_or_top_level(ai_result, "rationale"))
        or fallback_rationale
    )

    return SmartDispatchResponse(
        volunteer_id=top_match.volunteer_id,
        message=resolved_message,
        suggested_status=resolved_status,
        suggested_notes=resolved_notes,
        rationale=resolved_rationale,
        fields={"message": resolved_message, "dispatch_status": resolved_status, "notes": resolved_notes},
        recommended_volunteer_id=top_match.volunteer_id,
        explanation=resolved_rationale,
        warnings=_normalize_warnings(ai_result, fallback_warning=ai_result is None),
    )


def call_ai(messages: list[dict[str, str]]) -> str | None:
    if not settings.openai_api_key:
        return None

    chat_payload = {
        "model": settings.openai_model,
        "messages": [{"role": item["role"], "content": item["content"]} for item in messages],
        "temperature": 0.2,
    }
    chat_response = _send_ai_request("chat/completions", chat_payload)
    chat_text = _extract_chat_completion_text(chat_response)
    if chat_text:
        return chat_text

    responses_payload = {
        "model": settings.openai_model,
        "input": [{"role": item["role"], "content": item["content"]} for item in messages],
        "max_output_tokens": 1200,
        "store": False,
    }
    responses_response = _send_ai_request("responses", responses_payload)
    return _extract_output_text(responses_response)


def _fallback_rescue_form(description: str, current_fields: dict[str, Any]) -> RescueFormAssistResponse:
    lowered = description.lower()
    animal_type = current_fields.get("animal_type") or next(
        (
            animal
            for animal, keywords in _ANIMAL_PATTERNS.items()
            if any(keyword in lowered for keyword in keywords)
        ),
        None,
    )

    skills = list(current_fields.get("required_skills") or [])
    for skill, keywords in _SKILL_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            skills.append(skill)

    if animal_type == "dog":
        skills.append("dog handling")
    elif animal_type == "cat":
        skills.append("cat handling")
    elif animal_type == "bird":
        skills.append("bird handling")

    urgency = current_fields.get("urgency") or 2
    if current_fields.get("urgency") is None:
        if any(keyword in lowered for keyword in {"critical", "severe", "bleeding", "unconscious", "fire"}):
            urgency = 4
        elif any(keyword in lowered for keyword in {"urgent", "flood", "injured", "accident", "hit", "trapped"}):
            urgency = 3
        elif any(keyword in lowered for keyword in {"safe", "stray", "routine", "seen"}):
            urgency = 1

    resolved_fields = {
        "location": current_fields.get("location") or _extract_location(description),
        "animal_type": animal_type,
        "urgency": urgency,
        "required_skills": _normalize_skills(skills),
        "notes": current_fields.get("notes") or description,
    }

    return RescueFormAssistResponse(
        location=resolved_fields["location"],
        animal_type=resolved_fields["animal_type"],
        urgency=resolved_fields["urgency"],
        required_skills=resolved_fields["required_skills"],
        notes=resolved_fields["notes"],
        fields=resolved_fields,
        message="Fallback rescue suggestions prepared from the current intake details.",
        suggested_status=None,
        recommended_volunteer_id=None,
        explanation="AI was unavailable, so a deterministic rescue-form fallback was used.",
        warnings=["AI unavailable; deterministic rescue-form fallback applied."],
    )


def _call_model_json(messages: list[dict[str, str]]) -> dict[str, Any] | None:
    response_text = call_ai(messages)
    if not response_text:
        return None

    try:
        return _extract_json_object(response_text)
    except (JSONDecodeError, ValueError) as exc:
        logger.warning("AI response was not valid JSON: %s", exc)
        return None


def _send_ai_request(path: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    request = Request(
        url=f"{settings.openai_base_url.rstrip('/')}/{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=settings.openai_timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.warning("AI request to %s failed with HTTP %s: %s", path, exc.code, detail[:500])
        return None
    except (URLError, OSError, TimeoutError, JSONDecodeError) as exc:
        logger.warning("AI request to %s failed: %s", path, exc)
        return None


def _extract_chat_completion_text(response_payload: dict[str, Any] | None) -> str:
    if not isinstance(response_payload, dict):
        return ""

    choices = response_payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    message = choices[0].get("message")
    if not isinstance(message, dict):
        return ""

    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        fragments = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    fragments.append(text.strip())
        return "\n".join(fragments).strip()
    return ""


def _extract_output_text(response_payload: dict[str, Any] | None) -> str:
    if not isinstance(response_payload, dict):
        return ""

    output_text = response_payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    for item in response_payload.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            text = content.get("text")
            if isinstance(text, str) and text.strip():
                return text.strip()
    return ""


def _extract_json_object(value: str) -> dict[str, Any]:
    decoder = json.JSONDecoder()
    for index, character in enumerate(value):
        if character not in "[{":
            continue
        candidate = value[index:]
        try:
            parsed, _ = decoder.raw_decode(candidate)
        except ValueError:
            continue
        if isinstance(parsed, dict):
            return parsed
    raise ValueError("No JSON object found in response")


def _extract_location(description: str) -> str:
    normalized = _normalize_text(description)
    match = re.search(r"\b(?:at|near|on)\s+(.+)$", normalized, re.IGNORECASE)
    if match:
        return match.group(1).strip(" .,")
    return normalized


def _build_recommendation_reason(match: MatchedVolunteer, location: str, urgency: int | None) -> str:
    urgency_text = f"urgency {urgency}" if urgency is not None else "the current urgency"
    skills = ", ".join(match.matched_skills) if match.matched_skills else "general rescue fit"
    return (
        f"{match.volunteer_name} is the strongest recommendation for {location} because they have the highest optimizer score, "
        f"cover {skills}, and can reach the rescue from {match.distance_km} km away with {match.current_availability_status} availability for {urgency_text}."
    )


def _fallback_dispatch_status(urgency: int | None, match: MatchedVolunteer) -> str:
    if urgency == 4 and match.current_availability_status == "available":
        return "contacted"
    if match.current_availability_status == "available" and match.final_score >= 80:
        return "contacted"
    return "contacted"


def _fallback_dispatch_notes(location: str, match: MatchedVolunteer) -> str:
    matched_skills = ", ".join(match.matched_skills) if match.matched_skills else "broad rescue fit"
    return (
        f"Prepared from optimizer recommendation for {location}. Top match due to {matched_skills}, "
        f"{match.current_availability_status} availability, and {match.distance_km} km travel distance."
    )


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _clean_optional_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = _normalize_text(value)
    return normalized[:5000] if normalized else None


def _normalize_skills(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return sorted({str(skill).strip().lower() for skill in value if str(skill).strip()})


def _coerce_urgency(value: object) -> int | None:
    try:
        urgency = int(value)
    except (TypeError, ValueError):
        return None
    return urgency if 1 <= urgency <= 4 else None


def _sanitize_status(value: object) -> str | None:
    cleaned = _clean_optional_text(value)
    if cleaned and cleaned in _ALLOWED_STATUSES:
        return cleaned
    return None


def _coerce_int(value: object) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _serialize_for_prompt(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True, indent=2, default=str)


def _extract_fields(ai_result: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(ai_result, dict):
        return {}
    fields = ai_result.get("fields")
    return fields if isinstance(fields, dict) else {}


def _field_or_top_level(ai_result: dict[str, Any] | None, key: str) -> Any:
    if not isinstance(ai_result, dict):
        return None
    fields = _extract_fields(ai_result)
    if key in fields:
        return fields.get(key)
    return ai_result.get(key)


def _normalize_skill_input(value: object) -> list[str]:
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _coerce_rescue_form_fields(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    return {
        "location": _clean_optional_text(value.get("location")),
        "animal_type": _clean_optional_text(value.get("animal_type")),
        "urgency": _coerce_urgency(value.get("urgency")),
        "required_skills": _normalize_skills(_normalize_skill_input(value.get("required_skills"))),
        "notes": _clean_optional_text(value.get("notes")),
    }


def _resolve_rescue_description(payload: RescueFormAssistRequest) -> str:
    current_data = payload.current_data if isinstance(payload.current_data, dict) else {}
    description = (
        payload.description
        or _clean_optional_text(current_data.get("description"))
        or _clean_optional_text(current_data.get("summary"))
        or _clean_optional_text(current_data.get("notes"))
    )
    if description:
        return description

    fallback_parts = []
    for key in ("location", "animal_type", "notes"):
        value = _clean_optional_text(current_data.get(key))
        if value:
            fallback_parts.append(f"{key}: {value}")
    if fallback_parts:
        return "; ".join(fallback_parts)
    return "Rescue details not provided."


def _normalize_warnings(ai_result: dict[str, Any] | None, fallback_warning: bool = False) -> list[str]:
    warnings = []
    if isinstance(ai_result, dict):
        raw_warnings = ai_result.get("warnings")
        if isinstance(raw_warnings, list):
            warnings = [str(item).strip() for item in raw_warnings if str(item).strip()]
    if fallback_warning and not warnings:
        warnings.append("AI unavailable; deterministic fallback applied.")
    return warnings


def _serialize_rescue_request(rescue_request: Any) -> dict[str, Any]:
    return {
        "id": rescue_request.id,
        "location": rescue_request.location,
        "latitude": rescue_request.latitude,
        "longitude": rescue_request.longitude,
        "animal_type": rescue_request.animal_type,
        "urgency": rescue_request.urgency,
        "required_skills": rescue_request.required_skills or [],
        "notes": rescue_request.notes,
        "status": rescue_request.status,
    }


def _serialize_match(match: MatchedVolunteer | None) -> dict[str, Any] | None:
    if match is None:
        return None
    return {
        "volunteer_id": match.volunteer_id,
        "volunteer_name": match.volunteer_name,
        "phone": match.phone,
        "email": match.email,
        "final_score": match.final_score,
        "distance_score": match.distance_score,
        "skill_score": match.skill_score,
        "availability_score": match.availability_score,
        "response_rate_score": match.response_rate_score,
        "matched_skills": match.matched_skills,
        "distance_km": match.distance_km,
        "current_availability_status": match.current_availability_status,
        "successful_responses": match.successful_responses,
        "total_dispatches": match.total_dispatches,
    }


def _serialize_volunteer(volunteer: Any) -> dict[str, Any]:
    return {
        "id": volunteer.id,
        "name": volunteer.name,
        "phone": volunteer.phone,
        "email": volunteer.email,
        "latitude": volunteer.latitude,
        "longitude": volunteer.longitude,
        "skills": volunteer.skills or [],
        "availability_start": str(volunteer.availability_start) if volunteer.availability_start is not None else None,
        "availability_end": str(volunteer.availability_end) if volunteer.availability_end is not None else None,
        "successful_responses": volunteer.successful_responses,
        "total_dispatches": volunteer.total_dispatches,
        "active_status": volunteer.active_status,
    }
