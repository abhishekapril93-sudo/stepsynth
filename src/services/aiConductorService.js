// aiConductorService.js - Open-Weight AI Dynamic Music Conductor for StepSynth
// Translates real-time human physical cadence, step consistency, and outdoor walk duration
// into harmonic scales, chord progressions, synth envelope envelopes, and feedback.

const STORAGE_KEY_API_KEY = "stepsynth_api_key";
const STORAGE_KEY_MODEL = "stepsynth_model";
const STORAGE_KEY_PROVIDER = "stepsynth_provider";

// Supported open-weight models available via hosted fast-inference APIs
export const OPEN_MODELS = [
  { id: "gemma2-9b-it", name: "Google Gemma 2 (9B)", provider: "groq" },
  { id: "llama-3.1-8b-instant", name: "Meta Llama 3.1 (8B)", provider: "groq" },
  { id: "llama-3.3-70b-versatile", name: "Meta Llama 3.3 (70B)", provider: "groq" },
  { id: "google/gemma-2-9b-it", name: "Gemma 2 9B (OpenRouter)", provider: "openrouter" }
];

export function getStoredApiKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY_API_KEY) || import.meta.env.VITE_GROQ_API_KEY || "";
}

export function saveStoredApiKey(key) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
}

export function getStoredModel() {
  if (typeof window === "undefined") return "gemma2-9b-it";
  return localStorage.getItem(STORAGE_KEY_MODEL) || "gemma2-9b-it";
}

export function saveStoredModel(model) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

// Algorithmic Procedural Conductor (Fail-Safe Offline Music Theory Engine)
// Used when API key is not yet set or during network offline / rate limits
export function generateProceduralSoundscape({ currentCadenceBPM = 100, totalSteps = 16, walkDurationSeconds = 30, stepConsistencyScore = 85 }) {
  if (currentCadenceBPM < 80) {
    // Gentle Stroll / Ambient Float
    return {
      mood: "Forest Reverie (Ambient Float)",
      scale: ["D4", "F4", "G4", "A4", "C5", "D5"],
      chordProgression: [
        ["D3", "A3", "F4"],
        ["G2", "D3", "B3"],
        ["Bb2", "F3", "D4"],
        ["A2", "E3", "C4"]
      ],
      envelope: { attack: 0.08, decay: 0.35, sustain: 0.4, release: 1.1 },
      filterCutoff: 1400,
      encouragementSnippet: "Unrushed footsteps. The music softens into a deep forest harmonic canopy."
    };
  } else if (currentCadenceBPM >= 80 && currentCadenceBPM < 105) {
    // Steady Morning Walk / Warm Major Pentatonic
    return {
      mood: "Sunrise Wanderer (Major Pentatonic)",
      scale: ["C4", "D4", "E4", "G4", "A4", "C5"],
      chordProgression: [
        ["C3", "G3", "E4"],
        ["A2", "E3", "C4"],
        ["F2", "C3", "A3"],
        ["G2", "D3", "B3"]
      ],
      envelope: { attack: 0.04, decay: 0.22, sustain: 0.28, release: 0.75 },
      filterCutoff: 1900,
      encouragementSnippet: `Solid rhythm at ${currentCadenceBPM} SPM. A radiant pentatonic melody unfolds with every stride.`
    };
  } else if (currentCadenceBPM >= 105 && currentCadenceBPM < 125) {
    // Brisk Exploration / Lydian Drive
    return {
      mood: "Lydian Explorer (Brisk Stride)",
      scale: ["F4", "G4", "A4", "B4", "C5", "E5"],
      chordProgression: [
        ["F2", "C3", "A3"],
        ["G2", "D3", "B3"],
        ["A2", "E3", "C4"],
        ["C3", "G3", "E4"]
      ],
      envelope: { attack: 0.02, decay: 0.18, sustain: 0.22, release: 0.55 },
      filterCutoff: 2500,
      encouragementSnippet: `Pace elevating to ${currentCadenceBPM} SPM! Introducing a bright Lydian fourth to match your outdoor momentum.`
    };
  } else {
    // Aerobic / High-Cadence Sprint Stride
    return {
      mood: "Cosmic Sprint (Dorian Drive)",
      scale: ["E4", "G4", "A4", "B4", "D5", "E5"],
      chordProgression: [
        ["E2", "B2", "G3"],
        ["C3", "G3", "E4"],
        ["D3", "A3", "F#4"],
        ["B2", "F#3", "D4"]
      ],
      envelope: { attack: 0.015, decay: 0.14, sustain: 0.18, release: 0.4 },
      filterCutoff: 3200,
      encouragementSnippet: `Incredible cadence (${currentCadenceBPM} SPM)! Punchy transient attacks and driving bass harmonies unlocked.`
    };
  }
}

// Open-Weight AI Conductor Call via Remote API
export async function consultAiConductor({
  currentCadenceBPM,
  totalSteps,
  walkDurationSeconds,
  stepConsistencyScore,
  currentMood
}) {
  const apiKey = getStoredApiKey();
  const model = getStoredModel();

  // If no API key provided, seamlessly return procedural soundscape without crashing
  if (!apiKey) {
    console.info("[StepSynth] No API key configured. Using onboard Procedural Conductor.");
    return {
      success: true,
      isProceduralFallback: true,
      data: generateProceduralSoundscape({
        currentCadenceBPM,
        totalSteps,
        walkDurationSeconds,
        stepConsistencyScore
      })
    };
  }

  const systemPrompt = `You are "StepSynth Conductor", an expert algorithmic composer bridging physical outdoor locomotion with acoustic music theory.
You translate human walking parameters (cadence in Steps-Per-Minute, step count, consistency, and duration) into real-time electronic soundscapes.

Rules:
1. Always output purely valid JSON with NO surrounding markdown backticks, NO explanations, and NO introductory text.
2. The JSON MUST strictly follow this schema:
{
  "mood": "string title describing the acoustic aesthetic",
  "scale": ["array of 5 to 7 scientific pitch note names in octave 4-5, e.g. C4, D4, E4, G4, A4, C5"],
  "chordProgression": [
    ["array of 2 to 3 note names in octave 2-4 for bar 1"],
    ["notes for bar 2"],
    ["notes for bar 3"],
    ["notes for bar 4"]
  ],
  "envelope": {
    "attack": float between 0.01 and 0.12,
    "decay": float between 0.1 and 0.4,
    "sustain": float between 0.15 and 0.5,
    "release": float between 0.4 and 1.2
  },
  "filterCutoff": integer between 1000 and 3400 (higher for brisk/energetic, lower for gentle/ambient),
  "encouragementSnippet": "One concise, poetic sentence (15 words max) celebrating their physical rhythm and outdoor movement."
}

Music Theory Guidelines:
- Low cadence (< 85 SPM): Ambient, Minor Pentatonic, Dorian, or Chillout modes. Soft attack, slow release.
- Medium cadence (85-115 SPM): Upbeat Major Pentatonic, Mixolydian, or Ionian. Balanced envelope.
- High cadence (> 115 SPM): Energetic Lydian, Dorian, or Synthwave. Sharp attack, punchy release, bright filter cutoff.
- High consistency (> 85%): Cohesive, structured chord progressions.
- Irregular consistency: Playful, jazz-like shifting color tones.`;

  const userPrompt = `Walker Telemetry:
- Current Cadence: ${currentCadenceBPM} Steps Per Minute (BPM)
- Total Steps Taken: ${totalSteps}
- Walk Duration: ${walkDurationSeconds} seconds
- Step Consistency: ${stepConsistencyScore}%
- Previous Mood: "${currentMood || 'Initial'}"

Compose the next musical evolution for this walker. Return ONLY the JSON object.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || "gemma2-9b-it",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.65,
        max_tokens: 450,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("[StepSynth AI Conductor] API error:", response.status, errText);
      return {
        success: true,
        isProceduralFallback: true,
        error: `API ${response.status}: Falling back to procedural harmony`,
        data: generateProceduralSoundscape({
          currentCadenceBPM,
          totalSteps,
          walkDurationSeconds,
          stepConsistencyScore
        })
      };
    }

    const jsonResponse = await response.json();
    let rawContent = jsonResponse.choices?.[0]?.message?.content || "";

    // Clean any accidental markdown codeblock wrapper
    rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    const parsedData = JSON.parse(rawContent);

    // Validate essential keys
    if (!parsedData.scale || !parsedData.chordProgression) {
      throw new Error("Missing scale or chordProgression in AI response");
    }

    return {
      success: true,
      isProceduralFallback: false,
      modelUsed: model,
      data: parsedData
    };
  } catch (err) {
    console.warn("[StepSynth AI Conductor] Failed to parse AI response, utilizing procedural composer:", err);
    return {
      success: true,
      isProceduralFallback: true,
      error: err.message,
      data: generateProceduralSoundscape({
        currentCadenceBPM,
        totalSteps,
        walkDurationSeconds,
        stepConsistencyScore
      })
    };
  }
}
