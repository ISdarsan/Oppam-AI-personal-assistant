# Koode AI — Integration Guide for Person B

Short version of [PERSON_A_API_CONTRACT.md](PERSON_A_API_CONTRACT.md) (full field lists and error codes live there). Every call below was verified against a running backend **through the Vite proxy** (`http://localhost:5173/api/...`).

## 0. Run it

```powershell
# terminal 1 — backend (from repo root)
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt        # first time only
uvicorn app.main:app --app-dir backend --port 8000 --reload

# terminal 2 — frontend
npm install                                     # first time only
npm run dev                                     # http://localhost:5173 ; /api is proxied to 127.0.0.1:8000
```
Use **relative** URLs (`fetch('/api/...')`). Swagger UI: `http://localhost:8000/docs`. The SQLite file `backend/data/koode.db` is created automatically and is git-ignored, so everyone's data is local; delete it to reset the demo.

Optional AI: `ollama pull gemma2:2b`. Without it everything still works; `interpret-request` just returns `"source": "fallback"`.

## 1. Demo login and Authorization header

```bash
curl -s -X POST localhost:5173/api/demo/login -H 'content-type: application/json' \
  -d '{"name":"Demo Senior","role":"senior"}'
# {"user_id":"senior_001","name":"Demo Senior","role":"senior","token":"...","area":null,"note":"..."}
```
Roles: `senior | helper | family`. Same name + role = same user every time. Send the token on **every other call**:
`Authorization: Bearer <token>`. Missing/invalid → `401`; wrong role → `403`.

```bash
S=<senior token>  H=<helper token>  F=<family token>
A(){ echo "Authorization: Bearer $1"; }; J='content-type: application/json'; B=localhost:5173/api
```

## 2. AI interpretation → confirm → create (never skip the confirm step)

```bash
curl -s -X POST $B/ai/interpret-request -H "$(A $S)" -H "$J" \
  -d '{"text":"I need someone to buy my blood pressure medicine.","language":"en"}'
```
```json
{"interpreted":{"title":"Medicine purchase","category":"medicine","description":"I need someone to buy my blood pressure medicine.","priority":"normal","requires_confirmation":true},
 "source":"fallback","model_used":null,"spoken_response":"I understood: Medicine purchase. ...","created":false}
```
1. Voice: `POST /api/speech/transcribe` (existing) → transcript → `text`. Language `"ml"` works too.
2. Show `interpreted` to the senior in an editable form (read out `spoken_response`).
3. Only when the senior taps **Confirm**, send the `interpreted` object (extra `requires_confirmation` field is accepted and ignored) to `POST /community/requests`.
`created` is always `false`; the endpoint never writes a request.

## 3. Community requests

```bash
# senior creates (201)
curl -s -X POST $B/community/requests -H "$(A $S)" -H "$J" \
  -d '{"title":"Medicine purchase","category":"medicine","description":"BP tablets","priority":"normal","location_hint":"Kochi"}'
# → {"request_id":"req_...","status":"OPEN","helper_id":null,"helper_name":null,...}  (save request_id as $R)

curl -s $B/community/requests -H "$(A $S)"                       # senior: own requests
curl -s "$B/community/requests?status_filter=OPEN" -H "$(A $H)"  # helper: open requests (+ their own)
curl -s $B/community/requests/$R -H "$(A $S)"                    # poll this: shows status + helper_name
```
Categories: `medicine grocery hospital_assistance transportation ration_shop bank government_office other`. Priorities: `low normal high urgent`.

## 4. Helper acceptance and status updates

```bash
curl -s -X POST $B/community/requests/$R/accept -H "$(A $H)"                               # 200, status ACCEPTED
curl -s -X PATCH $B/community/requests/$R/status -H "$(A $H)" -H "$J" -d '{"status":"ON_THE_WAY"}'
curl -s -X PATCH $B/community/requests/$R/status -H "$(A $H)" -H "$J" -d '{"status":"COMPLETED"}'
curl -s -X PATCH $B/community/requests/$R/status -H "$(A $S)" -H "$J" -d '{"status":"CANCELLED"}'  # senior, before COMPLETED
```
A second helper accepting gets `409 {"detail":{"code":"ALREADY_ACCEPTED"}}` — show "someone already took this" and refresh the list. Order is strict: ACCEPTED → ON_THE_WAY → COMPLETED (`409 INVALID_TRANSITION` otherwise). Only the assigned helper may update (`403 NOT_ASSIGNED_HELPER`).

## 5. Family invitation and approval

```bash
curl -s -X POST $B/family/invitation -H "$(A $S)"                                   # senior → {"connection_id":1,"code":"K7M2QX"}
curl -s -X POST $B/family/link -H "$(A $F)" -H "$J" -d '{"code":"K7M2QX"}'          # family → status PENDING
curl -s $B/family/linked-senior -H "$(A $S)"                                        # senior sees the PENDING request
curl -s -X POST $B/family/approve -H "$(A $S)" -H "$J" -d '{"connection_id":1,"approve":true}'   # → APPROVED
curl -s $B/family/updates -H "$(A $F)"                                              # requests (no description/location) + SOS events
curl -s -X POST $B/family/revoke -H "$(A $S)" -H "$J" -d '{"connection_id":1}'      # either side
```
Family sees nothing (and gets no notifications) until `APPROVED`. Link **before** the senior creates requests/SOS if you want the family to be notified of them: notifications are not back-filled.

## 6. SOS and notifications

```bash
curl -s -X POST $B/sos -H "$(A $S)" -H "$J" -d '{"message":"Need help"}'             # body optional; 201
curl -s "$B/notifications?unread_only=true" -H "$(A $F)"                             # poll every 5–10 s
curl -s -X PATCH $B/notifications/<notification_id>/read -H "$(A $F)"
curl -s -X POST $B/sos/<event_id>/acknowledge -H "$(A $F)"
```
The SOS notification has `type: "SOS_TRIGGERED"` and `sos_id`. This is an **in-app** alert only; the UI must not say SMS/WhatsApp/ambulance was contacted. Notification types for the other flows: `REQUEST_CREATED, REQUEST_ACCEPTED, HELPER_ON_THE_WAY, REQUEST_COMPLETED, REQUEST_CANCELLED, SOS_ACKNOWLEDGED, FAMILY_LINK_*`.

## 7. Error handling

All errors: `{"detail":{"code","message","suggestion"}}` (request-validation `422` uses FastAPI's list form: `detail[0].msg`). A small wrapper is in the contract doc (`call()` → `ApiError`, which the existing `src/services/api.ts` already defines).

## 8. Things you may hit

1. **One browser = one token store.** If you keep the token in `localStorage`, logging in as helper overwrites the senior's token in the same browser. For a three-role demo use separate browser profiles/incognito windows, or store tokens keyed by role.
2. **Timestamps have no `Z`** but are UTC. Parse with `new Date(ts + 'Z')`.
3. **Empty `family/updates`** usually means the connection is still `PENDING` (senior hasn't approved) or was revoked.
4. **Helpers only see OPEN requests and their own.** Fetching someone else's accepted request returns `403`, not data. Family cannot call `GET /community/requests` (`403`); use `/family/updates`.
5. **Existing `/api/assistant/interpret` still returns `503 AI_UNAVAILABLE`** if the Ollama model (`gemma2:2b`) isn't pulled; this is existing behaviour. The new `/ai/interpret-request` falls back instead.
6. **Gemma is slow on first call** (model load). `OLLAMA_TIMEOUT_SECONDS` defaults to 30 s; after that the fallback draft is returned.
7. **Login is not security.** No passwords; anyone can become any user. Don't present helpers as "verified".
8. **Data is shared and persistent** (`backend/data/koode.db`). Use fresh names for a clean demo, or delete the file.
9. No pagination on lists (requests are capped by demo scale; notifications at 100, family updates at 50 requests / 20 SOS).
10. CORS allows `localhost`/`127.0.0.1` origins, so calling `http://localhost:8000` directly also works, but prefer the proxy.
