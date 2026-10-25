from pydantic import BaseModel, Field
from typing import Optional

class AssistantInterpretRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500, description="User spoken or typed input")
    language: str = Field("en", description="User preferred language: 'en' or 'ml'")
    user_time: Optional[str] = Field(None, description="ISO timestamp of user local time for relative date/time context")

class ReminderIntentData(BaseModel):
    title: str
    date: Optional[str] = None  # YYYY-MM-DD
    time: Optional[str] = None  # HH:MM in 24hr format
    description: Optional[str] = None
    requires_confirmation: bool = True

class AssistantInterpretResponse(BaseModel):
    intent: str  # "create_reminder" | "view_reminders" | "explain_message" | "general_qa" | "clarification_needed" | "unknown"
    spoken_response: str
    reminder_data: Optional[ReminderIntentData] = None
    clarification_prompt: Optional[str] = None
    model_used: str
    confidence: float = 1.0
