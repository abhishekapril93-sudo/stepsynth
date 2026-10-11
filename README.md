# 🌿 StepSynth (SonicStrides)
### *Turn Every Outdoor Footstep into an Evolving Real-Time Musical Soundtrack*
**Hacktoberfest 2026 Open-Source AI Challenge — Week 1: “Touch Grass” (`#hf26challenge`)**

---

## 🎯 The "Touch Grass" Philosophy: Inverting the Screen Loop

Most health and fitness applications demand continuous screen engagement—tracking maps, viewing animations, and reading dashboards while walking outside. This ironically keeps users glued to their glass screens rather than experiencing the physical environment.

**StepSynth reverses this paradigm:**
- **Screen Time:** 15 seconds to start the walk, pocket the phone, or engage AMOLED Pocket Mode.
- **Physical Engagement:** 30–90 minutes of screen-free outdoor walking, rewarded with **zero-latency acoustic dopamine** on every single physical footstep.
- **The Soundtrack Evolves with You:** As your pace, cadence, and walking consistency shift, an **Open-Weight AI Conductor (Google's Gemma 2)** recomposes the active musical scale, harmonies, and synth envelopes in real time.

---

## ⚡ Key Architectural Features

### 1. Zero-Latency Client-Side Web Audio Synthesizer
- Built using the native **Web Audio API**—no external audio assets or audio streaming lag.
- **Polyphonic Architecture:**
  - **Melody Voice:** Triangle/Saw waveform with dynamic ADSR envelope and tempo-scaled release.
  - **Bass Harmonies:** Rich sub-harmonies played on bar divisions (every 4 steps).
  - **Tactile Thump Transient:** A subtle low-end pitch sweep mimicking a physical foot striking earth or grass.
  - **Spatial Acoustics:** Ambient stereo delay feedback network and dynamic low-pass filtering.

### 2. Dual Motion Detection & Testing Engine
- **Mobile Hardware Acceleration:** Listens to `DeviceMotionEvent` accelerometer telemetry with dynamic gravity compensation and refractory period peak detection (280ms threshold) to prevent double-counting.
- **iOS 13+ Permission Compliant:** User gesture permission flow for Apple Safari and Mobile Chrome.
- **Desktop Simulator & Spacebar Trigger:** Allows hackathon judges and developers to test all audio-reactive dynamics immediately on laptops via Spacebar or the built-in **Auto-Walk Demo** tempo slider.

### 3. Open-Weight AI Conductor (Gemma 2 / Llama 3.3 via Groq)
- **Role:** Algorithmic musical director that monitors walking telemetry every 16 steps:
  ```json
  {
    "currentCadenceBPM": 105,
    "totalSteps": 32,
    "walkDurationSeconds": 45,
    "stepConsistencyScore": 92,
    "currentMood": "Sunrise Pentatonic"
  }
  ```
- **Output:** Returns a structured JSON score:
  ```json
  {
    "mood": "Lydian Sky Explorer",
    "scale": ["F4", "G4", "A4", "B4", "C5", "D5", "E5"],
    "chordProgression": [["F2", "C3", "A3"], ["G2", "D3", "B3"], ["A2", "E3", "C4"], ["C3", "G3", "E4"]],
    "envelope": { "attack": 0.02, "decay": 0.18, "sustain": 0.22, "release": 0.55 },
    "filterCutoff": 2500,
    "encouragementSnippet": "Your rhythm picked up — elevating into a radiant Lydian cadence."
  }
  ```
- **Fail-Safe Offline Music Theory Engine:** If no API key is provided or the device is in an outdoor cellular dead zone, StepSynth automatically falls back to its built-in procedural harmonic engine. **The application never crashes or goes silent.**

### 4. Outdoor "Pocket Mode"
- Switches the display to a low-glare, true black (`#000000`) AMOLED surface with oversized tactile counters.
- Minimizes battery consumption outdoors while allowing the user to lock their phone in their pocket or tap anywhere on the screen without looking.

### 5. 15-Second Walk Soundtrack Replay
- When a walk finishes, StepSynth offers a **Compressed Musical Replay**: an accelerated playback that condenses your entire physical walk into a 12–15 second electronic audio summary of your journey.

---

## 🚀 Quickstart & Local Installation

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+

```bash
# 1. Clone repository
git clone https://github.com/your-username/stepsynth.git
cd stepsynth

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🌐 1-Click Deployment to Vercel

```bash
# Using Vercel CLI
npm install -g vercel
vercel
```
Or connect your GitHub repository directly to **Vercel** or **Render**. The project is pre-configured with Vite and requires zero server-side infrastructure.

---

## 🛠️ Tech Stack & Open-Source Ethos

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + Vite | Lightning-fast HMR, zero-config bundling, sub-second loads. |
| **Styling** | Vanilla CSS Design System | Custom dark mode, glassmorphism, responsive pulse rings. |
| **Audio Synthesis** | Web Audio API (Native) | Zero network lag, polyphonic, runs 100% client-side. |
| **Open-Weight AI** | Google Gemma 2 / Meta Llama 3.3 via Groq | Sub-second latency (~400ms TTFT), strict JSON schema, free tier accessible. |
| **Sensors** | HTML5 `devicemotion` + Haptic Vibration API | Native mobile sensor integration with zero third-party SDKs. |
| **Storage** | Browser `localStorage` | Zero database setup; works completely offline. |

---

## 🏆 Hackathon Alignment

- **Theme ("Touch Grass"):** Direct physical movement reward. The screen is the shortest part of the experience.
- **Open-Weight AI Advantage:** Uses open-weight models (Gemma 2) as an algorithmic composer.
- **Accessibility:** 100% free, runs in any modern mobile browser, no hardware wearables required.
