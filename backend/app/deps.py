"""Shared helpers: demo auth, role guards, error format, notifications, linked-family lookups."""
import uuid
from typing import Iterable
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import get_db
from .models import FamilyConnection, Notification, User


def api_error(http_status: int, code: str, message: str, suggestion: str | None = None) -> HTTPException:
    """Same detail shape as the existing endpoints: {code, message, suggestion}."""
    return HTTPException(status_code=http_status, detail={"code": code, "message": message, "suggestion": suggestion})


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise api_error(status.HTTP_401_UNAUTHORIZED, "UNAUTHENTICATED", "Missing bearer token.",
                        "Call POST /api/demo/login and send 'Authorization: Bearer <token>'.")
    token = authorization[7:].strip()
    user = db.scalar(select(User).where(User.token == token))
    if not user:
        raise api_error(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "Unknown or expired token.",
                        "Log in again with POST /api/demo/login.")
    return user


def require_role(*roles: str):
    def guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise api_error(status.HTTP_403_FORBIDDEN, "FORBIDDEN_ROLE",
                            f"This action requires role: {' or '.join(roles)}. You are '{user.role}'.")
        return user
    return guard


def approved_family_ids(db: Session, senior_id: str) -> list[str]:
    rows = db.scalars(select(FamilyConnection.family_id).where(
        FamilyConnection.senior_id == senior_id, FamilyConnection.status == "APPROVED",
        FamilyConnection.family_id.is_not(None)))
    return list(rows)


def approved_senior_ids(db: Session, family_id: str) -> list[str]:
    return list(db.scalars(select(FamilyConnection.senior_id).where(
        FamilyConnection.family_id == family_id, FamilyConnection.status == "APPROVED")))


def notify(db: Session, user_ids: Iterable[str], type_: str, message: str,
           request_id: str | None = None, sos_id: str | None = None) -> None:
    """Queue in-app notifications (committed with the caller's transaction)."""
    for uid in set(user_ids):
        db.add(Notification(id=new_id("ntf"), user_id=uid, type=type_, message=message,
                            request_id=request_id, sos_id=sos_id))
