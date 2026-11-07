import secrets
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas.community import DemoLoginRequest, DemoLoginResponse, UserOut

router = APIRouter(prefix="/demo", tags=["Demo Auth"])


@router.post("/login", response_model=DemoLoginResponse)
def demo_login(body: DemoLoginRequest, db: Session = Depends(get_db)):
    """Find-or-create a demo user by (name, role). Same name+role always returns the same user_id, so data
    survives across browser sessions. No password: demo only."""
    user = db.scalar(select(User).where(func.lower(User.name) == body.name.lower(), User.role == body.role.value))
    if not user:
        n = (db.scalar(select(func.count()).select_from(User).where(User.role == body.role.value)) or 0) + 1
        uid = f"{body.role.value}_{n:03d}"
        while db.get(User, uid):
            n += 1
            uid = f"{body.role.value}_{n:03d}"
        user = User(id=uid, name=body.name, role=body.role.value, token=secrets.token_urlsafe(24),
                    phone=body.phone, area=body.area)
        db.add(user)
        db.commit()
    return DemoLoginResponse(user_id=user.id, name=user.name, role=user.role, area=user.area, token=user.token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(user_id=user.id, name=user.name, role=user.role, area=user.area)
