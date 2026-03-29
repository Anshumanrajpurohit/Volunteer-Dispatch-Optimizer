from pydantic import BaseModel


class MessageDraftResponse(BaseModel):
    rescue_request_id: int
    volunteer_id: int
    volunteer_name: str
    message: str
