from datetime import datetime
from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import api_error, approved_family_ids, approved_senior_ids, get_current_user, new_id, notify, require_role
from ..models import Notification, SOSEvent, User, utcnow
from ..schemas.community import NotificationList, NotificationOut, SOSIn, SOSOut

router = APIRouter(tags=["SOS & Notifications"])


def _sos_out(e: SOSEvent, senior_name: str, notified: int = 0) -> SOSOut:
    return SOSOut(event_id=e.id, senior_id=e.senior_id, senior_name=senior_name, message=e.message,
                  location_hint=e.location_hint, status=e.status, acknowledged_by=e.acknowledged_by,
                  acknowledged_at=e.acknowledged_at, created_at=e.created_at, notified_family_count=notified)


@router.post("/sos", response_model=SOSOut, status_code=201)
def trigger_sos(body: SOSIn | None = None, user: User = Depends(require_role("senior")), db: Session = Depends(get_db)):
    """Creates an in-app emergency event and notifies approved family members.
    This does NOT call emergency services or send SMS/WhatsApp/push."""
    body = body or SOSIn()
    event = SOSEvent(id=new_id("sos"), senior_id=user.id, message=body.message, location_hint=body.location_hint)
    db.add(event)
    family = approved_family_ids(db, user.id)
    notify(db, family, "SOS_TRIGGERED", f"SOS from {user.name}" + (f": {body.message}" if body.message else ""),
           sos_id=event.id)
    db.commit()
    return _sos_out(event, user.name, len(family))


@router.get("/sos")
def list_sos(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """senior: own SOS events. family: SOS events of approved linked seniors."""
    if user.role == "senior":
        ids = [user.id]
    elif user.role == "family":
        ids = approved_senior_ids(db, user.id)
    else:
        raise api_error(status.HTTP_403_FORBIDDEN, "FORBIDDEN_ROLE", "Helpers cannot view SOS events.")
    rows = db.execute(select(SOSEvent, User.name).join(User, User.id == SOSEvent.senior_id)
                      .where(SOSEvent.senior_id.in_(ids)).order_by(SOSEvent.created_at.desc())).all()
    return {"events": [_sos_out(e, n) for e, n in rows], "count": len(rows)}


@router.post("/sos/{event_id}/acknowledge", response_model=SOSOut)
def acknowledge_sos(event_id: str, user: User = Depends(require_role("family")), db: Session = Depends(get_db)):
    event = db.get(SOSEvent, event_id)
    if not event or event.senior_id not in approved_senior_ids(db, user.id):
        # same answer for "missing" and "not yours" so ids can't be probed
        raise api_error(status.HTTP_404_NOT_FOUND, "SOS_NOT_FOUND", "No such SOS event for your linked seniors.")
    db.execute(update(SOSEvent).where(SOSEvent.id == event_id, SOSEvent.status == "ACTIVE")
               .values(status="ACKNOWLEDGED", acknowledged_by=user.id, acknowledged_at=utcnow()))
    senior = db.get(User, event.senior_id)
    if event.status == "ACTIVE":
        notify(db, [event.senior_id], "SOS_ACKNOWLEDGED", f"{user.name} saw your SOS alert.", sos_id=event.id)
    db.commit()
    db.refresh(event)
    return _sos_out(event, senior.name)


@router.get("/notifications", response_model=NotificationList)
def list_notifications(unread_only: bool = False, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Poll this endpoint (e.g. every 5-10s) for in-app notifications."""
    q = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    rows = db.scalars(q.order_by(Notification.created_at.desc()).limit(100)).all()
    unread = db.scalars(select(Notification.id).where(Notification.user_id == user.id, Notification.is_read.is_(False))).all()
    return NotificationList(
        notifications=[NotificationOut(notification_id=n.id, type=n.type, message=n.message, request_id=n.request_id,
                                       sos_id=n.sos_id, is_read=n.is_read, created_at=n.created_at) for n in rows],
        unread_count=len(unread))


@router.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise api_error(status.HTTP_404_NOT_FOUND, "NOTIFICATION_NOT_FOUND", "No such notification.")
    n.is_read = True
    db.commit()
    return NotificationOut(notification_id=n.id, type=n.type, message=n.message, request_id=n.request_id,
                           sos_id=n.sos_id, is_read=n.is_read, created_at=n.created_at)
