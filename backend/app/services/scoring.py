from datetime import datetime, time
from math import asin, cos, radians, sin, sqrt


DISTANCE_SCORE_BANDS: tuple[tuple[float, float], ...] = (
    (5.0, 100.0),
    (15.0, 90.0),
    (30.0, 75.0),
    (50.0, 60.0),
    (80.0, 40.0),
    (120.0, 20.0),
)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(radians, [lat1, lon1, lat2, lon2])

    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad

    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return earth_radius_km * c


def normalize_skills(skills: list[str] | None) -> list[str]:
    if not skills:
        return []
    return sorted({skill.strip().lower() for skill in skills if skill and skill.strip()})


def compute_distance_score(distance_km: float) -> float:
    for upper_bound, score in DISTANCE_SCORE_BANDS:
        if distance_km <= upper_bound:
            return score
    return 0.0


def get_matched_skills(volunteer_skills: list[str] | None, required_skills: list[str] | None) -> list[str]:
    volunteer_skill_set = set(normalize_skills(volunteer_skills))
    required_skill_set = set(normalize_skills(required_skills))
    return sorted(volunteer_skill_set & required_skill_set)


def compute_skill_score(volunteer_skills: list[str] | None, required_skills: list[str] | None) -> float:
    normalized_required_skills = normalize_skills(required_skills)
    if not normalized_required_skills:
        return 100.0

    matched_skills = get_matched_skills(volunteer_skills, normalized_required_skills)
    return round((len(matched_skills) / len(normalized_required_skills)) * 100.0, 2)


def get_current_availability_status(
    availability_start: time | None,
    availability_end: time | None,
    reference_time: time | None = None,
) -> str:
    if availability_start is None or availability_end is None:
        return "unknown"

    current_time = reference_time or datetime.now().time().replace(microsecond=0)

    if availability_start <= availability_end:
        is_available = availability_start <= current_time <= availability_end
    else:
        is_available = current_time >= availability_start or current_time <= availability_end

    return "available" if is_available else "outside_window"


def compute_availability_score(
    availability_start: time | None,
    availability_end: time | None,
    reference_time: time | None = None,
) -> float:
    status = get_current_availability_status(availability_start, availability_end, reference_time)
    return 100.0 if status == "available" else 0.0


def compute_response_rate_score(total_dispatches: int | None, successful_responses: int | None) -> float:
    total = total_dispatches or 0
    successful = successful_responses or 0
    if total <= 0:
        return 0.0
    return round((successful / total) * 100.0, 2)


def compute_final_score(
    distance_score: float,
    skill_score: float,
    availability_score: float,
    response_rate_score: float,
) -> float:
    final_score = (
        0.30 * distance_score
        + 0.35 * skill_score
        + 0.20 * availability_score
        + 0.15 * response_rate_score
    )
    return round(final_score, 2)
