# Koode AI (കൂടെ AI)

> **"Always by your side • എന്നും കൂടെയുണ്ട്"**  
> An elder-supportive, voice-first companion app engineered for older adults. Built with open-weight AI (Google Gemma 2) and Sarvam AI voice transcription.

[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://dev.to/challenges/hf26)
[![DEV Challenge](https://img.shields.io/badge/DEV_Challenge-Week_3-blue.svg)](https://dev.to/t/devchallenge)
[![Model](https://img.shields.io/badge/Model-Gemma_2:2b-green.svg)](https://ai.google.dev/gemma)
[![Voice STT](https://img.shields.io/badge/Voice_STT-Sarvam_AI_Saaras_v4-purple.svg)](https://sarvam.ai)
[![License](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)

---

## The Vision: Technology That Respects Aging

Most modern mobile apps and AI chatbots fail older adults: fonts are small, interfaces are cluttered with dark patterns, and complex account logins create anxiety. Seniors suffering from presbyopia, motor tremors, or mild cognitive decline often struggle with technology and live in constant fear of financial scams or missing vital medications.

**Koode AI (കൂടെ AI)** is an accessible digital companion designed with senior ergonomics:
* **Voice-First in Malayalam & English:** Seniors speak naturally; Sarvam AI (`saaras:v4`) converts dialect speech into text.
* **Open-Weight Gemma 2 Intelligence:** Google's open-weight Gemma 2 (`gemma2:2b`) model interprets elder requests, extracts structured reminder intents, and explains confusing messages.
* **Cognitive Reassurance Timestamps:** Marking a pill complete records an explicit timestamp (e.g., *"✓ Done at 8:15 PM"*), preventing double-dosing anxiety.
* **Scam & Notice Explainer:** Breaks down confusing hospital discharge notices or bank SMS into plain words and actively flags OTP/KYC scam red flags.
* **1-Tap Direct Family Hub:** Native `tel:` calling, 1-tap WhatsApp chat with polite pre-composed help requests, and an Emergency SOS broadcast.
* **Local-First & Private:** Seniors' personal data, contacts, and medication schedules are stored safely on the local device, not in third-party clouds.

---

## Why Open Innovation Matters for Koode AI

Koode AI was built for the **Hacktoberfest 2026 DEV Challenge** (*"Build something with open-source AI at its core"*), competing in the **Best Use of Gemma** category.

1. **Complete Privacy for Vulnerable Adults:** Medication schedules, doctor appointments, and family phone numbers are highly sensitive. By running Google Gemma 2 locally via Ollama, personal data never leaves the senior's machine.
2. **Zero Recurring Cost:** Older adults living on pensions should never worry about monthly API subscriptions or usage metering. Gemma 2 runs entirely free on open-weight inference.
3. **Resilience & Offline Operation:** When network connections fail, Koode AI remains 100% operational: local reminders, calendar views, contacts, text scaling, and emergency phone calls continue working seamlessly without cloud dependency.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Koode AI Frontend PWA                         │
│  (React 18 + Vite + TypeScript + Tailwind CSS + WCAG AAA 18-22px Text) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                     HTTP / Multipart Form Uploads
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       FastAPI Backend Service                          │
│       (Python 3.13 + Pydantic v2 + HTTPX + Strict JSON Schemas)        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
      Cloud STT (Voice to Text)          Local Reasoning (Text to Intent)
                    │                                │
┌───────────────────▼───────────┐    ┌───────────────▼───────────────────┐
│       Sarvam AI Cloud         │    │           Ollama Host             │
│   Model: Saaras v4 (ml-IN)    │    │      Model: Google Gemma 2:2b     │
│   Accurate Malayalam Speech   │    │  Private, On-Device Intent Logic  │
└───────────────────────────────┘    └───────────────────────────────────┘
```

---

## Features & Capabilities

| Feature | Description | Elder Accessibility Focus |
|---|---|---|
| **Voice-First Assistant** | Speak instructions (e.g. *"Remind me to take my pressure pill at 8 PM"*). Sarvam AI transcribes audio; Gemma 2 extracts structured intents. | Reviewable transcript before processing; large 128px microphone button. |
| **Smart Reminders** | Category badges (💊 Medicine, 🩺 Doctor, 📞 Call, 💧 Water, 📋 Task). Chronological overdue & today filters. | Exact *"✓ Done at 8:15 PM"* completion stamps; audio chime feedback. |
| **Message Explainer** | 4-part breakdown: *In Simple Words*, *Important Details*, *What You Need to Do*, and *Safety & Scam Alert*. | Integrated Web Speech Synthesis (0.8x calm speaking rate). |
| **Family & SOS Hub** | 1-tap Phone Calling (`tel:`), instant WhatsApp chat (`wa.me`), and High-Visibility Emergency SOS bar. | Physical haptic vibration pulses (`navigator.vibrate`) on tap. |
| **PWA Installable** | Works as an installable native-like app on Android & iOS homescreens. | Network-First Service Worker (`sw.js`) for reliable offline caching. |
| **Multilingual (10 Languages)** | Native typography for Malayalam, English, Spanish, French, German, Portuguese, Italian, Arabic, Chinese, and Japanese. | 1-tap `A / A+ / A++` font size switcher (18px, 20px, 22px). |

---

## Quick Start Guide

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+ (tested on Python 3.13)
- [Ollama](https://ollama.ai/) with `gemma2:2b`
- Sarvam AI API subscription key from [sarvam.ai](https://sarvam.ai)

---

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```powershell
cp .env.example .env
```

Configure your `.env` file:
```env
# Local Gemma Reasoning AI (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2:2b
OLLAMA_TIMEOUT_SECONDS=30.0

# Sarvam AI Cloud Speech-to-Text
SARVAM_API_KEY=your_sarvam_api_key_here
SARVAM_BASE_URL=https://api.sarvam.ai
SARVAM_MODEL=saaras:v4
SARVAM_MODE=transcribe
SARVAM_TIMEOUT_SECONDS=25.0
```

---

### 2. Backend Startup (FastAPI)

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r backend\requirements.txt

# Start backend server on port 8000
uvicorn app.main:app --app-dir backend --port 8000 --reload
```

* Interactive API Docs: `http://localhost:8000/docs`
* API Health Check: `http://localhost:8000/api/health`
* Speech STT Status: `http://localhost:8000/api/speech/status`

---

### 3. Frontend Startup (Vite + React)

In a new terminal:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

### 4. Running Gemma 2 Locally

In a terminal, start Ollama and pull Gemma 2:

```powershell
ollama serve
ollama run gemma2:2b
```

> **Note:** If Ollama is offline, Koode AI displays an honest status notice while keeping all manual reminder, explainer, contacts, and voice features functional.

---

## Testing & Quality Assurance

### Run Frontend Unit Tests (Vitest)
```powershell
npm test
```
* **Result:** 24 / 24 unit tests passing across 7 test suites.

### Run Backend Unit Tests (Pytest)
```powershell
.\.venv\Scripts\pytest backend\tests -v
```
* **Result:** 13 / 13 backend unit tests passing.

### Run Real Provider Live Integration Test
```powershell
python backend\tests\integration_test_live.py
```
* Authenticates and verifies real round-trip connectivity to Sarvam AI (`saaras:v4`) and local Ollama (`gemma2:2b`).

### Production Build
```powershell
npm run build
```
* Compiles TypeScript and packages optimized static assets via Vite with zero errors.

---

## Project Structure

```
Koode-AI/
├── backend/
│   ├── app/
│   │   ├── api/               # speech, assistant, explainer, health endpoints
│   │   ├── core/              # config & .env loader
│   │   ├── schemas/           # Pydantic v2 validation models
│   │   ├── services/          # sarvam_service, ollama_client, prompt_templates
│   │   └── main.py            # FastAPI app & CORS
│   └── tests/                 # Pytest test suite & live integration test
├── public/
│   ├── logo.svg               # Custom caring-hands vector emblem
│   ├── manifest.webmanifest   # PWA web manifest
│   └── sw.js                  # Network-First PWA service worker
├── src/
│   ├── components/            # Layout, Navigation, UI components (Logo, Button, Modal, Card)
│   ├── hooks/                 # useSarvamAudioRecorder, useSpeechSynthesis, usePWAInstall
│   ├── i18n/                  # translations.ts (10 languages) & LanguageContext
│   ├── pages/                 # Dashboard, Assistant, Reminders, Explainer, Contacts, Settings
│   ├── services/              # api.ts (backend client), storage.ts (local persistence)
│   ├── test/                  # Vitest component & hook test suites
│   ├── types/                 # TypeScript interfaces
│   └── utils/                 # communication.ts, dateUtils.ts, sound.ts
├── .env.example               # Environment template (no secrets committed)
├── package.json               # Frontend dependencies & scripts
└── README.md                  # Project documentation
```

---

## License

This project is licensed under the [MIT License](LICENSE).
