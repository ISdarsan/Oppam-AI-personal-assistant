from fastapi import APIRouter, Depends, status
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import api_error, approved_family_ids, approved_senior_ids, get_current_user, new_id, notify, require_role
from ..models import CommunityRequest, User, utcnow
from ..schemas.community import RequestCreate, RequestList, RequestOut, StatusUpdate

router = APIRouter(prefix="/community/requests", tags=["Community Requests"])

# helper-driven transitions: current -> allowed next
HELPER_FLOW = {"ACCEPTED": "ON_THE_WAY", "ON_THE_WAY": "COMPLETED"}
SENIOR_CANCELLABLE = ("OPEN", "ACCEPTED", "ON_THE_WAY")


def to_out(r: CommunityRequest) -> RequestOut:
    return RequestOut(
        request_id=r.id, senior_id=r.senior_id, senior_name=r.senior.name, title=r.title, category=r.category,
        description=r.description, priority=r.priority, location_hint=r.location_hint, status=r.status,
        helper_id=r.helper_id, helper_name=r.helper.name if r.helper else None,
        created_at=r.created_at, updated_at=r.updated_at)


def _get_or_404(db: Session, request_id: str) -> CommunityRequest:
    r = db.get(CommunityRequest, request_id)
    if not r:
        raise api_error(status.HTTP_404_NOT_FOUND, "REQUEST_NOT_FOUND", f"No request with id '{request_id}'.")
    return r


@router.post("", response_model=RequestOut, status_code=201)
def create_request(body: RequestCreate, user: User = Depends(require_role("senior")), db: Session = Depends(get_db)):
    """Senior creates a help request (call this only AFTER the senior confirmed the AI-interpreted draft)."""
    r = CommunityRequest(id=new_id("req"), senior_id=user.id, title=body.title.strip(), category=body.category.value,
                         description=body.description.strip(), priority=body.priority.value,
                         location_hint=body.location_hint)
    db.add(r)
    notify(db, approved_family_ids(db, user.id), "REQUEST_CREATED",
           f"{user.name} asked for help: {r.title}", request_id=r.id)
    db.commit()
    db.refresh(r)
    return to_out(r)


@router.get("", response_model=RequestList)
def list_requests(status_filter: str | None = None, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """senior: own requests. helper: all OPEN requests + ones assigned to them. family: use /api/family/updates."""
    q = select(CommunityRequest).order_by(CommunityRequest.created_at.desc())
    if user.role == "senior":
        q = q.where(CommunityRequest.senior_id == user.id)
    elif user.role == "helper":
        q = q.where(or_(CommunityRequest.status == "OPEN", CommunityRequest.helper_id == user.id))
    else:
        raise api_error(status.HTTP_403_FORBIDDEN, "FORBIDDEN_ROLE",
                        "Family members cannot list raw requests.", "Use GET /api/family/updates.")
    if status_filter:
        q = q.where(CommunityRequest.status == status_filter.upper())
    rows = db.scalars(q).all()
    return RequestList(requests=[to_out(r) for r in rows], count=len(rows))


@router.get("/{request_id}", response_model=RequestOut)
def get_request(request_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _get_or_404(db, request_id)
    allowed = (
        (user.role == "senior" and r.senior_id == user.id)
        or (user.role == "helper" and (r.status == "OPEN" or r.helper_id == user.id))
    )
    if not allowed:
        raise api_error(status.HTTP_403_FORBIDDEN, "NOT_ALLOWED", "You do not have access to this request.")
    return to_out(r)


@router.post("/{request_id}/accept", response_model=RequestOut)
def accept_request(request_id: str, user: User = Depends(require_role("helper")), db: Session = Depends(get_db)):
    r = _get_or_404(db, request_id)
    # Atomic compare-and-set: only one helper can flip OPEN -> ACCEPTED.
    res = db.execute(update(CommunityRequest)
                     .where(CommunityRequest.id == request_id, CommunityRequest.status == "OPEN")
                     .values(status="ACCEPTED", helper_id=user.id, updated_at=utcnow()))
    if res.rowcount != 1:
        db.rollback()
        raise api_error(status.HTTP_409_CONFLICT, "ALREADY_ACCEPTED",
                        "This request is no longer open (already accepted, completed or cancelled).",
                        "Refresh the open requests list.")
    notify(db, [r.senior_id, *approved_family_ids(db, r.senior_id)], "REQUEST_ACCEPTED",
           f"{user.name} accepted: {r.title}", request_id=r.id)
    db.commit()
    db.refresh(r)
    return to_out(r)


@router.patch("/{request_id}/status", response_model=RequestOut)
def update_status(request_id: str, body: StatusUpdate, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """Assigned helper: ACCEPTED->ON_THE_WAY->COMPLETED. Owning senior: may CANCEL while not finished."""
    r = _get_or_404(db, request_id)
    target = body.status

    if target == "CANCELLED":
        if user.role != "senior" or r.senior_id != user.id:
            raise api_error(status.HTTP_403_FORBIDDEN, "NOT_ALLOWED", "Only the senior who made the request can cancel it.")
        allowed_from = SENIOR_CANCELLABLE
    else:
        if user.role != "helper" or r.helper_id != user.id:
            raise api_error(status.HTTP_403_FORBIDDEN, "NOT_ASSIGNED_HELPER",
                            "Only the helper assigned to this request can update its progress.")
        allowed_from = tuple(k for k, v in HELPER_FLOW.items() if v == target)

    res = db.execute(update(CommunityRequest)
                     .where(CommunityRequest.id == request_id, CommunityRequest.status.in_(allowed_from))
                     .values(status=target, updated_at=utcnow()))
    if res.rowcount != 1:
        db.rollback()
        cur = db.get(CommunityRequest, request_id).status
        raise api_error(status.HTTP_409_CONFLICT, "INVALID_TRANSITION",
                        f"Cannot change status from {cur} to {target}.",
                        "Allowed: ACCEPTED->ON_THE_WAY->COMPLETED (helper); OPEN/ACCEPTED/ON_THE_WAY->CANCELLED (senior).")

    ntype = {"ON_THE_WAY": "HELPER_ON_THE_WAY", "COMPLETED": "REQUEST_COMPLETED", "CANCELLED": "REQUEST_CANCELLED"}[target]
    text = {"ON_THE_WAY": f"{r.helper.name if r.helper else 'Helper'} is on the way: {r.title}",
            "COMPLETED": f"Completed: {r.title}", "CANCELLED": f"Request cancelled: {r.title}"}[target]
    recipients = [r.senior_id, *approved_family_ids(db, r.senior_id)]
    if target == "CANCELLED" and r.helper_id:
        recipients.append(r.helper_id)
    notify(db, recipients, ntype, text, request_id=r.id)
    db.commit()
    db.refresh(r)
    return to_out(r)
