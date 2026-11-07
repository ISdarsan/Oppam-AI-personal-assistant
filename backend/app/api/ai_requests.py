from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import APIRouter, Depends, status
from ..deps import api_error, get_current_user, require_role
from ..models import User
from ..schemas.community import InterpretRequestIn, InterpretRequestOut, TodayRequest, TodayResponse
from ..services.request_interpreter import interpret

router = APIRouter(tags=["AI Helpers"])


@router.post("/ai/interpret-request", response_model=InterpretRequestOut)
async def interpret_request(body: InterpretRequestIn, user: User = Depends(require_role("senior"))):
    """Draft only. The frontend must show this to the senior and call POST /api/community/requests after they confirm."""
    return await interpret(body.text, body.language)


@router.post("/reminders/today", response_model=TodayResponse)
def reminders_today(body: TodayRequest, user: User = Depends(get_current_user)):
    """'What do I need to do today?' Reminders are stored on the device, so the client sends them; the server picks
    the ones dated today in the user's own timezone (default Asia/Kolkata) and builds a spoken summary."""
    try:
        tz = ZoneInfo(body.timezone)
    except (ZoneInfoNotFoundError, ValueError, KeyError):
        raise api_error(status.HTTP_422_UNPROCESSABLE_ENTITY, "BAD_TIMEZONE", f"Unknown timezone '{body.timezone}'.",
                        "Use an IANA name such as Asia/Kolkata.")
    try:
        now = datetime.fromisoformat(body.now.replace("Z", "+00:00")) if body.now else datetime.now(tz)
    except ValueError:
        raise api_error(status.HTTP_422_UNPROCESSABLE_ENTITY, "BAD_TIMESTAMP", "'now' is not a valid ISO timestamp.")
    now = now.astimezone(tz) if now.tzinfo else now.replace(tzinfo=tz)
    today = now.date().isoformat()
    todays = sorted((r for r in body.reminders if r.date == today), key=lambda r: r.time)
    pending = [r for r in todays if not r.completed]
    done = [r for r in todays if r.completed]
    if body.language == "ml":
        text = (f"ഇന്ന് {len(pending)} കാര്യങ്ങൾ ബാക്കിയുണ്ട്: " + ", ".join(f"{r.time} {r.title}" for r in pending)
                if pending else "ഇന്ന് ബാക്കി ഓർമ്മപ്പെടുത്തലുകൾ ഒന്നുമില്ല.")
    else:
        text = (f"You have {len(pending)} thing{'s' if len(pending) != 1 else ''} left today: "
                + ", ".join(f"{r.title} at {r.time}" for r in pending) + "."
                if pending else "You have nothing left to do today.")
    return TodayResponse(date=today, timezone=body.timezone, pending=pending, completed=done, spoken_response=text)
