from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.rescue_request import RescueRequestRead
from app.schemas.volunteer import VolunteerRead


class DispatchLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rescue_request_id: int | None = None
    volunteer_id: int | None = None
    dispatch_status: str | None = None
    message_snapshot: str | None = None
    notes: str | None = None
    created_at: datetime | None = None
    volunteer: VolunteerRead | None = None
    rescue_request: RescueRequestRead | None = None
