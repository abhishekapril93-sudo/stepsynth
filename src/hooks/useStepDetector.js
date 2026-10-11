// useStepDetector.js - Accelerometer & Step Detection Hook for StepSynth
// Supports mobile DeviceMotionEvent, iOS permission handling, cadence (SPM) calculation,
// consistency analysis, and a desktop simulator/manual tap fallback.

import { useState, useEffect, useRef, useCallback } from 'react';

export function useStepDetector({ onStep, sensitivity = 1.2 } = {}) {
  const [stepCount, setStepCount] = useState(0);
  const [cadenceBPM, setCadenceBPM] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(85);
  const [isActive, setIsActive] = useState(false);
  const [hasMotionPermission, setHasMotionPermission] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [walkDurationSeconds, setWalkDurationSeconds] = useState(0);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [autoSimTempo, setAutoSimTempo] = useState(105); // BPM for simulated walk

  // Refs for tracking sensor math without rerender overhead
  const lastStepTimeRef = useRef(0);
  const stepIntervalsRef = useRef([]);
  const recentStepTimesRef = useRef([]);
  const baselineGravityRef = useRef(9.81);
  const isWalkingRef = useRef(false);
  const autoSimIntervalRef = useRef(null);
  const durationTimerRef = useRef(null);
  const sensitivityRef = useRef(sensitivity);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  // Duration timer when walk session is active
  useEffect(() => {
    if (isActive) {
      durationTimerRef.current = setInterval(() => {
        setWalkDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isActive]);

  // Cadence decay watcher: If no step occurs for > 2.8s, decay cadence to 0
  useEffect(() => {
    const cadenceDecayInterval = setInterval(() => {
      if (Date.now() - lastStepTimeRef.current > 2800 && cadenceBPM > 0) {
        setCadenceBPM(0);
      }
    }, 1000);
    return () => clearInterval(cadenceDecayInterval);
  }, [cadenceBPM]);

  // Core step execution logic
  const registerStep = useCallback(() => {
    const now = Date.now();
    const minStepIntervalMs = 280; // Minimum refractory period to avoid double-triggers

    if (now - lastStepTimeRef.current < minStepIntervalMs) {
      return; // Debounce rejected
    }

    const interval = now - lastStepTimeRef.current;
    lastStepTimeRef.current = now;

    // Maintain recent step timestamps for cadence (SPM)
    recentStepTimesRef.current.push(now);
    // Keep last 6 steps for sliding window
    if (recentStepTimesRef.current.length > 6) {
      recentStepTimesRef.current.shift();
    }

    // Calculate Cadence (Steps Per Minute)
    let currentBPM = 100;
    if (recentStepTimesRef.current.length >= 2) {
      const first = recentStepTimesRef.current[0];
      const last = recentStepTimesRef.current[recentStepTimesRef.current.length - 1];
      const durationSec = (last - first) / 1000;
      if (durationSec > 0.4) {
        const calculatedBPM = Math.round(((recentStepTimesRef.current.length - 1) / durationSec) * 60);
        currentBPM = Math.min(180, Math.max(45, calculatedBPM));
        setCadenceBPM(currentBPM);
      }
    } else {
      setCadenceBPM(100);
    }

    // Calculate Consistency Score based on interval standard deviation
    if (interval > 300 && interval < 2000) {
      stepIntervalsRef.current.push(interval);
      if (stepIntervalsRef.current.length > 8) {
        stepIntervalsRef.current.shift();
      }
      if (stepIntervalsRef.current.length >= 3) {
        const intervals = stepIntervalsRef.current;
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        // Normalize consistency: 0ms stdDev = 100%, 150ms stdDev = 50%
        const score = Math.max(40, Math.min(99, Math.round(100 - (stdDev / mean) * 100)));
        setConsistencyScore(score);
      }
    }

    // Trigger haptic vibration on mobile if available (tactile feedback!)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {
        // Ignore vibration errors if restricted
      }
    }

    setStepCount((prev) => {
      const nextCount = prev + 1;
      if (onStep) {
        onStep(nextCount, currentBPM);
      }
      return nextCount;
    });

    if (!isActive) {
      setIsActive(true);
    }
  }, [isActive, onStep]);

  // Request Mobile Accelerometer Permissions (iOS 13+ requires explicit user gesture)
  const requestMotionPermission = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    // Check if DeviceMotionEvent is supported
    if (!window.DeviceMotionEvent) {
      setPermissionError("Device motion not supported on this device/browser.");
      return false;
    }

    // Check if permission request function exists (iOS 13+)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === 'granted') {
          setHasMotionPermission(true);
          setPermissionError(null);
          return true;
        } else {
          setPermissionError("Motion sensor permission denied.");
          return false;
        }
      } catch (err) {
        setPermissionError(err.message || "Permission request failed");
        return false;
      }
    } else {
      // Android / Standard Browsers grant permission automatically
      setHasMotionPermission(true);
      return true;
    }
  }, []);

  // Motion event handler with dynamic peak detection
  useEffect(() => {
    if (!hasMotionPermission) return;

    let localPeak = 0;
    let isPeaking = false;

    const handleDeviceMotion = (event) => {
      // Get acceleration (prefer excluding gravity, or compute magnitude from total)
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;

      // Magnitude of total acceleration vector
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Smooth baseline gravity tracker (low pass)
      baselineGravityRef.current = baselineGravityRef.current * 0.95 + magnitude * 0.05;

      // Delta acceleration above gravity
      const delta = Math.abs(magnitude - baselineGravityRef.current);

      // Dynamic threshold scaled by user sensitivity setting
      // Default sensitivity 1.2 -> threshold ~ 2.0 m/s^2
      const stepThreshold = 2.4 / (sensitivityRef.current || 1.0);

      if (delta > stepThreshold && !isPeaking) {
        isPeaking = true;
        localPeak = delta;
      } else if (isPeaking && delta < stepThreshold * 0.75) {
        // Step peak recognized on descending slope
        isPeaking = false;
        registerStep();
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [hasMotionPermission, registerStep]);

  // Spacebar trigger for instant desktop testing
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if not typing inside an input or textarea
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        registerStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [registerStep]);

  // Auto-Walker Simulator for Desktop Demonstration
  const toggleAutoSimulator = useCallback((targetBPM = 105) => {
    if (isAutoSimulating) {
      if (autoSimIntervalRef.current) clearInterval(autoSimIntervalRef.current);
      setIsAutoSimulating(false);
    } else {
      setIsAutoSimulating(true);
      const intervalMs = (60 / targetBPM) * 1000;
      autoSimIntervalRef.current = setInterval(() => {
        registerStep();
      }, intervalMs);
    }
  }, [isAutoSimulating, registerStep]);

  // Update simulator interval if tempo slider is changed while active
  useEffect(() => {
    if (isAutoSimulating) {
      if (autoSimIntervalRef.current) clearInterval(autoSimIntervalRef.current);
      const intervalMs = (60 / autoSimTempo) * 1000;
      autoSimIntervalRef.current = setInterval(() => {
        registerStep();
      }, intervalMs);
    }
    return () => {
      if (autoSimIntervalRef.current) clearInterval(autoSimIntervalRef.current);
    };
  }, [autoSimTempo, isAutoSimulating, registerStep]);

  // Reset entire walk session
  const resetSession = useCallback(() => {
    if (autoSimIntervalRef.current) clearInterval(autoSimIntervalRef.current);
    setIsAutoSimulating(false);
    setStepCount(0);
    setCadenceBPM(0);
    setWalkDurationSeconds(0);
    setConsistencyScore(85);
    setIsActive(false);
    lastStepTimeRef.current = 0;
    stepIntervalsRef.current = [];
    recentStepTimesRef.current = [];
  }, []);

  return {
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
    triggerManualStep: registerStep,
    requestMotionPermission,
    toggleAutoSimulator,
    resetSession,
    setIsActive
  };
}
