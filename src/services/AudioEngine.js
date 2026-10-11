// AudioEngine.js - Client-Side Web Audio Synthesizer for StepSynth
// Zero latency, polyphonic note and chord synthesis, ADSR envelopes, and ambient acoustic space.

// Standard scientific pitch notation to frequency conversion
const NOTE_FREQUENCIES = {
  // Octave 2 (Bass roots)
  "C2": 65.41, "C#2": 69.30, "Db2": 69.30, "D2": 73.42, "D#2": 77.78, "Eb2": 77.78,
  "E2": 82.41, "F2": 87.31, "F#2": 92.50, "Gb2": 92.50, "G2": 98.00, "G#2": 103.83,
  "Ab2": 103.83, "A2": 110.00, "A#2": 116.54, "Bb2": 116.54, "B2": 123.47,

  // Octave 3 (Chord harmonies & warm pads)
  "C3": 130.81, "C#3": 138.59, "Db3": 138.59, "D3": 146.83, "D#3": 155.56, "Eb3": 155.56,
  "E3": 164.81, "F3": 174.61, "F#3": 185.00, "Gb3": 185.00, "G3": 196.00, "G#3": 207.65,
  "Ab3": 207.65, "A3": 220.00, "A#3": 233.08, "Bb3": 233.08, "B3": 246.94,

  // Octave 4 (Melody leads)
  "C4": 261.63, "C#4": 277.18, "Db4": 277.18, "D4": 293.66, "D#4": 311.13, "Eb4": 311.13,
  "E4": 329.63, "F4": 349.23, "F#4": 369.99, "Gb4": 369.99, "G4": 392.00, "G#4": 415.30,
  "Ab4": 415.30, "A4": 440.00, "A#4": 466.16, "Bb4": 466.16, "B4": 493.88,

  // Octave 5 (Sparkle accents & high pentatonics)
  "C5": 523.25, "C#5": 554.37, "Db5": 554.37, "D5": 587.33, "D#5": 622.25, "Eb5": 622.25,
  "E5": 659.25, "F5": 698.46, "F#5": 739.99, "Gb5": 739.99, "G5": 783.99, "G#5": 830.61,
  "Ab5": 830.61, "A5": 880.00, "A#5": 932.33, "Bb5": 932.33, "B5": 987.77,
  "C6": 1046.50
};

export function getFreq(note) {
  if (!note) return 440;
  if (typeof note === "number") return note;
  const clean = note.trim();
  if (NOTE_FREQUENCIES[clean]) return NOTE_FREQUENCIES[clean];
  // Basic fallback calculation if octave is higher/lower
  const noteMatch = clean.match(/^([A-G][b#]?)([0-8])$/i);
  if (noteMatch) {
    const semitones = { "C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4, "F": 5, "F#": 6, "GB": 6, "G": 7, "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11 };
    const letter = noteMatch[1].toUpperCase();
    const octave = parseInt(noteMatch[2], 10);
    const semitone = semitones[letter] ?? 0;
    const midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  return 440;
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.filterNode = null;
    this.delayNode = null;
    this.delayGain = null;
    this.compressor = null;
    this.isMuted = false;
    this.volume = 0.8;
    this.isInitialized = false;

    // Active Soundscape configuration (defaults to C Major Pentatonic)
    this.currentSoundscape = {
      mood: "Playful Sunrise",
      scale: ["C4", "D4", "E4", "G4", "A4", "C5"],
      chordProgression: [
        ["C3", "G3", "E4"],
        ["A2", "E3", "C4"],
        ["F2", "C3", "A3"],
        ["G2", "D3", "B3"]
      ],
      envelope: {
        attack: 0.04,
        decay: 0.22,
        sustain: 0.25,
        release: 0.75
      },
      timbre: "triangle", // 'triangle', 'sine', 'sawtooth'
      filterCutoff: 1800,
      encouragementSnippet: "Welcome to StepSynth. Every step builds your outdoor soundtrack."
    };

    // Note cycling index
    this.noteStepCounter = 0;
  }

  // Initialize Web Audio Context after user interaction (strict browser policy)
  init() {
    if (this.isInitialized && this.ctx && this.ctx.state !== "closed") {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Compressor / Limiter to ensure gentle, rich dynamics without clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Lowpass Filter to shape the warmth of notes
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(this.currentSoundscape.filterCutoff, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.8, this.ctx.currentTime);

      // Ambient Delay / Echo network for spatial acoustic immersion
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.setValueAtTime(0.32, this.ctx.currentTime);
      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

      // Feedback loop
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.delayNode);

      // Master Volume
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      // Routing: Synth Voices -> Filter -> MasterGain -> Compressor -> Destination
      // + Filter -> Delay -> DelayGain -> MasterGain
      this.filterNode.connect(this.masterGain);
      this.filterNode.connect(this.delayNode);
      this.delayGain.connect(this.masterGain);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error("Web Audio initialization failed:", err);
      return false;
    }
  }

  resumeIfNeeded() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : this.volume, now + 0.05);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (!this.isMuted && this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // Update dynamic soundscape config from AI conductor or preset
  updateSoundscape(newConfig) {
    if (!newConfig) return;
    this.currentSoundscape = {
      ...this.currentSoundscape,
      ...newConfig,
      scale: Array.isArray(newConfig.scale) && newConfig.scale.length > 0
        ? newConfig.scale
        : this.currentSoundscape.scale,
      chordProgression: Array.isArray(newConfig.chordProgression) && newConfig.chordProgression.length > 0
        ? newConfig.chordProgression
        : this.currentSoundscape.chordProgression,
      envelope: {
        ...this.currentSoundscape.envelope,
        ...(newConfig.envelope || {})
      }
    };

    // Dynamically adjust filter cutoff for brighter/warmer moods
    if (this.filterNode && this.ctx) {
      const cutoff = newConfig.filterCutoff || (newConfig.mood?.includes("Brisk") || newConfig.mood?.includes("March") ? 2600 : 1800);
      this.filterNode.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.4);
    }
  }

  // Play an acoustic step sound: Lead melody note + optional chord foundation + tactile sub-thump
  playStepNote(stepIndex = 0, cadenceBPM = 100) {
    this.resumeIfNeeded();
    if (!this.ctx || this.isMuted) return null;

    const now = this.ctx.currentTime;
    const { scale, chordProgression, envelope, timbre = "triangle" } = this.currentSoundscape;

    // Pick melody note in sequence or dynamic arc
    const scaleLen = scale.length;
    // Creates a musical rising & falling phrase across steps
    const noteIdx = (stepIndex % (scaleLen * 2 - 2) < scaleLen)
      ? (stepIndex % (scaleLen * 2 - 2))
      : (scaleLen * 2 - 2 - (stepIndex % (scaleLen * 2 - 2)));

    const melodyNote = scale[noteIdx % scaleLen] || "C4";
    const melodyFreq = getFreq(melodyNote);

    // 1. Play Lead Voice
    this.triggerMelodyVoice(melodyFreq, now, envelope, timbre, cadenceBPM);

    // 2. Play Tactile "Footstep Thump" (subtle acoustic transient pulse)
    this.triggerStepThump(now);

    // 3. Play Chord Harmony every 4 steps (e.g., bar beginnings: steps 0, 4, 8, 12...)
    const isBarStart = stepIndex % 4 === 0;
    if (isBarStart && chordProgression.length > 0) {
      const chordIndex = Math.floor(stepIndex / 4) % chordProgression.length;
      const currentChord = chordProgression[chordIndex];
      this.triggerChordVoice(currentChord, now, envelope);
    }

    return {
      note: melodyNote,
      freq: melodyFreq,
      isChord: isBarStart,
      stepIndex
    };
  }

  // Lead melody synth voice
  triggerMelodyVoice(freq, startTime, envelope, timbre, cadenceBPM) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = timbre;
    osc.frequency.setValueAtTime(freq, startTime);

    // Micro pitch-bend on attack for organic analog acoustic warmth
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.02);

    // Calculate tempo-adapted envelope
    const tempoRatio = Math.max(0.6, Math.min(1.5, 100 / (cadenceBPM || 100)));
    const attack = Math.max(0.01, (envelope.attack || 0.04) * tempoRatio);
    const decay = Math.max(0.05, (envelope.decay || 0.22) * tempoRatio);
    const sustainLevel = Math.max(0.05, envelope.sustain || 0.25);
    const release = Math.max(0.1, (envelope.release || 0.7) * tempoRatio);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.42, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.42 * sustainLevel, startTime + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay + release);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(startTime);
    osc.stop(startTime + attack + decay + release + 0.05);
  }

  // Warm chord harmony voice
  triggerChordVoice(chordNotes, startTime, envelope) {
    if (!Array.isArray(chordNotes)) return;

    chordNotes.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine"; // Warm, non-clashing pad tone
      const freq = getFreq(note);
      osc.frequency.setValueAtTime(freq, startTime);

      const chordAttack = (envelope.attack || 0.05) + 0.08;
      const chordDuration = 1.6; // Extended sustain for lingering harmony

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + chordAttack);
      gain.gain.exponentialRampToValueAtTime(0.08, startTime + chordDuration * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + chordDuration);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(startTime);
      osc.stop(startTime + chordDuration + 0.05);
    });
  }

  // Tactile low-end transient thump mimicking a physical foot striking grass/earth
  triggerStepThump(startTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Pitch drops rapidly from 120Hz to 40Hz for a soft natural thud
    osc.frequency.setValueAtTime(115, startTime);
    osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.08);

    gain.gain.setValueAtTime(0.28, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.1);
  }

  // Play a 12-15 second compressed musical replay of the entire walk
  playWalkReplay(stepHistory = [], onProgress = null, onFinish = null) {
    this.resumeIfNeeded();
    if (!this.ctx || stepHistory.length === 0) {
      if (onFinish) onFinish();
      return;
    }

    const totalSteps = stepHistory.length;
    // Map total steps into a concise 12-second replay
    const targetDurationSec = Math.min(14, Math.max(6, totalSteps * 0.12));
    const stepInterval = targetDurationSec / totalSteps;

    const baseTime = this.ctx.currentTime + 0.1;

    stepHistory.forEach((item, index) => {
      const playAt = baseTime + index * stepInterval;
      const noteFreq = item.freq || getFreq(item.note || "C4");

      // Schedule note
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(noteFreq, playAt);

      gain.gain.setValueAtTime(0.0001, playAt);
      gain.gain.exponentialRampToValueAtTime(0.35, playAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, playAt + stepInterval * 0.95);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(playAt);
      osc.stop(playAt + stepInterval);

      // Play chord burst every 8 steps in replay
      if (index % 8 === 0 && this.currentSoundscape.chordProgression.length > 0) {
        const chord = this.currentSoundscape.chordProgression[Math.floor(index / 8) % this.currentSoundscape.chordProgression.length];
        this.triggerChordVoice(chord, playAt, { attack: 0.02, release: stepInterval * 2 });
      }

      // Progress notification
      if (onProgress) {
        setTimeout(() => {
          onProgress((index + 1) / totalSteps);
        }, (playAt - this.ctx.currentTime) * 1000);
      }
    });

    if (onFinish) {
      setTimeout(() => {
        onFinish();
      }, targetDurationSec * 1000 + 400);
    }
  }
}

// Singleton export
export const audioEngine = new AudioEngine();
