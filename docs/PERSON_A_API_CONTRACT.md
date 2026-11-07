# Koode AI — Person A API Contract (Backend + AI)

Base URL (dev): `http://localhost:8000/api`. The Vite dev server already proxies `/api` (the existing `src/services/api.ts` calls relative `/api/...`), so from the frontend use relative URLs.

Interactive docs (always up to date): `http://localhost:8000/docs`.

## Conventions

- **Auth (demo only):** `POST /demo/login` returns a `token`. Send `Authorization: Bearer <token>` on every other call below. No password; this is NOT production authentication. Same `name` + `role` (case-insensitive) always returns the same `user_id`, so data survives across browsers/sessions.
- **Errors:** every error is `{"detail": {"code": "...", "message": "...", "suggestion": "..."|null}}` (same shape as the existing speech/assistant endpoints). Request-body validation errors are FastAPI's standard `422` with `detail: [ {loc, msg, type} ]`.
- **Timestamps:** ISO-8601 UTC, no `Z` suffix (e.g. `2026-11-07T12:30:00.123456`).
- **IDs:** users `senior_001` / `helper_002`..., requests `req_xxxxxxxxxx`, SOS `sos_...`, notifications `ntf_...`; family connections are integers.
- Existing endpoints (`/health`, `/assistant/interpret`, `/explainer/*`, `/speech/*`) are unchanged and need no token.

Common error codes: `401 UNAUTHENTICATED` / `INVALID_TOKEN`, `403 FORBIDDEN_ROLE` / `NOT_ALLOWED` / `NOT_ASSIGNED_HELPER` / `NOT_LINKED`, `404 *_NOT_FOUND` / `INVALID_CODE`, `409 ALREADY_ACCEPTED` / `INVALID_TRANSITION` / `NOT_PENDING`, `422` validation.

## Enums

- `role`: `senior | helper | family`
- `category`: `medicine | grocery | hospital_assistance | transportation | ration_shop | bank | government_office | other`
- `priority`: `low | normal | high | urgent`
- request `status`: `OPEN → ACCEPTED → ON_THE_WAY → COMPLETED`, plus `CANCELLED`
- notification `type`: `REQUEST_CREATED`, `REQUEST_ACCEPTED`, `HELPER_ON_THE_WAY`, `REQUEST_COMPLETED`, `REQUEST_CANCELLED`, `SOS_TRIGGERED`, `SOS_ACKNOWLEDGED`, `FAMILY_LINK_REQUESTED`, `FAMILY_LINK_APPROVED`, `FAMILY_LINK_REJECTED`, `FAMILY_LINK_REVOKED`. (`REMINDER_MISSED` is **not** implemented: reminders live on the device.)

---

## 1. Demo auth

### POST `/demo/login`  — no token
```json
// request
{"name": "Demo Senior", "role": "senior", "phone": "optional", "area": "optional, e.g. Kochi"}
// 200 response
{"user_id": "senior_001", "name": "Demo Senior", "role": "senior", "area": null,
 "token": "abc...", "note": "Demo login only: no password. Not production authentication."}
```
Errors: `422` bad role / blank name.

### GET `/demo/me` — any role
→ `{"user_id","name","role","area"}`

---

## 2. Community requests (highest priority flow)

Request object (`RequestOut`):
```json
{"request_id": "req_ab12cd34ef", "senior_id": "senior_001", "senior_name": "Demo Senior",
 "title": "Medicine purchase", "category": "medicine", "description": "BP tablets", "priority": "normal",
 "location_hint": null, "status": "OPEN", "helper_id": null, "helper_name": null,
 "created_at": "...", "updated_at": "..."}
```

### POST `/community/requests` — role **senior** — 201
Call this only **after** the senior confirmed the AI draft.
```json
{"title": "Medicine purchase", "category": "medicine", "description": "BP tablets",
 "priority": "normal", "location_hint": "Optional approximate area, never an exact address"}
```
Errors: `401`, `403 FORBIDDEN_ROLE` (helper/family), `422` (bad category/priority/empty title).
Side effect: `REQUEST_CREATED` notification to approved family members.

### GET `/community/requests[?status_filter=OPEN]` — roles **senior**, **helper**
- senior → only their own requests
- helper → all `OPEN` requests **plus** requests assigned to them
- family → `403` (use `/family/updates`)
→ `{"requests": [RequestOut...], "count": 2}`

### GET `/community/requests/{request_id}` — senior (owner) or helper (if OPEN or assigned to them)
→ `RequestOut` (includes `helper_name` once accepted). `403 NOT_ALLOWED`, `404 REQUEST_NOT_FOUND`.

### POST `/community/requests/{request_id}/accept` — role **helper**
No body. Atomic: only one helper can win.
→ `RequestOut` with `status: "ACCEPTED"`, `helper_id` set. Loser gets `409 ALREADY_ACCEPTED`.
Side effect: `REQUEST_ACCEPTED` → senior + approved family.

### PATCH `/community/requests/{request_id}/status`
```json
{"status": "ON_THE_WAY"}   // or "COMPLETED" (helper) / "CANCELLED" (owning senior)
```
- **Assigned helper only:** `ACCEPTED→ON_THE_WAY`, `ON_THE_WAY→COMPLETED` (no skipping).
- **Owning senior only:** `OPEN|ACCEPTED|ON_THE_WAY → CANCELLED`.
Errors: `403 NOT_ASSIGNED_HELPER` / `NOT_ALLOWED`, `409 INVALID_TRANSITION`, `422` unknown status.
Side effects: `HELPER_ON_THE_WAY`, `REQUEST_COMPLETED`, `REQUEST_CANCELLED` notifications (senior + approved family; cancel also notifies the helper).

---

## 3. AI request interpretation (draft only)

### POST `/ai/interpret-request` — role **senior**
```json
{"text": "I need someone to buy my blood pressure medicine.", "language": "en"}   // "ml" also supported
```
```json
// 200
{"interpreted": {"title": "Medicine purchase", "category": "medicine",
                 "description": "Purchase prescribed blood pressure medicine",
                 "priority": "normal", "requires_confirmation": true},
 "source": "ollama",            // or "fallback" (keyword classifier when Ollama is down / output malformed)
 "model_used": "gemma3:4b",     // null for fallback
 "spoken_response": "I understood: Medicine purchase. Please check it and confirm before I ask for help.",
 "created": false}              // ALWAYS false
```
**Frontend rule:** show `interpreted` to the senior (editable), and only on their confirmation call `POST /community/requests` with those fields. This endpoint never creates anything. Gemma is text-only here (no image understanding). Voice: use the existing `POST /speech/transcribe` (Sarvam) first, then pass the transcript as `text`.
Errors: `401`, `403` (not senior), `422` (empty/too long text).

### POST `/reminders/today` — any logged-in role  ("What do I need to do today?")
Reminders are stored on the device, so the client sends them; the server filters by the date **in the user's timezone**.
```json
{"reminders": [{"title": "BP tablet", "category": "medicine", "date": "2026-11-08", "time": "08:00", "completed": false}],
 "timezone": "Asia/Kolkata", "language": "en", "now": "optional ISO, for testing"}
```
→ `{"date": "2026-11-08", "timezone": "Asia/Kolkata", "pending": [...], "completed": [...], "spoken_response": "You have 1 thing left today: BP tablet at 08:00."}`
Errors: `422 BAD_TIMEZONE` / `BAD_TIMESTAMP`. Note: a pending reminder is not proof a medicine was missed.

---

## 4. Family connect

Flow: senior creates code → family submits code (`PENDING`) → senior approves (`APPROVED`) → either side may revoke (`REVOKED`). Family sees nothing until `APPROVED`.

### POST `/family/invitation` — role **senior** — 201
→ `{"connection_id": 3, "code": "K7M2QX", "status": "INVITED"}` (6 chars, single use; show it to the senior to read out/share)

### POST `/family/link` — role **family**
`{"code": "K7M2QX"}` (case-insensitive) → ConnectionOut `status: "PENDING"`. `404 INVALID_CODE` if unknown/used. Senior gets `FAMILY_LINK_REQUESTED`.

### POST `/family/approve` — role **senior**
`{"connection_id": 3, "approve": true}` (`false` = reject) → ConnectionOut. `404 CONNECTION_NOT_FOUND`, `409 NOT_PENDING`.

### POST `/family/revoke` — senior or the linked family member
`{"connection_id": 3}` → ConnectionOut `status: "REVOKED"`. Access and notifications stop immediately.

### GET `/family/linked-senior` — senior or family
→ `{"connections": [ConnectionOut...], "count": n}` (excludes revoked; `code` is only shown to the senior while INVITED/PENDING).
```json
ConnectionOut = {"connection_id": 3, "status": "APPROVED", "senior_id": "senior_001", "senior_name": "Demo Senior",
                 "family_id": "family_001", "family_name": "Demo Family", "code": null, "created_at": "...", "updated_at": "..."}
```

### GET `/family/updates[?senior_id=senior_001]` — role **family**
Only approved linked seniors. `403 NOT_LINKED` if `senior_id` isn't linked.
```json
{"seniors": [{"senior_id": "senior_001", "name": "Demo Senior"}],
 "requests": [{"request_id": "req_...", "senior_id": "...", "title": "...", "category": "medicine", "status": "COMPLETED",
               "helper_name": "Demo Helper", "updated_at": "..."}],
 "sos_events": [{"event_id": "sos_...", "senior_id": "...", "message": null, "location_hint": null,
                 "status": "ACTIVE", "created_at": "...", "acknowledged_by": null}]}
```
**Privacy:** request descriptions and locations are deliberately not shared with family.

---

## 5. SOS & notifications (in-app only)

SOS creates an in-app event + notifications. It does **not** send SMS/WhatsApp/push or contact emergency services.

### POST `/sos` — role **senior** — 201
```json
{"message": "optional", "location_hint": "optional; include only if the senior agreed to share"}   // body may be omitted
```
→ `{"event_id": "sos_...", "senior_id", "senior_name", "message", "location_hint", "status": "ACTIVE", "acknowledged_by": null, "acknowledged_at": null, "created_at", "notified_family_count": 1, "delivery": "in-app only (...)"}`

### GET `/sos` — senior (own) or family (approved linked seniors)
→ `{"events": [SOSOut...], "count": n}`

### POST `/sos/{event_id}/acknowledge` — role **family** (approved link)
→ SOSOut with `status: "ACKNOWLEDGED"`, `acknowledged_by`. `404 SOS_NOT_FOUND` for unknown/unlinked ids. Senior gets `SOS_ACKNOWLEDGED`.

### GET `/notifications[?unread_only=true]` — any logged-in role
Poll every 5–10 s.
→ `{"notifications": [{"notification_id": "ntf_...", "type": "SOS_TRIGGERED", "message": "SOS from Demo Senior", "request_id": null, "sos_id": "sos_...", "is_read": false, "created_at": "..."}], "unread_count": 1}`

### PATCH `/notifications/{notification_id}/read` — owner only
→ the notification with `is_read: true`. `404 NOTIFICATION_NOT_FOUND` otherwise.

---

## Example workflow (curl)

```bash
B=http://localhost:8000/api; J='content-type: application/json'
S=$(curl -s -X POST $B/demo/login -H "$J" -d '{"name":"Demo Senior","role":"senior"}' | jq -r .token)
H=$(curl -s -X POST $B/demo/login -H "$J" -d '{"name":"Demo Helper","role":"helper"}' | jq -r .token)
F=$(curl -s -X POST $B/demo/login -H "$J" -d '{"name":"Demo Family","role":"family"}' | jq -r .token)
A(){ echo "Authorization: Bearer $1"; }

# family link
CODE=$(curl -s -X POST $B/family/invitation -H "$(A $S)" | jq -r .code)
CID=$(curl -s -X POST $B/family/link -H "$(A $F)" -H "$J" -d "{\"code\":\"$CODE\"}" | jq -r .connection_id)
curl -s -X POST $B/family/approve -H "$(A $S)" -H "$J" -d "{\"connection_id\":$CID}"

# senior: AI draft -> confirm -> create
curl -s -X POST $B/ai/interpret-request -H "$(A $S)" -H "$J" -d '{"text":"I need someone to buy my blood pressure medicine."}'
RID=$(curl -s -X POST $B/community/requests -H "$(A $S)" -H "$J" -d '{"title":"Medicine purchase","category":"medicine","description":"Purchase BP medicine"}' | jq -r .request_id)

# helper: list open, accept, progress
curl -s $B/community/requests -H "$(A $H)"
curl -s -X POST $B/community/requests/$RID/accept -H "$(A $H)"
curl -s -X PATCH $B/community/requests/$RID/status -H "$(A $H)" -H "$J" -d '{"status":"ON_THE_WAY"}'
curl -s -X PATCH $B/community/requests/$RID/status -H "$(A $H)" -H "$J" -d '{"status":"COMPLETED"}'

# family: updates + SOS
curl -s $B/family/updates -H "$(A $F)"
curl -s -X POST $B/sos -H "$(A $S)" -H "$J" -d '{"message":"Need help"}'
curl -s "$B/notifications?unread_only=true" -H "$(A $F)"
```

## Frontend snippet (extend `src/services/api.ts`, don't duplicate)

```ts
let token = localStorage.getItem('koode_token') ?? '';   // token only; request data is NEVER stored client-side
const call = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { const d = body.detail ?? {}; throw new ApiError(d.message ?? `HTTP ${res.status}`, d.code, d.suggestion); }
  return body;
};
export const login = async (name: string, role: 'senior'|'helper'|'family') => {
  const u = await call('/demo/login', { method: 'POST', body: JSON.stringify({ name, role }) });
  token = u.token; localStorage.setItem('koode_token', token); return u;
};
```

## Honest limitations
- Demo login has no passwords; anyone can log in as any name. Helpers are **not** verified in any way.
- SOS and notifications are in-app only (polling). No SMS, WhatsApp, push, or emergency-service integration.
- Reminders are still device-local; `/reminders/today` only filters what the client sends. No `REMINDER_MISSED` events.
- AI interpretation uses local Gemma via Ollama (text only); when unavailable a keyword classifier is used and flagged with `"source": "fallback"`.
- Document/pension support (Module G) is not implemented.
