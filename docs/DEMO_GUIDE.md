# Koode AI: Demo Guide

One app, one backend, one database, three roles. Malayalam is the default language (switch with the button in the header).

## Start
```powershell
ollama list                                   # gemma3:4b must be listed (see GEMMA_SETUP.md)
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --app-dir backend --port 8000        # terminal 1
npm run dev                                                # terminal 2 -> http://localhost:5173
```
Open **three separate browser windows** (or one normal + two incognito/other profiles). Sessions are stored per tab, so the three roles never overwrite each other. Data lives in `backend/data/koode.db` (delete it to reset).

## 3-minute script
1. **Senior window:** log in as *മുതിർന്ന പൗരൻ* (default demo name is fine). Show the Malayalam home screen.
2. **Family window:** log in as *കുടുംബാംഗം*. **Senior:** tab *കുടുംബം* → *പുതിയ കോഡ് ഉണ്ടാക്കുക*. **Family:** enter the code. **Senior:** *അനുവദിക്കുക*.
3. **Senior:** tab *സഹായം* → *മരുന്ന് വാങ്ങാൻ* → press the big mic (or type) and say/type "എനിക്ക് രക്തസമ്മർദ്ദത്തിനുള്ള മരുന്ന് വാങ്ങിത്തരാമോ?" → *തുടരുക*. Gemma drafts it (~4 s). Point out the draft can be edited, then press *അതെ, സഹായം ചോദിക്കുക*. Nothing is created before this button.
4. **Helper window:** log in as *സഹായി*. The request is listed. *ഏറ്റെടുക്കുക* → tab *എന്റെ ജോലികൾ* → *ഞാൻ വഴിയിലാണ്*.
5. **Senior** (no refresh): the tracker moves to "സഹായി വരുന്നു" and shows the helper's name. **Family:** sees the same status (no description or location, by design).
6. **Senior:** home → *അടിയന്തര സഹായം* → confirm *അതെ, അറിയിക്കുക*. **Family:** red alert appears within ~5 s → *ഞാൻ കണ്ടു*. **Senior:** sees "നിങ്ങളുടെ കുടുംബം അറിയിപ്പ് കണ്ടു."

## What is real and what is not
- Real: shared SQLite backend, role permissions, atomic accept, live Gemma classification, Sarvam speech-to-text (needs `SARVAM_API_KEY` in `.env`; without it the mic shows an error and typing works).
- Demo-only: passwordless login; helpers are **not verified**; SOS is an **in-app alert only** (no SMS, WhatsApp, police or ambulance).
- Reminders stay on the senior's device (browser storage), as before.
- Not built: document OCR (the *രേഖകൾ* card opens the existing paste-a-message explainer; Gemma 3 here is text-only), pension/scheme data.
