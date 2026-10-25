from pydantic import BaseModel, Field
from typing import List

class MessageExplainRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Pasted message or notice text")
    language: str = Field("en", description="Target language: 'en' or 'ml'")

class MessageExplainResponse(BaseModel):
    simple_summary: str
    key_details: List[str]
    action_items: List[str]
    warnings_and_checks: List[str]
    is_suspicious: bool = False
    model_used: str
