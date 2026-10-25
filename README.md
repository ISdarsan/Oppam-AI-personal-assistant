# Koode AI (കൂടെ AI)

A voice-first assistant designed for older adults to manage daily reminders, understand confusing messages, and quickly contact family members.

Built for the **Hacktoberfest 2026 DEV Challenge — Week 3: Slow and Steady** (`#devchallenge`, `#hf26challenge`).

---

## Features

- **Voice & Daily Reminders:** Schedule reminders by voice or text for medicines, clinic appointments, and family calls. Completed items show exact timestamps (e.g., *"Done at 8:15 PM"*) to prevent double-dosing confusion.
- **Message Explainer:** Analyzes confusing SMS, bank notices, or hospital instructions. Summarizes what the message means in plain words, highlights required actions, and flags scams (such as fake KYC or OTP requests).
- **1-Tap Communication:** Direct phone calling (`tel:`), instant WhatsApp messaging with pre-composed polite texts, standard SMS, and an Emergency SOS button with a safety confirmation prompt.
- **Elder-Accessible UI:** High-contrast text (minimum 18px, scalable up to 22px), large touch targets (56px+), haptic vibration feedback on tap, and distinct 2px borders.
- **Offline PWA:** Installable directly to Android or iOS home screens as a standalone app with offline caching.
- **Multilingual:** Full UI and speech support for 10 languages: Malayalam, English, Spanish, French, German, Portuguese, Italian, Arabic, Chinese, and Japanese.
- **Private & Local-First:** User reminders and contacts remain stored on the device. AI processing runs locally via an open-weight Gemma model.

---

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Python 3.13, FastAPI, Uvicorn, Pydantic, HTTPX
- **Local AI:** Google Gemma 2:2b running via Ollama
- **Mobile:** Progressive Web App (Service Worker, Web App Manifest)
- **Testing:** Pytest, Vitest, React Testing Library

---

## Getting Started

### 1. Backend Setup

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend\requirements.txt

# Start backend server
uvicorn app.main:app --app-dir backend --reload --port 8000
```

- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 2. Frontend Setup

In a second terminal:

```powershell
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Local AI (Ollama)

To run inference locally:

```powershell
ollama run gemma2:2b
```

If Ollama is not running, the application gracefully falls back to manual entry while keeping all non-AI features operational.

---

## Running Tests

### Backend Tests
```powershell
.\.venv\Scripts\pytest backend\tests -v
```

### Frontend Tests
```powershell
npm test
```

### Production Build
```powershell
npm run build
```

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints (health, assistant, explainer)
│   │   ├── core/           # Configuration and settings
│   │   ├── models/         # Pydantic schemas
│   │   └── services/       # Ollama client and prompt templates
│   └── tests/              # Pytest test suite
├── public/                 # PWA manifest, service worker, app icons
├── src/
│   ├── components/         # Reusable UI components (Button, Card, Input, Modal, Nav)
│   ├── hooks/              # Speech recognition, speech synthesis, PWA install
│   ├── i18n/               # Multilingual translations (10 languages)
│   ├── pages/              # Dashboard, Assistant, Reminders, Contacts, Explainer, Settings
│   ├── services/           # API client and localStorage persistence
│   ├── test/               # Vitest unit and integration tests
│   └── utils/              # Phone calling, WhatsApp, SMS, and haptic utilities
├── index.html
├── package.json
└── vite.config.ts
```

---

## License

MIT License.
