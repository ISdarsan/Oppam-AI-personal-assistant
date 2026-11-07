from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class Role(str, Enum):
    senior = "senior"
    helper = "helper"
    family = "family"


class Category(str, Enum):
    medicine = "medicine"
    grocery = "grocery"
    hospital_assistance = "hospital_assistance"
    transportation = "transportation"
    ration_shop = "ration_shop"
    bank = "bank"
    government_office = "government_office"
    other = "other"


class Priority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class RequestStatus(str, Enum):
    OPEN = "OPEN"
    ACCEPTED = "ACCEPTED"
    ON_THE_WAY = "ON_THE_WAY"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# ---- Auth ----
class DemoLoginRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    role: Role
    phone: Optional[str] = Field(None, max_length=20)
    area: Optional[str] = Field(None, max_length=80)

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class UserOut(BaseModel):
    user_id: str
    name: str
    role: Role
    area: Optional[str] = None


class DemoLoginResponse(UserOut):
    token: str
    note: str = "Demo login only: no password. Not production authentication."


# ---- Community requests ----
class RequestCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    category: Category
    description: str = Field("", max_length=1000)
    priority: Priority = Priority.normal
    location_hint: Optional[str] = Field(None, max_length=120, description="Optional approximate area only (e.g. town/ward), never an exact address")


class StatusUpdate(BaseModel):
    status: Literal["ON_THE_WAY", "COMPLETED", "CANCELLED"]


class RequestOut(BaseModel):
    request_id: str
    senior_id: str
    senior_name: str
    title: str
    category: Category
    description: str
    priority: Priority
    location_hint: Optional[str]
    status: RequestStatus
    helper_id: Optional[str]
    helper_name: Optional[str]
    created_at: datetime
    updated_at: datetime


class RequestList(BaseModel):
    requests: List[RequestOut]
    count: int


# ---- AI interpretation ----
class InterpretRequestIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500)
    language: str = Field("en", description="'en' or 'ml' (others best-effort)")


class InterpretedRequest(BaseModel):
    """Validated structure returned to the frontend for the senior to review. Nothing is created yet."""
    title: str = Field(..., min_length=1, max_length=120)
    category: Category
    description: str = Field("", max_length=1000)
    priority: Priority = Priority.normal
    requires_confirmation: bool = True


class InterpretRequestOut(BaseModel):
    interpreted: InterpretedRequest
    source: Literal["ollama", "fallback"]
    model_used: Optional[str] = None
    spoken_response: str
    created: bool = False  # always False: the frontend must call POST /api/community/requests after confirmation


# ---- Family ----
class InvitationOut(BaseModel):
    connection_id: int
    code: str
    status: str


class LinkIn(BaseModel):
    code: str = Field(..., min_length=4, max_length=12)


class ApproveIn(BaseModel):
    connection_id: int
    approve: bool = True  # False = reject


class RevokeIn(BaseModel):
    connection_id: int


class ConnectionOut(BaseModel):
    connection_id: int
    status: str
    senior_id: str
    senior_name: str
    family_id: Optional[str]
    family_name: Optional[str]
    code: Optional[str] = None  # only shown to the senior while still pending/invited
    created_at: datetime
    updated_at: datetime


# ---- SOS / notifications ----
class SOSIn(BaseModel):
    message: Optional[str] = Field(None, max_length=300)
    location_hint: Optional[str] = Field(None, max_length=120, description="Optional. Only include if the senior agreed to share it.")


class SOSOut(BaseModel):
    event_id: str
    senior_id: str
    senior_name: str
    message: Optional[str]
    location_hint: Optional[str]
    status: str
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[datetime]
    created_at: datetime
    notified_family_count: int = 0
    delivery: str = "in-app only (no SMS/WhatsApp/push/emergency-service integration)"


class NotificationOut(BaseModel):
    notification_id: str
    type: str
    message: str
    request_id: Optional[str]
    sos_id: Optional[str]
    is_read: bool
    created_at: datetime


class NotificationList(BaseModel):
    notifications: List[NotificationOut]
    unread_count: int


# ---- Reminders (today) ----
class ReminderItem(BaseModel):
    id: Optional[str] = None
    title: str
    category: str = "general"
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    completed: bool = False


class TodayRequest(BaseModel):
    reminders: List[ReminderItem]
    timezone: str = Field("Asia/Kolkata", description="IANA tz name of the user")
    now: Optional[str] = Field(None, description="Optional ISO timestamp override (mainly for tests)")
    language: str = "en"


class TodayResponse(BaseModel):
    date: str
    timezone: str
    pending: List[ReminderItem]
    completed: List[ReminderItem]
    spoken_response: str
