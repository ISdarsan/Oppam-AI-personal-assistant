import uuid
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.api.assistant import ollama_client
from app.services.ollama_client import OllamaServiceError
from app.services.request_interpreter import fallback_interpret

client = TestClient(app)


@pytest.fixture()
def hdr():
    d = client.post("/api/demo/login", json={"name": "AI Senior " + uuid.uuid4().hex[:5], "role": "senior"}).json()
    return {"Authorization": f"Bearer {d['token']}"}


def post(hdr, text, lang="en"):
    return client.post("/api/ai/interpret-request", headers=hdr, json={"text": text, "language": lang})


def test_ollama_success_is_validated(hdr):
    model = {"title": "Medicine purchase", "category": "medicine", "description": "Purchase prescribed blood pressure medicine",
             "priority": "normal", "requires_confirmation": False}
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=model)):
        d = post(hdr, "I need someone to buy my blood pressure medicine.").json()
    assert d["source"] == "ollama" and d["created"] is False
    assert d["interpreted"]["category"] == "medicine"
    assert d["interpreted"]["requires_confirmation"] is True  # model cannot waive confirmation


def test_alias_category_is_normalised(hdr):
    model = {"title": "Take mother to hospital", "category": "Hospital", "description": "Escort to appointment", "priority": "HIGH"}
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=model)):
        d = post(hdr, "My mother has a hospital appointment tomorrow. I need someone to take her.").json()
    assert d["interpreted"]["category"] == "hospital_assistance" and d["interpreted"]["priority"] == "high"


@pytest.mark.parametrize("bad", [{"title": "x", "category": "pizza"}, {"nope": 1}, {"title": "", "category": "bank"}])
def test_malformed_model_output_falls_back(hdr, bad):
    with patch.object(ollama_client, "generate_json", new=AsyncMock(return_value=bad)):
        d = post(hdr, "I need help buying groceries").json()
    assert d["source"] == "fallback" and d["interpreted"]["category"] == "grocery"


def test_ollama_down_uses_fallback(hdr):
    with patch.object(ollama_client, "generate_json", new=AsyncMock(side_effect=OllamaServiceError("down"))):
        d = post(hdr, "I need someone to buy my blood pressure medicine.")
    assert d.status_code == 200 and d.json()["source"] == "fallback"
    assert d.json()["interpreted"]["category"] == "medicine" and d.json()["interpreted"]["requires_confirmation"] is True


def test_interpret_never_creates_a_request(hdr):
    with patch.object(ollama_client, "generate_json", new=AsyncMock(side_effect=OllamaServiceError("down"))):
        post(hdr, "buy groceries")
    assert client.get("/api/community/requests", headers=hdr).json()["count"] == 0


@pytest.mark.parametrize("text,cat", [
    ("My mother has a hospital appointment tomorrow. I need someone to take her.", "hospital_assistance"),
    ("I need a ride to the market", "transportation"),
    ("Please help me at the bank for my pension", "bank"),
    ("collect my ration", "ration_shop"),
    ("village office certificate", "government_office"),
    ("എനിക്ക് മരുന്ന് വാങ്ങണം", "medicine"),
    ("പലചരക്ക് സാധനങ്ങൾ വാങ്ങണം", "grocery"),
    ("ആശുപത്രിയിൽ പോകണം", "hospital_assistance"),
    ("hello there", "other"),
])
def test_fallback_categories(text, cat):
    assert fallback_interpret(text).category.value == cat


def test_interpret_requires_senior_and_valid_text(hdr):
    h = client.post("/api/demo/login", json={"name": "Hlp " + uuid.uuid4().hex[:5], "role": "helper"}).json()
    assert post({"Authorization": f"Bearer {h['token']}"}, "x").status_code == 403
    assert client.post("/api/ai/interpret-request", json={"text": "x"}).status_code == 401
    assert post(hdr, "").status_code == 422


def test_reminders_today_uses_user_timezone(hdr):
    rem = [{"title": "BP tablet", "date": "2026-11-08", "time": "08:00"},
           {"title": "Call son", "date": "2026-11-07", "time": "21:00"},
           {"title": "Water", "date": "2026-11-08", "time": "10:00", "completed": True}]
    # 2026-11-07T20:00Z is already Nov 8 in Kolkata (01:30 IST) but still Nov 7 in New York
    r = client.post("/api/reminders/today", headers=hdr, json={"reminders": rem, "now": "2026-11-07T20:00:00Z", "timezone": "Asia/Kolkata"}).json()
    assert r["date"] == "2026-11-08" and [x["title"] for x in r["pending"]] == ["BP tablet"] and len(r["completed"]) == 1
    r = client.post("/api/reminders/today", headers=hdr, json={"reminders": rem, "now": "2026-11-07T20:00:00Z", "timezone": "America/New_York"}).json()
    assert r["date"] == "2026-11-07" and [x["title"] for x in r["pending"]] == ["Call son"]
    assert client.post("/api/reminders/today", headers=hdr, json={"reminders": [], "timezone": "Mars/Base"}).status_code == 422
