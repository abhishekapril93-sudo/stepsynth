// App.jsx - StepSynth (SonicStrides) Main Application
// Interactive walking soundtrack generator for Hacktoberfest 2026 "Touch Grass" Challenge.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Volume2, VolumeX, Sparkles, Settings, Smartphone, 
  Play, Pause, RotateCcw, Award, Compass, Music, Flame,
  Share2, ChevronRight, Activity, Zap, CheckCircle2, Moon
} from 'lucide-react';

import { audioEngine } from './services/AudioEngine';
import { useStepDetector } from './hooks/useStepDetector';
import { 
  consultAiConductor, 
  getStoredApiKey, 
  saveStoredApiKey, 
  getStoredModel, 
  saveStoredModel, 
  OPEN_MODELS 
} from './services/aiConductorService';

const PRESET_SOUNDSCAPES = [
  {
    id: "sunrise",
    name: "Sunrise Pentatonic",
    mood: "Playful Sunrise",
    scale: ["C4", "D4", "E4", "G4", "A4", "C5"],
    chordProgression: [["C3", "G3", "E4"], ["A2", "E3", "C4"], ["F2", "C3", "A3"], ["G2", "D3", "B3"]],
    envelope: { attack: 0.04, decay: 0.22, sustain: 0.28, release: 0.75 },
    filterCutoff: 1900,
    encouragementSnippet: "Warm, uplifting major tones rewarding steady forward movement."
  },
  {
    id: "dorian",
    name: "Dorian Forest Drive",
    mood: "Forest Reverie",
    scale: ["D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    chordProgression: [["D2", "A2", "F3"], ["G2", "D3", "B3"], ["C3", "G3", "E4"], ["A2", "E3", "C4"]],
    envelope: { attack: 0.02, decay: 0.18, sustain: 0.22, release: 0.65 },
    filterCutoff: 2200,
    encouragementSnippet: "Mystical woodland harmonies with an adventurous walking cadence."
  },
  {
    id: "lydian",
    name: "Lydian Sky Stride",
    mood: "Lydian Explorer",
    scale: ["F4", "G4", "A4", "B4", "C5", "D5", "E5"],
    chordProgression: [["F2", "C3", "A3"], ["G2", "D3", "B3"], ["A2", "E3", "C4"], ["C3", "G3", "E4"]],
    envelope: { attack: 0.02, decay: 0.15, sustain: 0.2, release: 0.5 },
    filterCutoff: 2600,
    encouragementSnippet: "Floating, bright dreamscapes for crisp, brisk outdoor strides."
  },
  {
    id: "ambient",
    name: "Twilight Wanderer",
    mood: "Ambient Float",
    scale: ["A3", "C4", "D4", "E4", "G4", "A4"],
    chordProgression: [["A2", "E3", "C4"], ["F2", "C3", "A3"], ["D2", "A2", "F3"], ["E2", "B2", "G3"]],
    envelope: { attack: 0.08, decay: 0.35, sustain: 0.45, release: 1.2 },
    filterCutoff: 1300,
    encouragementSnippet: "Slow, introspective soundscapes for mindful evening strolls."
  }
];

export default function App() {
  // Soundscape state
  const [activeSoundscape, setActiveSoundscape] = useState(PRESET_SOUNDSCAPES[0]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [lastPlayedNote, setLastPlayedNote] = useState("C4");
  const [isConductorThinking, setIsConductorThinking] = useState(false);
  const [conductorStatus, setConductorStatus] = useState("Procedural Conductor Active");
  const [aiEvolutionCount, setAiEvolutionCount] = useState(0);

  // Stepping visual feedback
  const [isOrbStepping, setIsOrbStepping] = useState(false);

  // Modals & Screen modes
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isPocketMode, setIsPocketMode] = useState(false);

  // Settings form state
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey());
  const [selectedModel, setSelectedModel] = useState(getStoredModel());
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);

  // Step history for replay & stats
  const stepHistoryRef = useRef([]);

  // Audio trigger on step
  const handleStep = useCallback((count, currentCadence) => {
    // 1. Play immediate audio note (Zero-Latency Web Audio API)
    const audioResult = audioEngine.playStepNote(count, currentCadence);
    if (audioResult) {
      setLastPlayedNote(audioResult.note);
      stepHistoryRef.current.push({
        step: count,
        note: audioResult.note,
        freq: audioResult.freq,
        cadence: currentCadence,
        time: Date.now()
      });
    }

    // 2. Trigger orb pulse animation
    setIsOrbStepping(true);
    setTimeout(() => setIsOrbStepping(false), 320);

    // 3. Conductor Evolution Trigger: Every 16 steps
    if (count > 0 && count % 16 === 0) {
      triggerConductorEvolution(count, currentCadence);
    }
  }, [activeSoundscape]);

  // Step Detector Hook
  const {
    stepCount,
    cadenceBPM,
    consistencyScore,
    walkDurationSeconds,
    isActive,
    hasMotionPermission,
    permissionError,
    isAutoSimulating,
    autoSimTempo,
    setAutoSimTempo,
    triggerManualStep,
    requestMotionPermission,
    toggleAutoSimulator,
    resetSession,
    setIsActive
  } = useStepDetector({ onStep: handleStep });

  // Trigger Open-Weight AI Conductor
  const triggerConductorEvolution = async (currentCount, currentBPM) => {
    setIsConductorThinking(true);
    try {
      const response = await consultAiConductor({
        currentCadenceBPM: currentBPM || 100,
        totalSteps: currentCount,
        walkDurationSeconds: walkDurationSeconds || 20,
        stepConsistencyScore: consistencyScore || 85,
        currentMood: activeSoundscape.mood
      });

      if (response && response.data) {
        const newSoundscape = response.data;
        setActiveSoundscape(newSoundscape);
        audioEngine.updateSoundscape(newSoundscape);
        setAiEvolutionCount((prev) => prev + 1);

        if (response.isProceduralFallback) {
          setConductorStatus("Procedural Music Engine (Harmonic Shift)");
        } else {
          setConductorStatus(`Gemma 2 Open Conductor (${response.modelUsed || 'Open-Weight'})`);
        }
      }
    } catch (err) {
      console.warn("Conductor evolution failed:", err);
    } finally {
      setIsConductorThinking(false);
    }
  };

  // Switch soundscape preset
  const selectPreset = (preset) => {
    setActiveSoundscape(preset);
    audioEngine.updateSoundscape(preset);
    setConductorStatus(`Preset: ${preset.name}`);
  };

  // Toggle Mute
  const toggleMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
  };

  // Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveStoredApiKey(apiKeyInput);
    saveStoredModel(selectedModel);
    setSettingsSuccess(true);
    setTimeout(() => {
      setSettingsSuccess(false);
      setIsSettingsOpen(false);
    }, 900);
  };

  // Finish Walk & Open Summary
  const handleFinishWalk = () => {
    setIsActive(false);
    setIsSummaryOpen(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore if confetti blocked
    }
  };

  // 15-Second Walk Soundtrack Replay
  const handlePlayReplay = () => {
    if (isReplaying || stepHistoryRef.current.length === 0) return;
    setIsReplaying(true);
    setReplayProgress(0);

    audioEngine.playWalkReplay(
      stepHistoryRef.current,
      (progress) => setReplayProgress(progress),
      () => {
        setIsReplaying(false);
        setReplayProgress(1);
      }
    );
  };

  // Format Duration seconds to MM:SS
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate Distance & Calories
  const distanceMeters = Math.round(stepCount * 0.76); // average stride 0.76m
  const caloriesBurned = Math.round(stepCount * 0.04); // ~0.04 kcal per step

  // Next evolution countdown
  const stepsToNextEvolution = 16 - (stepCount % 16);

  // Cadence Pace Description
  const getPaceLabel = (bpm) => {
    if (bpm === 0) return "At Rest";
    if (bpm < 85) return "Gentle Stroll";
    if (bpm < 110) return "Steady Cruise";
    if (bpm < 130) return "Brisk Walk";
    return "Aerobic Stride";
  };

  return (
    <div className="app-container">
      {/* Pocket Mode (AMOLED Screen Dimmer for Outdoor Walking) */}
      {isPocketMode && (
        <div className="pocket-mode" onClick={() => triggerManualStep()}>
          <div className="pocket-mode-header">
            <span>POCKET MODE (AUDIO ACTIVE)</span>
            <button 
              className="btn-icon" 
              onClick={(e) => { e.stopPropagation(); setIsPocketMode(false); }}
              title="Exit Pocket Mode"
            >
              <Moon size={18} />
            </button>
          </div>
          <div className="pocket-tap-surface">
            <div className="pocket-step-count">{stepCount}</div>
            <div className="pocket-subtext">{getPaceLabel(cadenceBPM)} · {cadenceBPM} SPM</div>
            <div style={{ color: '#06b6d4', marginTop: '1.5rem', fontSize: '0.85rem' }}>
              Tap anywhere to step · Lock & pocket phone
            </div>
          </div>
          <div className="pocket-mode-footer">
            <button 
              className="btn-secondary" 
              onClick={(e) => { e.stopPropagation(); setIsPocketMode(false); }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Music size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 className="brand-title">StepSynth</h1>
              <span className="hacktober-tag">Touch Grass 2026</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              Open-Weight AI Walking Soundtrack Generator
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className={`btn-icon ${isPocketMode ? 'active' : ''}`}
            onClick={() => setIsPocketMode(true)}
            title="Pocket Mode (AMOLED Low-Glare Outdoor Display)"
            id="pocket-mode-toggle"
          >
            <Smartphone size={18} />
          </button>

          <button 
            className={`btn-icon ${isAudioMuted ? 'active' : ''}`}
            onClick={toggleMute}
            title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
            id="audio-mute-toggle"
          >
            {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button 
            className="btn-icon"
            onClick={() => setIsSettingsOpen(true)}
            title="Open AI Model & Audio Settings"
            id="settings-toggle"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* AI Conductor Live Status Banner */}
      <section className="conductor-card" aria-label="AI Conductor Status">
        <div className="conductor-header">
          <div className={`conductor-badge ${isConductorThinking ? 'pulse' : 'live'}`}>
            <span className="pulse-dot"></span>
            <span>{isConductorThinking ? "Gemma 2 Composing..." : conductorStatus}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              Next Evolution in:
            </span>
            <span style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              color: 'var(--emerald-light)',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '2px 8px',
              borderRadius: '999px'
            }}>
              {stepsToNextEvolution} {stepsToNextEvolution === 1 ? 'step' : 'steps'}
            </span>
          </div>
        </div>

        <div className="conductor-mood-title">
          <Sparkles size={18} style={{ color: 'var(--cyan)' }} />
          <span>{activeSoundscape.mood}</span>
        </div>

        <p className="conductor-quote">
          "{activeSoundscape.encouragementSnippet || "Every physical footstep shapes your real-time soundtrack."}"
        </p>

        <div className="scale-chips-row">
          <span className="scale-label">Active Scale:</span>
          {activeSoundscape.scale?.map((note, idx) => (
            <span 
              key={`${note}-${idx}`} 
              className={`note-chip ${lastPlayedNote === note ? 'active' : ''}`}
            >
              {note}
            </span>
          ))}
        </div>
      </section>

      {/* Central Soundstage / Step Orb */}
      <main className="soundstage-card">
        {/* Concentric Audio Reactive Pulse Rings */}
        <div className={`orb-wrapper ${isOrbStepping ? 'stepping' : ''}`}>
          <div className="pulse-ring ring-3"></div>
          <div className="pulse-ring ring-2"></div>
          <div className="pulse-ring ring-1"></div>

          {/* Central Touch Orb */}
          <button 
            className={`step-orb ${isOrbStepping ? 'active-pulse' : ''}`}
            onClick={triggerManualStep}
            id="step-orb-trigger"
            aria-label="Tap to take a step"
          >
            <span className="step-number">{stepCount}</span>
            <span className="step-label">Steps</span>
            <span className="step-last-note">♪ {lastPlayedNote}</span>
          </button>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="telemetry-grid">
          {/* Cadence SPM */}
          <div className="metric-card">
            <div className="metric-header">
              <Activity size={14} style={{ color: 'var(--emerald)' }} />
              <span>Cadence</span>
            </div>
            <div className="metric-value">
              {cadenceBPM} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>SPM</span>
            </div>
            <div className="cadence-gauge-bar">
              <div 
                className="cadence-gauge-fill" 
                style={{ width: `${Math.min(100, Math.max(10, (cadenceBPM / 160) * 100))}%` }}
              ></div>
            </div>
            <div className="metric-sub">{getPaceLabel(cadenceBPM)}</div>
          </div>

          {/* Duration */}
          <div className="metric-card">
            <div className="metric-header">
              <Compass size={14} style={{ color: 'var(--cyan)' }} />
              <span>Outdoor Time</span>
            </div>
            <div className="metric-value">
              {formatTime(walkDurationSeconds)}
            </div>
            <div className="metric-sub">
              {isActive ? "Walk in progress" : "Ready to step"}
            </div>
          </div>

          {/* Consistency */}
          <div className="metric-card">
            <div className="metric-header">
              <Zap size={14} style={{ color: 'var(--violet)' }} />
              <span>Rhythm</span>
            </div>
            <div className="metric-value">
              {consistencyScore}<span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>%</span>
            </div>
            <div className="metric-sub">
              {consistencyScore > 85 ? "Steady cadence" : "Freeform walk"}
            </div>
          </div>

          {/* Energy & Distance */}
          <div className="metric-card">
            <div className="metric-header">
              <Flame size={14} style={{ color: 'var(--amber)' }} />
              <span>Activity</span>
            </div>
            <div className="metric-value">
              {distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(2)} km` : `${distanceMeters} m`}
            </div>
            <div className="metric-sub">
              ~{caloriesBurned} kcal burned
            </div>
          </div>
        </div>
      </main>

      {/* Control Bar: Desktop Simulator, Sensor Permission & Presets */}
      <section className="controls-card">
        <div className="controls-row">
          <div className="simulator-controls">
            <button 
              className="btn-primary" 
              onClick={triggerManualStep}
              id="desktop-tap-button"
            >
              <Zap size={16} />
              <span>Tap Step (Spacebar)</span>
            </button>

            <button 
              className={`btn-secondary ${isAutoSimulating ? 'active' : ''}`}
              onClick={() => toggleAutoSimulator(autoSimTempo)}
              id="auto-simulator-toggle"
              title="Automatically simulate walking footsteps at set tempo"
            >
              {isAutoSimulating ? <Pause size={16} /> : <Play size={16} />}
              <span>{isAutoSimulating ? "Stop Simulator" : "Auto-Walk Demo"}</span>
            </button>

            {isAutoSimulating && (
              <div className="tempo-slider-group">
                <span>Tempo:</span>
                <input 
                  type="range" 
                  min="60" 
                  max="150" 
                  value={autoSimTempo}
                  onChange={(e) => setAutoSimTempo(Number(e.target.value))}
                  className="tempo-slider"
                />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{autoSimTempo} SPM</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!hasMotionPermission && (
              <button 
                className="btn-secondary"
                onClick={requestMotionPermission}
                id="request-motion-button"
                title="Enable smartphone accelerometer"
              >
                <Smartphone size={16} />
                <span>Enable Accelerometer</span>
              </button>
            )}

            <button 
              className="btn-secondary"
              onClick={handleFinishWalk}
              disabled={stepCount === 0}
              id="finish-walk-button"
            >
              <Award size={16} />
              <span>Finish Walk</span>
            </button>

            <button 
              className="btn-icon" 
              onClick={resetSession}
              title="Reset current session"
              id="reset-session-button"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Quick Presets Picker */}
        <div className="presets-row">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, flexShrink: 0 }}>
            Soundscape Presets:
          </span>
          {PRESET_SOUNDSCAPES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => selectPreset(preset)}
              className={`note-chip ${activeSoundscape.mood === preset.mood ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </section>

      {/* End-of-Walk Summary Modal with 15-Second Musical Replay */}
      {isSummaryOpen && (
        <div className="modal-backdrop" onClick={() => setIsSummaryOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} style={{ color: 'var(--emerald-light)' }} />
                <h3 className="modal-title">Outdoor Walk Completed!</h3>
              </div>
              <button className="btn-icon" onClick={() => setIsSummaryOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.08)', 
                border: '1px solid rgba(16, 185, 129, 0.25)', 
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Walk Soundscape Title
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                  "{activeSoundscape.mood} Walk"
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--emerald-light)', marginTop: '4px' }}>
                  Conducted across {aiEvolutionCount} dynamic musical evolutions
                </div>
              </div>

              {/* Walk Statistics Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="metric-card">
                  <span className="metric-header">Total Steps</span>
                  <span className="metric-value">{stepCount}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-header">Duration</span>
                  <span className="metric-value">{formatTime(walkDurationSeconds)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-header">Distance</span>
                  <span className="metric-value">{distanceMeters} m</span>
                </div>
                <div className="metric-card">
                  <span className="metric-header">Rhythm Consistency</span>
                  <span className="metric-value">{consistencyScore}%</span>
                </div>
              </div>

              {/* 15-Second Walk Soundtrack Replay */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>
                      Compressed 15s Walk Soundtrack
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Listen to your physical journey played back as an accelerated melody.
                    </div>
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={handlePlayReplay}
                    disabled={isReplaying || stepHistoryRef.current.length === 0}
                    id="replay-soundtrack-button"
                  >
                    {isReplaying ? <Activity className="animate-spin" size={16} /> : <Play size={16} />}
                    <span>{isReplaying ? "Playing..." : "Play Replay"}</span>
                  </button>
                </div>

                {isReplaying && (
                  <div className="replay-progress-bar">
                    <div className="replay-progress-fill" style={{ width: `${replayProgress * 100}%` }}></div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  const summaryText = `🚶‍♂️ StepSynth Walk Complete!\n👣 Steps: ${stepCount} | ⏱️ Duration: ${formatTime(walkDurationSeconds)}\n🎵 Soundscape: ${activeSoundscape.mood}\n🌿 Touch Grass Hacktoberfest 2026`;
                  navigator.clipboard?.writeText(summaryText);
                  alert("Walk summary copied to clipboard!");
                }}
              >
                <Share2 size={16} />
                <span>Copy Summary</span>
              </button>
              <button className="btn-primary" onClick={() => setIsSummaryOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (API Key & Model Configuration) */}
      {isSettingsOpen && (
        <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} style={{ color: 'var(--cyan)' }} />
                <h3 className="modal-title">Conductor & Audio Settings</h3>
              </div>
              <button className="btn-icon" onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="api-key-input">
                    Groq / Open-Weight API Key (Optional)
                  </label>
                  <input 
                    id="api-key-input"
                    type="password"
                    placeholder="gsk_..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="form-input"
                  />
                  <p className="form-help">
                    Free keys are available at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>console.groq.com</a>.
                    If left blank, StepSynth seamlessly uses the built-in <strong>Procedural Music Theory Engine</strong> with zero latency.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="model-select">
                    Open-Weight Conductor Model
                  </label>
                  <select 
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="form-select"
                  >
                    {OPEN_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                  <p className="form-help">
                    Google's Gemma 2 (9B) provides ultra-fast JSON composition ideal for real-time cadence response.
                  </p>
                </div>

                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.04)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}>
                  🔒 <strong>Privacy & Client-Side Execution:</strong> All audio synthesis runs 100% locally on your device via the Web Audio API. Your API key is stored only in your local browser's `localStorage`.
                </div>
              </div>

              <div className="modal-footer">
                {settingsSuccess && (
                  <span style={{ color: 'var(--emerald-light)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={16} /> Saved!
                  </span>
                )}
                <button type="button" className="btn-secondary" onClick={() => setIsSettingsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" id="save-settings-button">
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
