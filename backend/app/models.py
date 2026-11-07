from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g. senior_001
    name: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(10), index=True)  # senior | helper | family
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    area: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CommunityRequest(Base):
    __tablename__ = "community_requests"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    senior_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(30), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(10), default="normal")
    location_hint: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(15), default="OPEN", index=True)
    helper_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    senior: Mapped[User] = relationship(foreign_keys=[senior_id])
    helper: Mapped[User | None] = relationship(foreign_keys=[helper_id])


class FamilyConnection(Base):
    __tablename__ = "family_connections"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    senior_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    family_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(10), default="INVITED")  # INVITED | PENDING | APPROVED | REVOKED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    senior: Mapped[User] = relationship(foreign_keys=[senior_id])
    family: Mapped[User | None] = relationship(foreign_keys=[family_id])


class SOSEvent(Base):
    __tablename__ = "sos_events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    senior_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str | None] = mapped_column(String(300), nullable=True)
    location_hint: Mapped[str | None] = mapped_column(String(120), nullable=True)  # only if senior chose to share
    status: Mapped[str] = mapped_column(String(15), default="ACTIVE")  # ACTIVE | ACKNOWLEDGED
    acknowledged_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(30))
    message: Mapped[str] = mapped_column(String(300))
    request_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sos_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


Index("ix_notifications_user_read", Notification.user_id, Notification.is_read)
