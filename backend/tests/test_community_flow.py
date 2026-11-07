"""End-to-end tests for the senior -> helper -> family workflow (Person A modules A, B, D, E)."""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def login(name: str, role: str) -> dict:
    r = client.post("/api/demo/login", json={"name": name, "role": role})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"id": d["user_id"], "h": {"Authorization": f"Bearer {d['token']}"}, "data": d}


@pytest.fixture()
def cast():
    s = uuid.uuid4().hex[:6]
    return {
        "senior": login(f"Senior {s}", "senior"),
        "helper": login(f"Helper A {s}", "helper"),
        "helper2": login(f"Helper B {s}", "helper"),
        "family": login(f"Family {s}", "family"),
        "stranger": login(f"Stranger {s}", "family"),
    }


REQ = {"title": "Medicine purchase", "category": "medicine", "description": "BP tablets", "priority": "normal"}


def test_login_is_stable_and_has_role_ids():
    a = client.post("/api/demo/login", json={"name": "Stable Sue", "role": "senior"}).json()
    b = client.post("/api/demo/login", json={"name": "stable sue", "role": "senior"}).json()
    assert a["user_id"] == b["user_id"] and a["user_id"].startswith("senior_") and a["role"] == "senior"
    assert client.post("/api/demo/login", json={"name": "X", "role": "admin"}).status_code == 422
    assert client.post("/api/demo/login", json={"name": "  ", "role": "senior"}).status_code == 422


def test_full_workflow(cast):
    s, h, h2, f = cast["senior"], cast["helper"], cast["helper2"], cast["family"]
    # family link (approved BEFORE the request so family gets notifications)
    code = client.post("/api/family/invitation", headers=s["h"]).json()["code"]
    link = client.post("/api/family/link", headers=f["h"], json={"code": code})
    assert link.status_code == 200 and link.json()["status"] == "PENDING"
    # pending link gives no access
    assert client.get("/api/family/updates", headers=f["h"]).json()["seniors"] == []
    conn_id = link.json()["connection_id"]
    assert client.post("/api/family/approve", headers=s["h"], json={"connection_id": conn_id}).json()["status"] == "APPROVED"

    # senior creates, reads own request
    r = client.post("/api/community/requests", headers=s["h"], json=REQ)
    assert r.status_code == 201
    rid = r.json()["request_id"]
    assert r.json()["status"] == "OPEN" and r.json()["helper_id"] is None
    assert client.get(f"/api/community/requests/{rid}", headers=s["h"]).json()["title"] == "Medicine purchase"

    # helper sees it as OPEN; accepts; second helper blocked
    assert rid in [x["request_id"] for x in client.get("/api/community/requests", headers=h["h"]).json()["requests"]]
    acc = client.post(f"/api/community/requests/{rid}/accept", headers=h["h"])
    assert acc.status_code == 200 and acc.json()["status"] == "ACCEPTED" and acc.json()["helper_id"] == h["id"]
    second = client.post(f"/api/community/requests/{rid}/accept", headers=h2["h"])
    assert second.status_code == 409 and second.json()["detail"]["code"] == "ALREADY_ACCEPTED"
    # no longer in open list for helper 2
    assert rid not in [x["request_id"] for x in client.get("/api/community/requests", headers=h2["h"]).json()["requests"]]

    # only assigned helper may update; skipping states is rejected
    assert client.patch(f"/api/community/requests/{rid}/status", headers=h2["h"], json={"status": "ON_THE_WAY"}).status_code == 403
    assert client.patch(f"/api/community/requests/{rid}/status", headers=h["h"], json={"status": "COMPLETED"}).status_code == 409
    otw = client.patch(f"/api/community/requests/{rid}/status", headers=h["h"], json={"status": "ON_THE_WAY"})
    assert otw.json()["status"] == "ON_THE_WAY"
    done = client.patch(f"/api/community/requests/{rid}/status", headers=h["h"], json={"status": "COMPLETED"})
    assert done.json()["status"] == "COMPLETED"
    # terminal: cannot cancel afterwards
    assert client.patch(f"/api/community/requests/{rid}/status", headers=s["h"], json={"status": "CANCELLED"}).status_code == 409

    # senior sees assigned helper; notifications for senior and family
    seen = client.get(f"/api/community/requests/{rid}", headers=s["h"]).json()
    assert seen["helper_name"] == h["data"]["name"]
    types = [n["type"] for n in client.get("/api/notifications", headers=s["h"]).json()["notifications"]]
    assert {"REQUEST_ACCEPTED", "HELPER_ON_THE_WAY", "REQUEST_COMPLETED"} <= set(types)
    ftypes = [n["type"] for n in client.get("/api/notifications", headers=f["h"]).json()["notifications"]]
    assert {"REQUEST_CREATED", "REQUEST_ACCEPTED", "HELPER_ON_THE_WAY", "REQUEST_COMPLETED"} <= set(ftypes)

    # family updates: permitted fields only (no description / location)
    upd = client.get("/api/family/updates", headers=f["h"]).json()
    item = next(x for x in upd["requests"] if x["request_id"] == rid)
    assert item["status"] == "COMPLETED" and "description" not in item and "location_hint" not in item

    # SOS -> family notified -> acknowledge
    sos = client.post("/api/sos", headers=s["h"], json={"message": "Need help now"})
    assert sos.status_code == 201 and sos.json()["notified_family_count"] == 1
    eid = sos.json()["event_id"]
    fn = client.get("/api/notifications?unread_only=true", headers=f["h"]).json()
    sos_ntf = next(n for n in fn["notifications"] if n["type"] == "SOS_TRIGGERED")
    assert sos_ntf["sos_id"] == eid
    assert client.patch(f"/api/notifications/{sos_ntf['notification_id']}/read", headers=f["h"]).json()["is_read"] is True
    # someone else cannot read/ack it
    assert client.patch(f"/api/notifications/{sos_ntf['notification_id']}/read", headers=cast["stranger"]["h"]).status_code == 404
    assert client.post(f"/api/sos/{eid}/acknowledge", headers=cast["stranger"]["h"]).status_code == 404
    ack = client.post(f"/api/sos/{eid}/acknowledge", headers=f["h"])
    assert ack.json()["status"] == "ACKNOWLEDGED" and ack.json()["acknowledged_by"] == f["id"]
    assert eid in [e["event_id"] for e in client.get("/api/family/updates", headers=f["h"]).json()["sos_events"]]


def test_persistence_across_sessions(cast):
    rid = client.post("/api/community/requests", headers=cast["senior"]["h"], json=REQ).json()["request_id"]
    # brand-new client + fresh login (like a different browser) sees the same data
    other = TestClient(app)
    tok = other.post("/api/demo/login", json={"name": cast["helper"]["data"]["name"], "role": "helper"}).json()["token"]
    ids = [x["request_id"] for x in other.get("/api/community/requests", headers={"Authorization": f"Bearer {tok}"}).json()["requests"]]
    assert rid in ids


def test_permissions_and_validation(cast):
    s, h, f = cast["senior"], cast["helper"], cast["family"]
    assert client.post("/api/community/requests", json=REQ).status_code == 401
    assert client.get("/api/community/requests", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.post("/api/community/requests", headers=h["h"], json=REQ).status_code == 403   # helper can't create
    assert client.post("/api/community/requests", headers=f["h"], json=REQ).status_code == 403
    assert client.post("/api/sos", headers=h["h"]).status_code == 403
    assert client.post("/api/family/invitation", headers=h["h"]).status_code == 403
    assert client.get("/api/community/requests", headers=f["h"]).status_code == 403
    rid = client.post("/api/community/requests", headers=s["h"], json=REQ).json()["request_id"]
    assert client.post(f"/api/community/requests/{rid}/accept", headers=s["h"]).status_code == 403  # senior can't accept
    assert client.post(f"/api/community/requests/{rid}/accept", headers=f["h"]).status_code == 403
    assert client.get(f"/api/community/requests/{rid}", headers=f["h"]).status_code == 403
    assert client.get("/api/community/requests/req_missing", headers=s["h"]).status_code == 404
    # another senior cannot read it
    s2 = login("Other Senior " + uuid.uuid4().hex[:5], "senior")
    assert client.get(f"/api/community/requests/{rid}", headers=s2["h"]).status_code == 403
    assert client.patch(f"/api/community/requests/{rid}/status", headers=s2["h"], json={"status": "CANCELLED"}).status_code == 403
    # invalid data
    bad = [{**REQ, "category": "pizza"}, {**REQ, "title": ""}, {**REQ, "priority": "whenever"}, {"category": "bank"}]
    for body in bad:
        assert client.post("/api/community/requests", headers=s["h"], json=body).status_code == 422
    assert client.patch(f"/api/community/requests/{rid}/status", headers=s["h"], json={"status": "DONE"}).status_code == 422


def test_senior_cancel_and_helper_privacy(cast):
    s, h, h2 = cast["senior"], cast["helper"], cast["helper2"]
    rid = client.post("/api/community/requests", headers=s["h"], json=REQ).json()["request_id"]
    client.post(f"/api/community/requests/{rid}/accept", headers=h["h"])
    # unrelated helper cannot see an accepted request that is not theirs
    assert client.get(f"/api/community/requests/{rid}", headers=h2["h"]).status_code == 403
    assert client.patch(f"/api/community/requests/{rid}/status", headers=s["h"], json={"status": "CANCELLED"}).json()["status"] == "CANCELLED"
    assert "REQUEST_CANCELLED" in [n["type"] for n in client.get("/api/notifications", headers=h["h"]).json()["notifications"]]


def test_family_link_rules(cast):
    s, f, stranger = cast["senior"], cast["family"], cast["stranger"]
    inv = client.post("/api/family/invitation", headers=s["h"]).json()
    assert client.post("/api/family/link", headers=f["h"], json={"code": "ZZZZZZ"}).status_code == 404
    assert client.post("/api/family/link", headers=cast["helper"]["h"], json={"code": inv["code"]}).status_code == 403
    assert client.post("/api/family/link", headers=f["h"], json={"code": inv["code"].lower()}).status_code == 200
    # code is single use
    assert client.post("/api/family/link", headers=stranger["h"], json={"code": inv["code"]}).status_code == 404
    # only owning senior approves; family can't approve itself
    assert client.post("/api/family/approve", headers=f["h"], json={"connection_id": inv["connection_id"]}).status_code == 403
    s2 = login("Rival " + uuid.uuid4().hex[:5], "senior")
    assert client.post("/api/family/approve", headers=s2["h"], json={"connection_id": inv["connection_id"]}).status_code == 404
    client.post("/api/family/approve", headers=s["h"], json={"connection_id": inv["connection_id"]})
    # SOS reaches the linked family but not an unlinked one
    client.post("/api/sos", headers=s["h"])
    assert any(n["type"] == "SOS_TRIGGERED" for n in client.get("/api/notifications", headers=f["h"]).json()["notifications"])
    assert client.get("/api/notifications", headers=stranger["h"]).json()["notifications"] == []
    assert client.get(f"/api/family/updates?senior_id={s['id']}", headers=stranger["h"]).status_code == 403
    # revoke removes access
    assert client.post("/api/family/revoke", headers=s["h"], json={"connection_id": inv["connection_id"]}).json()["status"] == "REVOKED"
    assert client.get("/api/family/updates", headers=f["h"]).json()["seniors"] == []
    client.post("/api/sos", headers=s["h"])
    sos_count = [n for n in client.get("/api/notifications", headers=f["h"]).json()["notifications"] if n["type"] == "SOS_TRIGGERED"]
    assert len(sos_count) == 1  # nothing new after revocation
