# Gemma 3 4B Setup (Ollama)

Koode AI uses a **local** open-weight model through [Ollama](https://ollama.com). Nothing about a senior's requests is sent to a cloud LLM. (Voice transcription is separate: Sarvam AI cloud STT.)

## 1. Requirements
- Windows 10/11, Ollama for Windows installed (`ollama --version` works).
- About **3.4 GB** disk for the model and ~5 GB free RAM. A CPU-only laptop works; expect ~3 s per answer once warm.
- Python 3.10+ and Node 18+ for the app itself.

## 2. Download the model
```powershell
ollama pull gemma3:4b
ollama list            # gemma3:4b must appear
```
Tip (small C: drive): set `OLLAMA_MODELS=D:\ollama-models` as a user environment variable **before** pulling, then restart Ollama.

## 3. Start Ollama
Ollama normally runs in the system tray after install. If it is not running:
```powershell
ollama serve           # leave this window open
```
Check it: `curl http://localhost:11434/api/tags` should list `gemma3:4b`.
(`Error: could not connect to ollama` means it is not running; "address already in use" means it already is.)

## 4. Configure `.env` (repo root; never commit it)
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_TIMEOUT_SECONDS=90.0
OLLAMA_KEEP_ALIVE=30m
# optional: OLLAMA_NUM_PREDICT=400
```
The model name lives in **one** place: `OLLAMA_MODEL` (default in `backend/app/core/config.py`). Values in `.env` override the process environment. `.env` is git-ignored; `.env.example` is the template. Add `SARVAM_API_KEY` only to your local `.env`.

## 5. Verify
```powershell
ollama run gemma3:4b "Say hello in one short sentence."
curl http://localhost:8000/api/health        # after starting the backend
```
Healthy output has `"status":"healthy"`, `"model_available":true`, `"configured_model":"gemma3:4b"`.

## 6. Start Koode AI
```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --app-dir backend --port 8000 --reload     # terminal 1
npm run dev                                                      # terminal 2 -> http://localhost:5173
```
On startup the backend loads the model in the background (non-blocking), so the first senior request is not a cold start.

## 7. Example requests
Log in first (`POST /api/demo/login`) and send the token (see `docs/PERSON_B_INTEGRATION_GUIDE.md`).

```bash
curl -s -X POST localhost:8000/api/ai/interpret-request -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json; charset=utf-8' \
  -d '{"text":"I need someone to buy my blood pressure medicine.","language":"en"}'
curl -s -X POST localhost:8000/api/ai/interpret-request -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json; charset=utf-8' \
  -d '{"text":"എനിക്ക് പലചരക്ക് സാധനങ്ങൾ വാങ്ങണം.","language":"ml"}'
```
Both return a **draft** (`"created": false`) with `"source": "ollama"` and `"model_used": "gemma3:4b"`. The senior must confirm before the frontend calls `POST /api/community/requests`.

Measured on the development laptop with `gemma3:4b` (live, via the backend):

| Input | Category returned | Notes |
|---|---|---|
| EN: buy my blood pressure medicine | `medicine` | |
| EN: get to the hospital tomorrow | `hospital_assistance` | |
| EN: groceries from the nearby shop | `grocery` | |
| EN: assistance visiting the bank | `bank` | |
| EN: electricity bill needs to be paid | `bank` | judgment call; there is no "bills" category |
| ML: മരുന്ന് വാങ്ങാൻ സഹായം | `medicine` | |
| ML: നാളെ ആശുപത്രിയിൽ പോകണം | `transportation` | acceptable (a trip), but not `hospital_assistance` |
| ML: പലചരക്ക് സാധനങ്ങൾ വാങ്ങണം | `grocery` | |
| EN: "ran out of insulin … urgently today" | `medicine`, priority `urgent` | |

Response time: ~2.4–3.1 s per request once the model is loaded (average 2.8 s over 8 requests); the very first cold load took ~50 s, which is why the timeout is 90 s, `keep_alive` is 30 min and the model is warmed at startup. Requests are `async`, so a slow model never blocks other API calls.

## 8. Fallback behaviour and limitations
- **Ollama down, model missing, timeout, invalid JSON, wrong category:** `POST /api/ai/interpret-request` silently switches to a deterministic English + Malayalam keyword classifier and reports `"source": "fallback"`. Output is validated with Pydantic; markdown code fences are stripped; the model can never waive `requires_confirmation` and can never create a request itself.
- The existing `POST /api/assistant/interpret` (reminders) has no keyword fallback: if Ollama is unreachable it returns `503` with `code: AI_UNAVAILABLE`, and the UI should show its "assistant offline" notice. It also tolerates malformed model fields (non-object `reminder_data`, bad `confidence`, unknown `intent`) and treats a time without a date as today.
- **Gemma is text-only here.** It does not read images, scanned documents or photos.
- **Malayalam:** in live tests the model understood all three Malayalam sentences and produced valid structured output, but the title and description it writes are **English** (often third person: "The elderly person needs…"). The spoken confirmation sentence is Malayalam with an English title. Classification of Malayalam is good but not perfect (see table). Always let the senior review the draft.
- Priority is `normal` unless the text clearly signals urgency.
- A 4B model can misclassify unusual requests; the keyword fallback and the mandatory confirmation step are the safety net.
