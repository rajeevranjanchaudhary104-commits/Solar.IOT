import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Settings, 
  Bell, 
  BellOff, 
  ShieldAlert, 
  CheckCircle2, 
  Zap, 
  Flame, 
  TrendingUp, 
  Play, 
  X, 
  RotateCcw,
  Sliders,
  History,
  Activity,
  ArrowRight,
  Upload,
  Music,
  Mic,
  Square,
  Radio,
  Lock,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { OverloadThresholds, OverloadEvent } from '../types/solar';
import { OWNER_EMAILS, OWNER_EMAIL } from './ResearchMode';

interface OverloadAlertBannerProps {
  inverterLoadWatts: number;
  voltage: number | null;
  current: number | null;
  power: number | null;
  temperature: number | null;
  isHardwareConnected: boolean;
  onNavigateToStore?: () => void;
  isOwner?: boolean;
  user?: any;
  onRequireSignIn?: () => void;
}

const DEFAULT_THRESHOLDS: OverloadThresholds = {
  maxInverterLoadWatts: 800,  // Max recommended load on a 1kVA / 800W continuous inverter
  maxCurrentAmps: 5.0,        // Max DC shunt current
  maxVoltageVolts: 25.0,       // Max bus string voltage
  maxTemperatureC: 50.0,       // Max surface / enclosure temp
  shortCircuitCurrentAmps: 6.0, // High surge DC current indicates short-circuit
  shortCircuitVoltageDrop: 2.0, // Voltage collapse (<2.0V) under heavy load indicates dead short
  shortCircuitProtectionEnabled: true,
  autoTripRelayEnabled: true,
  audioAlarmEnabled: true,
  pushAlertEnabled: true,
  soundProfile: 'hindi_voice', // Default: "अरे लोड गिर गया! होश में आओ बे! ओ ये ओवरलोड है!"
  customAudioUrl: null,
  customAudioName: null,
};

export const OverloadAlertBanner: React.FC<OverloadAlertBannerProps> = ({
  inverterLoadWatts,
  voltage,
  current,
  power,
  temperature,
  isHardwareConnected,
  onNavigateToStore,
  isOwner = false,
  user,
  onRequireSignIn
}) => {
  const isUserOwner = Boolean(
    isOwner || 
    (user?.email && OWNER_EMAILS.includes(user.email.trim().toLowerCase()))
  );

  // Load saved thresholds
  const [thresholds, setThresholds] = useState<OverloadThresholds>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_overload_thresholds');
      if (saved) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_THRESHOLDS;
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSoundModal, setShowSoundModal] = useState<boolean>(false);
  const [showLimitsModal, setShowLimitsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [soundModalMsg, setSoundModalMsg] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [simulatedType, setSimulatedType] = useState<'none' | 'overload' | 'short_circuit'>('none');
  const [isRelayTripped, setIsRelayTripped] = useState<boolean>(false);

  const showToastNotice = useCallback((text: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToastNotice({ text, type });
    setTimeout(() => {
      setToastNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  // Draft state for sound configuration in the sound modal
  const [draftSoundProfile, setDraftSoundProfile] = useState<OverloadThresholds['soundProfile']>('hindi_voice');
  const [draftCustomAudioUrl, setDraftCustomAudioUrl] = useState<string | null>(null);
  const [draftCustomAudioName, setDraftCustomAudioName] = useState<string | null>(null);
  const [draftAudioAlarmEnabled, setDraftAudioAlarmEnabled] = useState<boolean>(true);

  // Overload log history
  const [history, setHistory] = useState<OverloadEvent[]>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_overload_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Audio Context Ref for Synthesized Buzzer and Audio player
  const audioCtxRef = useRef<AudioContext | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertTimestampRef = useRef<number>(0);
  const lastSpeechTimestampRef = useRef<number>(0);
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Open sound modal with current values
  const handleOpenSoundModal = () => {
    setDraftSoundProfile(thresholds.soundProfile || 'hindi_voice');
    setDraftCustomAudioUrl(thresholds.customAudioUrl || null);
    setDraftCustomAudioName(thresholds.customAudioName || null);
    setDraftAudioAlarmEnabled(thresholds.audioAlarmEnabled ?? true);
    setSoundModalMsg(null);
    setShowSoundModal(true);
  };

  // Save sound profile (strictly restricted to owner)
  const handleSaveSoundProfile = () => {
    if (!isUserOwner) {
      setSoundModalMsg(`Permission Denied: Only verified owner (${OWNER_EMAIL}) can update alert sound.`);
      showToastNotice(`Access denied: Only ${OWNER_EMAIL} can update alert sound settings.`, 'error');
      return;
    }
    const updated: OverloadThresholds = {
      ...thresholds,
      soundProfile: draftSoundProfile,
      customAudioUrl: draftCustomAudioUrl,
      customAudioName: draftCustomAudioName,
      audioAlarmEnabled: draftAudioAlarmEnabled,
    };
    setThresholds(updated);
    localStorage.setItem('solar_iot_overload_thresholds', JSON.stringify(updated));
    setShowSoundModal(false);
    showToastNotice('Alert audio profile saved.', 'success');
  };

  // Save thresholds (uses non-blocking UI toast instead of native alert)
  const handleSaveThresholds = (newThresh: OverloadThresholds) => {
    if (!isUserOwner) {
      showToastNotice(`Access denied: Only ${OWNER_EMAIL} can change safety threshold limits.`, 'error');
      return;
    }
    setThresholds(newThresh);
    localStorage.setItem('solar_iot_overload_thresholds', JSON.stringify(newThresh));
    setShowLimitsModal(false);
    showToastNotice('Safety threshold limits updated.', 'success');
  };

  // Simulation trigger helper
  const triggerSimulation = (type: 'overload' | 'short_circuit') => {
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
    }
    setSimulatedType(type);
    setDismissedUntil(null);
    simulationTimeoutRef.current = setTimeout(() => {
      setSimulatedType('none');
      simulationTimeoutRef.current = null;
    }, 12000);
  };

  const cancelSimulation = () => {
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }
    setSimulatedType('none');
  };

  // Evaluate Short-Circuit Condition:
  // 1. Extreme current surge exceeding shortCircuitCurrentAmps (>= 6.0A)
  // 2. High current (> 2.5A) with voltage collapse (< 2.0V) indicates dead short
  const isRealShortCircuit = thresholds.shortCircuitProtectionEnabled !== false && (
    (current !== null && current >= (thresholds.shortCircuitCurrentAmps ?? 6.0)) ||
    (current !== null && current > 2.5 && voltage !== null && voltage < (thresholds.shortCircuitVoltageDrop ?? 2.0))
  );

  const isShortCircuitActive = (isRealShortCircuit || simulatedType === 'short_circuit') && (dismissedUntil === null || Date.now() > dismissedUntil);

  // Evaluate active overload conditions
  const isLoadOverload = inverterLoadWatts > thresholds.maxInverterLoadWatts;
  const isCurrentOverload = current !== null && current > thresholds.maxCurrentAmps;
  const isVoltageOverload = voltage !== null && voltage > thresholds.maxVoltageVolts;
  const isTempOverload = temperature !== null && temperature > thresholds.maxTemperatureC;

  const isAnyRealOverload = isLoadOverload || isCurrentOverload || isVoltageOverload || isTempOverload;
  const isOverloadActive = (isShortCircuitActive || isAnyRealOverload || simulatedType === 'overload') && (dismissedUntil === null || Date.now() > dismissedUntil);

  // Determine Primary Overload / Short-Circuit Metric
  let primaryType: OverloadEvent['type'] = 'inverter_load';
  let primaryTitle = 'Inverter AC Load Overload';
  let primaryValue = inverterLoadWatts;
  let primaryThreshold = thresholds.maxInverterLoadWatts;
  let primaryUnit = 'W';
  let primaryRecommendation = 'Shed high-draw inductive AC appliances (heaters, water pumps, microwave) immediately to prevent inverter automatic circuit tripping.';

  if (isShortCircuitActive) {
    primaryType = 'short_circuit';
    primaryTitle = '⚡ Dead Short-Circuit Protection Trip';
    primaryValue = simulatedType === 'short_circuit' ? 8.2 : (current ?? 6.5);
    primaryThreshold = thresholds.shortCircuitCurrentAmps ?? 6.0;
    primaryUnit = 'A';
    primaryRecommendation = 'CATASTROPHIC SHORT-CIRCUIT DETECTED: Instant impedance collapse and excessive DC current surge! Automated circuit isolation active. Inspect DC isolator MCB, check for bridged contacts or shorted bypass diodes before re-closing.';
  } else if (isCurrentOverload && current !== null) {
    primaryType = 'current';
    primaryTitle = 'DC Shunt Overcurrent Warning';
    primaryValue = current;
    primaryThreshold = thresholds.maxCurrentAmps;
    primaryUnit = 'A';
    primaryRecommendation = 'Excessive DC current flowing across INA219 shunt. Check for short-circuits or excess solar string configuration.';
  } else if (isVoltageOverload && voltage !== null) {
    primaryType = 'voltage';
    primaryTitle = 'PV Array Overvoltage Surge';
    primaryValue = voltage;
    primaryThreshold = thresholds.maxVoltageVolts;
    primaryUnit = 'V';
    primaryRecommendation = 'Bus voltage exceeds rated DC operating limit. Ensure charge controller MPPT range is not exceeded.';
  } else if (isTempOverload && temperature !== null) {
    primaryType = 'thermal';
    primaryTitle = 'Thermal Overheat Alert';
    primaryValue = temperature;
    primaryThreshold = thresholds.maxTemperatureC;
    primaryUnit = '°C';
    primaryRecommendation = 'Module temperature exceeds 50°C. Power output derates by ~0.4%/°C. Activate water spray cooling or improve back-sheet ventilation.';
  } else if (simulatedType === 'overload') {
    primaryType = 'inverter_load';
    primaryTitle = 'Simulated Inverter Overload';
    primaryValue = 1150;
    primaryThreshold = thresholds.maxInverterLoadWatts;
    primaryUnit = 'W';
    primaryRecommendation = 'Test Overload Alert: Inverter load exceeded safety envelope. Audible voice siren and emergency push notification triggered.';
  }

  const excessPercent = Math.max(0, Math.round(((primaryValue - primaryThreshold) / primaryThreshold) * 100));

  // Synthesize Web Audio Alarm Siren (Dual-tone pitch shift)
  const playSirenBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch (e) {
      console.warn('Audio alarm playback note:', e);
    }
  }, []);

  // Synthesize Rapid Short-Circuit Multi-Chirp Alarm
  const playShortCircuitChirp = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1760, ctx.currentTime + i * 0.12);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + i * 0.12 + 0.08);
        gain.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.09);
      }
    } catch {}
  }, []);

  // Synthesize Piezo Buzzer Beep
  const playBuzzerBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, []);

  // Play Urgent Hindi Voice Alert (Speech Synthesis throttled to minimum 15-second interval)
  const playHindiVoiceAlert = useCallback((forcePreview = false) => {
    if (!('speechSynthesis' in window)) return;
    const now = Date.now();
    if (!forcePreview && now - lastSpeechTimestampRef.current < 15000) {
      return;
    }
    try {
      lastSpeechTimestampRef.current = now;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("अरे! अरे लोड गिर गया! हट! होश में आओ बे! ओ ये ओवरलोड है!");
      utterance.rate = 1.15;
      utterance.pitch = 1.25;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.toLowerCase().includes('hi'));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }
      utterance.lang = 'hi-IN';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis note:', e);
    }
  }, []);

  // Play Urgent Short Circuit Voice Alert (throttled to minimum 15-second interval)
  const playShortCircuitVoiceAlert = useCallback((forcePreview = false) => {
    if (!('speechSynthesis' in window)) return;
    const now = Date.now();
    if (!forcePreview && now - lastSpeechTimestampRef.current < 15000) {
      return;
    }
    try {
      lastSpeechTimestampRef.current = now;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("चेतावनी! शॉर्ट सर्किट का खतरा! सर्किट ट्रिप करें! तत्काल लोड डिस्कनेक्ट करें!");
      utterance.rate = 1.2;
      utterance.pitch = 1.35;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.toLowerCase().includes('hi'));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }
      utterance.lang = 'hi-IN';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis note:', e);
    }
  }, []);

  // Play Active Alert Sound based on configured profile
  const playAlertSound = useCallback(() => {
    if (!thresholds.audioAlarmEnabled || isMuted) return;

    if (isShortCircuitActive) {
      playShortCircuitChirp();
      playShortCircuitVoiceAlert();
      return;
    }

    const profile = thresholds.soundProfile || 'hindi_voice';

    // 1. Custom Uploaded Audio (.mp3, .wav, etc.)
    if (profile === 'custom_audio' && thresholds.customAudioUrl) {
      try {
        if (!customAudioRef.current) {
          customAudioRef.current = new Audio(thresholds.customAudioUrl);
        } else if (customAudioRef.current.src !== thresholds.customAudioUrl) {
          customAudioRef.current.src = thresholds.customAudioUrl;
        }
        customAudioRef.current.currentTime = 0;
        customAudioRef.current.play().catch(e => console.warn('Custom audio play note:', e));
        return;
      } catch (err) {
        console.warn('Custom audio playback error:', err);
      }
    }

    // 2. Hindi Urgent Voice Alert: "अरे! अरे लोड गिर गया! होश में आओ बे! ओ ये ओवरलोड है!"
    if (profile === 'hindi_voice') {
      playSirenBeep(); // Siren pulse
      playHindiVoiceAlert(); // Hindi shout
      return;
    }

    // 3. Emergency Industrial Siren
    if (profile === 'emergency_siren') {
      playSirenBeep();
      return;
    }

    // 4. Pulsed Buzzer
    if (profile === 'pulsed_beeper') {
      playBuzzerBeep();
      return;
    }

    playSirenBeep();
  }, [thresholds, isMuted, isShortCircuitActive, playShortCircuitChirp, playShortCircuitVoiceAlert, playSirenBeep, playHindiVoiceAlert, playBuzzerBeep]);

  // Request browser push notification permission if enabled
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  };

  // Audio preview toggle
  const handleToggleSoundPreview = () => {
    if (isPreviewPlaying) {
      setIsPreviewPlaying(false);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (customAudioRef.current) {
        customAudioRef.current.pause();
        customAudioRef.current.currentTime = 0;
      }
    } else {
      setIsPreviewPlaying(true);
      playAlertSound();
      setTimeout(() => {
        setIsPreviewPlaying(false);
      }, 4000);
    }
  };

  // Trigger audio & browser notifications on active overload
  useEffect(() => {
    if (!isOverloadActive) {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (customAudioRef.current) {
        customAudioRef.current.pause();
        customAudioRef.current.currentTime = 0;
      }
      return;
    }

    // Play immediate alert sound
    playAlertSound();

    // Pulse alert every 3.5 seconds
    if (!sirenIntervalRef.current) {
      sirenIntervalRef.current = setInterval(() => {
        playAlertSound();
      }, 3500);
    }

    // Browser Push Notification (throttled to once every 3 minutes, or instant for test simulation)
    const now = Date.now();
    const isSimulatedTest = simulatedType !== 'none';
    if (thresholds.pushAlertEnabled && (isSimulatedTest || now - lastAlertTimestampRef.current > 3 * 60 * 1000)) {
      lastAlertTimestampRef.current = now;
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          if (isShortCircuitActive) {
            new Notification('⚡ CRITICAL: Short-Circuit Detected!', {
              body: `Dead short circuit detected (${primaryValue}A surge)! High current with voltage collapse. Circuit isolation protection triggered.`,
              icon: '/favicon.ico',
              tag: 'solar-short-circuit-alert'
            });
          } else {
            new Notification('⚠️ Farm.IOT Critical Overload Alert', {
              body: `${primaryTitle}: ${primaryValue}${primaryUnit} exceeds safe threshold ${primaryThreshold}${primaryUnit} (+${excessPercent}% overload)!`,
              icon: '/favicon.ico',
              tag: 'solar-overload-alert'
            });
          }
        } catch {}
      }

      // Add to event history
      const newEvent: OverloadEvent = {
        id: 'event_' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: primaryType,
        title: primaryTitle,
        value: primaryValue,
        threshold: primaryThreshold,
        unit: primaryUnit,
        severity: isShortCircuitActive || excessPercent > 20 ? 'critical' : 'warning',
        recommendation: primaryRecommendation,
        isShortCircuit: isShortCircuitActive
      };

      setHistory(prev => {
        const updated = [newEvent, ...prev.slice(0, 19)];
        localStorage.setItem('solar_iot_overload_history', JSON.stringify(updated));
        return updated;
      });
    }

    return () => {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
    };
  }, [isOverloadActive, playAlertSound, primaryTitle, primaryValue, primaryThreshold, primaryUnit, excessPercent, primaryType, primaryRecommendation, thresholds.pushAlertEnabled, isShortCircuitActive, simulatedType]);

  const handleDismiss = () => {
    if (simulatedType !== 'none') {
      cancelSimulation();
    }
    // Dismiss alert for 2 minutes
    setDismissedUntil(Date.now() + 2 * 60 * 1000);
  };

  return (
    <>
      {toastNotice && (
        <div className={`mb-3 p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 animate-fadeIn ${
          toastNotice.type === 'error'
            ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            : toastNotice.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
            : 'bg-zinc-900 border-zinc-700 text-zinc-200'
        }`}>
          <span>{toastNotice.text}</span>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-zinc-400 hover:text-white px-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* 1. ACTIVE OVERLOAD & SHORT-CIRCUIT EMERGENCY BANNER */}
      {isOverloadActive ? (
        <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-pulse ${
          isShortCircuitActive 
            ? 'bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 border-amber-400 text-white' 
            : 'bg-gradient-to-r from-rose-950/90 via-red-900/90 to-amber-950/90 border-rose-500'
        }`}>
          
          {/* Background emergency glow */}
          <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-2xl pointer-events-none ${
            isShortCircuitActive ? 'bg-amber-400/25' : 'bg-rose-500/20'
          }`} />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
            
            {/* Left: Siren & Overload / Short-Circuit Info */}
            <div className="flex items-start space-x-3.5">
              <div className={`p-3 rounded-2xl shrink-0 shadow-lg animate-bounce ${
                isShortCircuitActive ? 'bg-amber-400 text-slate-950 font-black' : 'bg-rose-500 text-slate-950'
              }`}>
                {isShortCircuitActive ? <Zap className="w-6 h-6 stroke-[3]" /> : <AlertTriangle className="w-6 h-6 stroke-[2.5]" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                    isShortCircuitActive 
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300' 
                      : 'bg-rose-500 text-slate-950'
                  }`}>
                    {isShortCircuitActive ? '⚡ DEAD SHORT-CIRCUIT PROTECTION TRIP' : 'CRITICAL SYSTEM OVERLOAD DETECTED'}
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-300">
                    +{excessPercent}% Above Safe Limit
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-amber-300 flex items-center gap-1">
                    <Music className="w-3 h-3 text-amber-400" />
                    <span>
                      {isShortCircuitActive ? 'Sound: Short-Circuit Voice + Rapid Siren' : 
                       (thresholds.soundProfile || 'hindi_voice') === 'hindi_voice' ? 'Sound: अरे लोड गिर गया! (Voice)' :
                       thresholds.soundProfile === 'custom_audio' ? `Sound: ${thresholds.customAudioName || 'Custom Audio'}` :
                       thresholds.soundProfile === 'pulsed_beeper' ? 'Sound: Piezo Beeper' : 'Sound: Industrial Siren'}
                    </span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                  <span>{primaryTitle}:</span>
                  <span className={`font-mono underline ${isShortCircuitActive ? 'text-amber-300 decoration-amber-400' : 'text-amber-300 decoration-rose-500'}`}>
                    {primaryValue} {primaryUnit}
                  </span>
                  <span className="text-xs font-normal text-rose-200">
                    (Limit: {primaryThreshold} {primaryUnit})
                  </span>
                  {isShortCircuitActive && voltage !== null && (
                    <span className="text-xs font-mono text-amber-300 bg-black/50 px-2 py-0.5 rounded border border-amber-500/30">
                      Bus Voltage Collapsed: {voltage.toFixed(1)}V &lt; 2.0V
                    </span>
                  )}
                </h3>

                <p className="text-xs text-rose-100 max-w-2xl leading-relaxed">
                  {primaryRecommendation}
                </p>
              </div>
            </div>

            {/* Right: Emergency Controls */}
            <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
              
              {/* Emergency Isolation Relay Switch */}
              <button
                onClick={() => setIsRelayTripped(!isRelayTripped)}
                className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                  isRelayTripped
                    ? 'bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500'
                    : 'bg-red-600 text-white border-red-400 hover:bg-red-500 animate-pulse'
                }`}
                title="Emergency Cutoff Relay (GPIO 27) Isolation Switch"
              >
                <Zap className="w-4 h-4" />
                <span>{isRelayTripped ? 'Relay Isolated (Safe)' : 'Trip Relay Cutoff'}</span>
              </button>

              {/* Stop Simulation Button */}
              {simulatedType !== 'none' && (
                <button
                  onClick={cancelSimulation}
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs transition cursor-pointer"
                  title="Stop simulation and restore live values"
                >
                  Stop Test
                </button>
              )}

              {/* Mute Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isMuted 
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white' 
                    : 'bg-rose-500 text-slate-950 border-rose-400 hover:bg-rose-400'
                }`}
                title={isMuted ? 'Unmute Siren Alarm' : 'Silence Siren Alarm'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? 'Muted' : 'Silence'}</span>
              </button>

              {/* Change Sound */}
              <button
                onClick={handleOpenSoundModal}
                className="px-3 py-2 rounded-xl bg-black/60 hover:bg-black border border-amber-500/40 text-amber-200 font-mono text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                title={isUserOwner ? "Change Alert Sound" : `Locked: Only ${OWNER_EMAIL} can change alert sound`}
              >
                <Music className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Sound</span>
                {!isUserOwner && <Lock className="w-3 h-3 text-zinc-500" />}
              </button>

              {/* Threshold Settings */}
              <button
                onClick={() => setShowLimitsModal(true)}
                className="px-3 py-2 rounded-xl bg-black/60 hover:bg-black border border-rose-500/40 text-rose-200 font-mono text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                title="Configure Overload & Short-Circuit Limits"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Limits</span>
              </button>

              {/* Upgrade System CTA (Direct to Store) */}
              {onNavigateToStore && (
                <button
                  onClick={onNavigateToStore}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg"
                  title="Buy Higher Capacity Inverter or Batteries"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Upgrade</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Dismiss */}
              <button
                onClick={handleDismiss}
                className="p-2 rounded-xl bg-black/40 hover:bg-black text-rose-300 hover:text-white transition cursor-pointer"
                title="Dismiss warning for 2 minutes"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      ) : (
        /* 2. NORMAL MONITORING STATUS BAR (Compact & Clean with Quick Test Simulators) */
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-md text-xs font-mono">
          
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-400 font-semibold">Overload & Short-Circuit Protection:</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Armed & Normal
              </span>
              <span className="text-zinc-500 text-[11px]">
                (Load: <strong className="text-zinc-200">{inverterLoadWatts}W</strong> / {thresholds.maxInverterLoadWatts}W • Short-Circuit Trip: &gt;<strong className="text-amber-400">{thresholds.shortCircuitCurrentAmps ?? 6.0}A</strong>)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
            {/* Threshold Settings Modal Trigger */}
            <button
              onClick={() => setShowLimitsModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition cursor-pointer flex items-center gap-1 text-[11px]"
              title="Configure Overload Limits"
            >
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Limits</span>
            </button>

            {/* Sound Selector Trigger */}
            <button
              onClick={handleOpenSoundModal}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700 transition cursor-pointer flex items-center gap-1.5 text-[11px]"
              title={isUserOwner ? "Change Overload Alert Sound" : `Locked: Only ${OWNER_EMAIL} can change alert sound`}
            >
              <Music className="w-3 h-3 text-amber-400" />
              <span>
                {(thresholds.soundProfile || 'hindi_voice') === 'hindi_voice' ? 'Sound: अरे लोड गिर गया!' :
                 thresholds.soundProfile === 'custom_audio' ? `Sound: ${thresholds.customAudioName || 'Custom'}` :
                 thresholds.soundProfile === 'pulsed_beeper' ? 'Sound: Beeper' : 'Sound: Siren'}
              </span>
              {isUserOwner ? (
                <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono font-bold">Owner</span>
              ) : (
                <Lock className="w-3 h-3 text-zinc-500" />
              )}
            </button>

            {/* Overload History Drawer */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
              title="View Overload Trip Log"
            >
              <History className="w-3 h-3" />
              <span>Log ({history.length})</span>
            </button>
          </div>

        </div>
      )}

      {/* 3. DEDICATED OVERLOAD ALERT SOUND MODAL (Aspect-Ratio Optimized & Owner-Restricted) */}
      {showSoundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Overload Alert Sound & Voice</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Audio System
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Aspect-ratio & frequency optimized alarm profiles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSoundModal(false);
                  if (isPreviewPlaying) {
                    setIsPreviewPlaying(false);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    if (customAudioRef.current) customAudioRef.current.pause();
                  }
                }}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Owner Security Status Banner */}
            <div className="shrink-0 px-5 pt-4">
              {isUserOwner ? (
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-emerald-200">
                    <strong>👑 Verified System Owner</strong> ({OWNER_EMAIL}) • Sound modification permissions granted.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start sm:items-center gap-2.5 text-amber-200">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <div className="font-bold text-amber-300">Protected Setting • Owner Authorization Required</div>
                      <div className="text-[11px] text-zinc-400">
                        Only <strong>{OWNER_EMAIL}</strong> can change or upload alert sounds. You may preview below.
                      </div>
                    </div>
                  </div>
                  {onRequireSignIn && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSoundModal(false);
                        onRequireSignIn();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shrink-0 cursor-pointer text-xs shadow-md"
                    >
                      Sign In as Owner
                    </button>
                  )}
                </div>
              )}

              {soundModalMsg && (
                <div className="mt-2 p-2 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs">
                  {soundModalMsg}
                </div>
              )}
            </div>

            {/* Scrollable Body with Clean Aspect Ratio Cards */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar text-xs font-mono">
              
              {/* Audio Alarm Enable Toggle */}
              <label className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                isUserOwner ? 'bg-zinc-900/60 border-zinc-800 cursor-pointer' : 'bg-zinc-900/30 border-zinc-800/60 opacity-80 cursor-not-allowed'
              }`}>
                <span className="flex items-center gap-2.5 text-zinc-200 font-bold">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>Audible Siren & Voice Alarm Active</span>
                </span>
                <input
                  type="checkbox"
                  disabled={!isUserOwner}
                  checked={draftAudioAlarmEnabled}
                  onChange={(e) => setDraftAudioAlarmEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 cursor-pointer disabled:cursor-not-allowed"
                />
              </label>

              {/* Sound Profile Selector Header */}
              <div className="pt-1 flex items-center justify-between text-zinc-400 font-sans">
                <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-zinc-500">
                  Select Alert Voice / Tone Profile
                </span>
                {!isUserOwner && (
                  <span className="text-[10px] text-amber-400/90 flex items-center gap-1 font-mono">
                    <Lock className="w-3 h-3" /> View-only mode
                  </span>
                )}
              </div>

              {/* Profile 1: Hindi Urgent Voice Alert (User's audio) */}
              <div
                onClick={() => {
                  if (isUserOwner) setDraftSoundProfile('hindi_voice');
                }}
                className={`p-3.5 rounded-2xl border transition ${
                  draftSoundProfile === 'hindi_voice'
                    ? 'bg-amber-950/30 border-amber-500/60 text-white shadow-lg shadow-amber-500/5'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                } ${isUserOwner ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="draftSoundProfile"
                    value="hindi_voice"
                    disabled={!isUserOwner}
                    checked={draftSoundProfile === 'hindi_voice'}
                    onChange={() => setDraftSoundProfile('hindi_voice')}
                    className="w-4 h-4 mt-0.5 accent-amber-400 shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>"अरे! अरे लोड गिर गया! होश में आओ बे!"</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                        Default Vocal Alarm
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                      Urgent Hindi voice alert combined with rapid dual-tone emergency siren. Speaks instantly when solar inverter load or DC current spikes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile 2: Emergency Industrial Siren */}
              <div
                onClick={() => {
                  if (isUserOwner) setDraftSoundProfile('emergency_siren');
                }}
                className={`p-3.5 rounded-2xl border transition ${
                  draftSoundProfile === 'emergency_siren'
                    ? 'bg-rose-950/30 border-rose-500/60 text-white shadow-lg shadow-rose-500/5'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                } ${isUserOwner ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="draftSoundProfile"
                    value="emergency_siren"
                    disabled={!isUserOwner}
                    checked={draftSoundProfile === 'emergency_siren'}
                    onChange={() => setDraftSoundProfile('emergency_siren')}
                    className="w-4 h-4 mt-0.5 accent-rose-400 shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Industrial Emergency Siren (Dual-Tone)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                        880Hz → 440Hz Sweep
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      Continuous acoustic emergency siren synthesized via browser Web Audio API oscillator.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile 3: Piezo Pulsed Beeper */}
              <div
                onClick={() => {
                  if (isUserOwner) setDraftSoundProfile('pulsed_beeper');
                }}
                className={`p-3.5 rounded-2xl border transition ${
                  draftSoundProfile === 'pulsed_beeper'
                    ? 'bg-cyan-950/30 border-cyan-500/60 text-white shadow-lg shadow-cyan-500/5'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                } ${isUserOwner ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="draftSoundProfile"
                    value="pulsed_beeper"
                    disabled={!isUserOwner}
                    checked={draftSoundProfile === 'pulsed_beeper'}
                    onChange={() => setDraftSoundProfile('pulsed_beeper')}
                    className="w-4 h-4 mt-0.5 accent-cyan-400 shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Rapid Piezo Alarm Beeper</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                        1.4 kHz Square Wave
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      Piercing high-frequency square wave pulse designed for noisy solar plant environments.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile 4: Custom Uploaded Audio */}
              <div className={`p-3.5 rounded-2xl border space-y-3 transition ${
                draftSoundProfile === 'custom_audio'
                  ? 'bg-purple-950/30 border-purple-500/60 shadow-lg shadow-purple-500/5'
                  : 'bg-zinc-900/40 border-zinc-800'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="draftSoundProfile"
                    value="custom_audio"
                    disabled={!isUserOwner}
                    checked={draftSoundProfile === 'custom_audio'}
                    onChange={() => setDraftSoundProfile('custom_audio')}
                    className="w-4 h-4 mt-0.5 accent-purple-400 shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Custom Audio File (.mp3, .wav, .m4a)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                        User Recording
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      Upload your own voice recording or siren sound file. Stored locally in your browser.
                    </p>
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="pl-7 pt-1 flex items-center gap-2 flex-wrap">
                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*"
                    disabled={!isUserOwner}
                    onChange={(e) => {
                      if (!isUserOwner) return;
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 15 * 1024 * 1024) {
                        alert('Audio file size exceeds 15MB limit.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64Data = event.target?.result as string;
                        if (base64Data) {
                          setDraftSoundProfile('custom_audio');
                          setDraftCustomAudioUrl(base64Data);
                          setDraftCustomAudioName(file.name);
                          const testAudio = new Audio(base64Data);
                          testAudio.play().catch(() => {});
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />

                  {isUserOwner ? (
                    <button
                      type="button"
                      onClick={() => audioFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 flex items-center gap-1.5 transition cursor-pointer text-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-300" />
                      <span>{draftCustomAudioName ? 'Change Audio File' : 'Upload Audio (.mp3/.wav)'}</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center gap-1.5 text-xs">
                      <Lock className="w-3 h-3" />
                      <span>Upload Locked (Owner Only)</span>
                    </div>
                  )}

                  {draftCustomAudioName && (
                    <span className="text-[11px] text-zinc-300 bg-black/60 px-2.5 py-1 rounded-lg border border-zinc-800 truncate max-w-xs">
                      {draftCustomAudioName}
                    </span>
                  )}

                  {draftCustomAudioUrl && isUserOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftSoundProfile('hindi_voice');
                        setDraftCustomAudioUrl(null);
                        setDraftCustomAudioName(null);
                      }}
                      className="text-[11px] text-zinc-500 hover:text-rose-400 transition cursor-pointer ml-auto"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Sticky Fixed Footer */}
            <div className="shrink-0 px-5 py-3.5 border-t border-zinc-800 bg-zinc-950/95 flex items-center justify-between gap-3">
              
              {/* Preview Button (accessible to everyone) */}
              <button
                type="button"
                onClick={() => {
                  if (isPreviewPlaying) {
                    setIsPreviewPlaying(false);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    if (customAudioRef.current) {
                      customAudioRef.current.pause();
                      customAudioRef.current.currentTime = 0;
                    }
                  } else {
                    setIsPreviewPlaying(true);
                    if (draftSoundProfile === 'custom_audio' && draftCustomAudioUrl) {
                      try {
                        if (!customAudioRef.current) {
                          customAudioRef.current = new Audio(draftCustomAudioUrl);
                        } else {
                          customAudioRef.current.src = draftCustomAudioUrl;
                        }
                        customAudioRef.current.currentTime = 0;
                        customAudioRef.current.play().catch(() => {});
                      } catch {}
                    } else if (draftSoundProfile === 'hindi_voice') {
                      playSirenBeep();
                      playHindiVoiceAlert();
                    } else if (draftSoundProfile === 'emergency_siren') {
                      playSirenBeep();
                    } else if (draftSoundProfile === 'pulsed_beeper') {
                      playBuzzerBeep();
                    } else {
                      playSirenBeep();
                    }
                    setTimeout(() => {
                      setIsPreviewPlaying(false);
                    }, 4000);
                  }
                }}
                className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isPreviewPlaying 
                    ? 'bg-rose-500 text-slate-950 border-rose-400 animate-pulse' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-zinc-700'
                }`}
              >
                {isPreviewPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPreviewPlaying ? 'Stop Audio' : 'Preview Sound'}</span>
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSoundModal(false);
                    if (isPreviewPlaying) {
                      setIsPreviewPlaying(false);
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      if (customAudioRef.current) customAudioRef.current.pause();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer text-xs font-mono"
                >
                  Cancel
                </button>

                {isUserOwner ? (
                  <button
                    type="button"
                    onClick={handleSaveSoundProfile}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold cursor-pointer text-xs shadow-lg font-mono flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Sound Profile</span>
                  </button>
                ) : (
                  <div
                    className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-xs flex items-center gap-1.5 cursor-not-allowed"
                    title={`Only ${OWNER_EMAIL} can change alert sound`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Locked (Owner Only)</span>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 4. OVERLOAD THRESHOLDS LIMITS MODAL (Owner-Restricted) */}
      {showLimitsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">System Protection Limits</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Electrical & Thermal Boundaries</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLimitsModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Owner Notice */}
            <div className="shrink-0 px-5 pt-4">
              {isUserOwner ? (
                <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>👑 System Owner ({OWNER_EMAIL}) • Hardware limits editable</span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span>Safety thresholds are locked to <strong>{OWNER_EMAIL}</strong>.</span>
                    <span className="block text-[11px] text-zinc-400">Inputs are view-only for monitoring operations.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveThresholds(thresholds);
              }}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs font-mono custom-scrollbar"
            >
              {/* Threshold 1: Inverter Max AC Load */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Inverter Max AC Load (Watts)</span>
                  </label>
                  <span className="text-amber-400 font-bold">{thresholds.maxInverterLoadWatts} W</span>
                </div>
                <input
                  type="number"
                  disabled={!isUserOwner}
                  min={100}
                  max={10000}
                  step={50}
                  value={thresholds.maxInverterLoadWatts}
                  onChange={(e) => setThresholds({ ...thresholds, maxInverterLoadWatts: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Threshold 2: Max Shunt Current */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-bold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Max DC Shunt Current (Amps)</span>
                  </label>
                  <span className="text-cyan-400 font-bold">{thresholds.maxCurrentAmps} A</span>
                </div>
                <input
                  type="number"
                  disabled={!isUserOwner}
                  min={1}
                  max={50}
                  step={0.5}
                  value={thresholds.maxCurrentAmps}
                  onChange={(e) => setThresholds({ ...thresholds, maxCurrentAmps: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Threshold 3: Max String Voltage */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-bold">Max Bus String Voltage (Volts)</label>
                  <span className="text-sky-400 font-bold">{thresholds.maxVoltageVolts} V</span>
                </div>
                <input
                  type="number"
                  disabled={!isUserOwner}
                  min={10}
                  max={60}
                  step={0.5}
                  value={thresholds.maxVoltageVolts}
                  onChange={(e) => setThresholds({ ...thresholds, maxVoltageVolts: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Threshold 4: Max Temperature */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Thermal Overheating Alert (°C)</span>
                  </label>
                  <span className="text-rose-400 font-bold">{thresholds.maxTemperatureC} °C</span>
                </div>
                <input
                  type="number"
                  disabled={!isUserOwner}
                  min={35}
                  max={85}
                  step={1}
                  value={thresholds.maxTemperatureC}
                  onChange={(e) => setThresholds({ ...thresholds, maxTemperatureC: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Threshold 5: Short-Circuit Trip Current Limit */}
              <div className="space-y-1 p-3 rounded-2xl bg-red-950/20 border border-red-500/30">
                <div className="flex items-center justify-between">
                  <label className="text-red-300 font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Short-Circuit Trip Surge Limit (Amps)</span>
                  </label>
                  <span className="text-amber-400 font-bold">{thresholds.shortCircuitCurrentAmps ?? 6.0} A</span>
                </div>
                <input
                  type="number"
                  disabled={!isUserOwner}
                  min={2}
                  max={25}
                  step={0.5}
                  value={thresholds.shortCircuitCurrentAmps ?? 6.0}
                  onChange={(e) => setThresholds({ ...thresholds, shortCircuitCurrentAmps: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Immediate catastrophic trip threshold for DC short-circuits or bypassed solar strings.
                </p>
              </div>

              {/* Threshold 6: Short-Circuit Voltage Collapse Threshold */}
              <div className="space-y-1 p-3 rounded-2xl bg-red-950/20 border border-red-500/30">
                <div className="flex items-center justify-between">
                  <label className="text-red-300 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Voltage Collapse Dead-Short Limit (Volts)</span>
                  </label>
                  <span className="text-red-400 font-bold">{thresholds.shortCircuitVoltageDrop ?? 2.0} V</span>
                </div>
                <input
                  type="number"
                  disabled={!isUserOwner}
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={thresholds.shortCircuitVoltageDrop ?? 2.0}
                  onChange={(e) => setThresholds({ ...thresholds, shortCircuitVoltageDrop: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  If current &gt; 2.5A and voltage collapses below this value, flags a zero-ohm dead short.
                </p>
              </div>

              {/* Short-Circuit Protection & Auto-Trip Toggles */}
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Active Short-Circuit Safety Monitoring</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={thresholds.shortCircuitProtectionEnabled !== false}
                    onChange={(e) => setThresholds({ ...thresholds, shortCircuitProtectionEnabled: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span>Auto-Trip Isolation Relay (GPIO 27 Cutoff)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={thresholds.autoTripRelayEnabled !== false}
                    onChange={(e) => setThresholds({ ...thresholds, autoTripRelayEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400 cursor-pointer"
                  />
                </label>
              </div>

              {/* Push notifications */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer">
                <span className="flex items-center gap-2 text-zinc-300">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span>Desktop Browser Push Notifications (Overload & Short-Circuit)</span>
                </span>
                <input
                  type="checkbox"
                  checked={thresholds.pushAlertEnabled}
                  onChange={async (e) => {
                    const enabled = e.target.checked;
                    setThresholds({ ...thresholds, pushAlertEnabled: enabled });
                    if (enabled) await requestNotificationPermission();
                  }}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </label>

              {/* Actions Footer */}
              <div className="shrink-0 pt-3 border-t border-zinc-800 flex items-center justify-between">
                {isUserOwner ? (
                  <button
                    type="button"
                    onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
                    className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLimitsModal(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  {isUserOwner ? (
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer text-xs shadow-md"
                    >
                      Save Thresholds
                    </button>
                  ) : (
                    <div className="px-4 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs flex items-center gap-1 cursor-not-allowed">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </div>
                  )}
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 4. OVERLOAD EVENTS HISTORY LOG MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col p-5 sm:p-6 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Overload Event History Log</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 font-mono text-xs">
              {history.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto" />
                  <p>No system overload events recorded yet.</p>
                  <p className="text-[11px]">System has operated within safe boundaries.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3.5 rounded-xl bg-black border border-zinc-800 space-y-1.5 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold flex items-center gap-1.5 ${item.type === 'short_circuit' ? 'text-amber-300' : 'text-rose-400'}`}>
                        {item.type === 'short_circuit' ? <Zap className="w-3.5 h-3.5 text-amber-400" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        <span>{item.title}</span>
                      </span>
                      <span className="text-[10px] text-zinc-500">{item.timestamp}</span>
                    </div>
                    <div className="flex items-baseline gap-2 text-white">
                      <span className="text-sm font-bold text-amber-300">
                        {item.value} {item.unit}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        (Limit: {item.threshold} {item.unit})
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      {item.recommendation}
                    </p>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs font-mono">
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('solar_iot_overload_history');
                  }}
                  className="text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                >
                  Clear Event Log
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </>
  );
};
