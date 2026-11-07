import secrets
from fastapi import APIRouter, Depends, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import api_error, approved_senior_ids, get_current_user, notify, require_role
from ..models import CommunityRequest, FamilyConnection, SOSEvent, User
from ..schemas.community import ApproveIn, ConnectionOut, InvitationOut, LinkIn, RevokeIn

router = APIRouter(prefix="/family", tags=["Family Connect"])

_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no look-alike characters


def _conn_out(c: FamilyConnection, viewer: User) -> ConnectionOut:
    show_code = viewer.role == "senior" and c.status in ("INVITED", "PENDING")
    return ConnectionOut(connection_id=c.id, status=c.status, senior_id=c.senior_id, senior_name=c.senior.name,
                         family_id=c.family_id, family_name=c.family.name if c.family else None,
                         code=c.code if show_code else None, created_at=c.created_at, updated_at=c.updated_at)


@router.post("/invitation", response_model=InvitationOut, status_code=201)
def create_invitation(user: User = Depends(require_role("senior")), db: Session = Depends(get_db)):
    """Senior generates a one-time invitation code to give to a family member."""
    for _ in range(10):
        code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
        if not db.scalar(select(FamilyConnection.id).where(FamilyConnection.code == code)):
            break
    conn = FamilyConnection(senior_id=user.id, code=code, status="INVITED")
    db.add(conn)
    db.commit()
    return InvitationOut(connection_id=conn.id, code=conn.code, status=conn.status)


@router.post("/link", response_model=ConnectionOut)
def link_with_code(body: LinkIn, user: User = Depends(require_role("family")), db: Session = Depends(get_db)):
    """Family member submits the code. The link stays PENDING until the senior approves it."""
    conn = db.scalar(select(FamilyConnection).where(FamilyConnection.code == body.code.strip().upper()))
    if not conn or conn.status != "INVITED":
        raise api_error(status.HTTP_404_NOT_FOUND, "INVALID_CODE", "This invitation code is invalid or already used.",
                        "Ask the senior to generate a new code.")
    conn.family_id = user.id
    conn.status = "PENDING"
    notify(db, [conn.senior_id], "FAMILY_LINK_REQUESTED", f"{user.name} wants to connect as family. Please approve or reject.")
    db.commit()
    db.refresh(conn)
    return _conn_out(conn, user)


@router.post("/approve", response_model=ConnectionOut)
def approve_link(body: ApproveIn, user: User = Depends(require_role("senior")), db: Session = Depends(get_db)):
    """Senior approves (or rejects) a pending family connection."""
    conn = db.get(FamilyConnection, body.connection_id)
    if not conn or conn.senior_id != user.id:
        raise api_error(status.HTTP_404_NOT_FOUND, "CONNECTION_NOT_FOUND", "No such connection for this senior.")
    if conn.status != "PENDING":
        raise api_error(status.HTTP_409_CONFLICT, "NOT_PENDING", f"Connection is {conn.status}, not PENDING.")
    conn.status = "APPROVED" if body.approve else "REVOKED"
    notify(db, [conn.family_id], "FAMILY_LINK_APPROVED" if body.approve else "FAMILY_LINK_REJECTED",
           f"{user.name} {'approved' if body.approve else 'declined'} your connection.")
    db.commit()
    db.refresh(conn)
    return _conn_out(conn, user)


@router.post("/revoke", response_model=ConnectionOut)
def revoke_link(body: RevokeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Either side (senior or the linked family member) can end the relationship at any time."""
    conn = db.get(FamilyConnection, body.connection_id)
    if not conn or user.id not in (conn.senior_id, conn.family_id):
        raise api_error(status.HTTP_404_NOT_FOUND, "CONNECTION_NOT_FOUND", "No such connection for this user.")
    conn.status = "REVOKED"
    other = conn.family_id if user.id == conn.senior_id else conn.senior_id
    if other:
        notify(db, [other], "FAMILY_LINK_REVOKED", f"{user.name} ended the family connection.")
    db.commit()
    db.refresh(conn)
    return _conn_out(conn, user)


@router.get("/linked-senior")
def linked_seniors(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """family: connections to seniors (pending + approved). senior: own family connections (incl. pending to approve)."""
    if user.role == "family":
        q = select(FamilyConnection).where(FamilyConnection.family_id == user.id, FamilyConnection.status != "REVOKED")
    elif user.role == "senior":
        q = select(FamilyConnection).where(FamilyConnection.senior_id == user.id, FamilyConnection.status != "REVOKED")
    else:
        raise api_error(status.HTTP_403_FORBIDDEN, "FORBIDDEN_ROLE", "Helpers have no family connections.")
    conns = db.scalars(q.order_by(FamilyConnection.created_at.desc())).all()
    return {"connections": [_conn_out(c, user) for c in conns], "count": len(conns)}


@router.get("/updates")
def family_updates(senior_id: str | None = None, user: User = Depends(require_role("family")),
                   db: Session = Depends(get_db)):
    """Permitted updates for APPROVED linked seniors only: request title/category/status/helper and SOS events.
    Request descriptions and locations are deliberately NOT shared with family."""
    allowed = approved_senior_ids(db, user.id)
    if senior_id:
        if senior_id not in allowed:
            raise api_error(status.HTTP_403_FORBIDDEN, "NOT_LINKED", "You are not an approved family member of this senior.")
        allowed = [senior_id]
    if not allowed:
        return {"seniors": [], "requests": [], "sos_events": []}
    seniors = db.scalars(select(User).where(User.id.in_(allowed))).all()
    reqs = db.scalars(select(CommunityRequest).where(CommunityRequest.senior_id.in_(allowed))
                      .order_by(CommunityRequest.updated_at.desc()).limit(50)).all()
    sos = db.scalars(select(SOSEvent).where(SOSEvent.senior_id.in_(allowed))
                     .order_by(SOSEvent.created_at.desc()).limit(20)).all()
    return {
        "seniors": [{"senior_id": s.id, "name": s.name} for s in seniors],
        "requests": [{"request_id": r.id, "senior_id": r.senior_id, "title": r.title, "category": r.category,
                      "status": r.status, "helper_name": r.helper.name if r.helper else None,
                      "updated_at": r.updated_at} for r in reqs],
        "sos_events": [{"event_id": e.id, "senior_id": e.senior_id, "message": e.message,
                        "location_hint": e.location_hint, "status": e.status, "created_at": e.created_at,
                        "acknowledged_by": e.acknowledged_by} for e in sos],
    }
