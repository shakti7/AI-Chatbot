from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    session_id: str
    message: str
    temperature: Optional[float] = 0.4
    max_output_tokens: Optional[int] = 2048
