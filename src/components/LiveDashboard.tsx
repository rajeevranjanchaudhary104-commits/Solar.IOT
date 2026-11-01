import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Battery, 
  Thermometer, 
  Zap, 
  Activity, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  CloudRain, 
  Crown, 
  Layers, 
  ShieldCheck, 
  FileText,
  Gauge,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Square,
  Edit3,
  Globe,
  Radio,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Wind,
  RotateCw,
  Compass,
  Flame,
  ShieldAlert,
  Droplets,
  Sprout,
  Waves,
  Leaf,
  Cpu,
  Check,
  ExternalLink,
  RefreshCw,
  Database,
  Copy
} from 'lucide-react';
import { SolarData, CleaningLog, TelemetryPoint, StationProfile } from '../types/solar';
import { CircularGauge } from './CircularGauge';
import { ChangeCleanTimeModal } from './ChangeCleanTimeModal';
import { OverloadAlertBanner } from './OverloadAlertBanner';
import { SolarTelemetryChart } from './SolarTelemetryChart';
import {
  db,
  getCustomRtdbUrl,
  saveCustomRtdbUrl,
  seedCompleteRealtimeDatabase,
  SCOPED_RTDB_RULES_JSON
} from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';

interface LiveDashboardProps {
  solarData: SolarData;
  telemetryHistory: TelemetryPoint[];
  onTriggerClean: () => Promise<void>;
  onStopClean: () => Promise<void>;
  cleaningLogs: CleaningLog[];
  isCleaning: boolean;
  wiperCountdown?: number;
  isOwner?: boolean;
  onRequireSignIn?: () => void;
  onUpdateScheduledCleanTime?: (newTime: string) => Promise<void>;
  user?: any;
  onNavigateToStore?: () => void;
  onNavigateToWindmill?: () => void;
  onNavigateToSecurity?: () => void;
  connectionMode?: 'firebase' | 'local_ap';
  onToggleConnectionMode?: (mode: 'firebase' | 'local_ap') => void;
  localApIp?: string;
  onUpdateLocalApIp?: (ip: string) => void;
  localApConnected?: boolean;
  localApLatency?: number | null;
  stationProfile?: StationProfile | null;
  onNavigateToEsp32?: () => void;
  onNavigateToModel3d?: () => void;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  solarData,
  telemetryHistory,
  onTriggerClean,
  onStopClean,
  cleaningLogs,
  isCleaning,
  wiperCountdown = 0,
  isOwner = false,
  onRequireSignIn,
  onUpdateScheduledCleanTime,
  user,
  onNavigateToStore,
  onNavigateToWindmill,
  onNavigateToSecurity,
  connectionMode = 'firebase',
  onToggleConnectionMode,
  localApIp = '192.168.4.1',
  onUpdateLocalApIp,
  localApConnected = false,
  localApLatency = null,
  stationProfile,
  onNavigateToEsp32,
  onNavigateToModel3d,
}) => {
  // System mode: 'off_grid' (Battery & Standalone) vs 'on_grid' (Grid-Tied & Net-Metered)
  const [systemMode, setSystemMode] = useState<'off_grid' | 'on_grid'>(
    stationProfile?.gridType === 'on_grid' ? 'on_grid' : 'off_grid'
  );

  useEffect(() => {
    if (stationProfile?.gridType) {
      setSystemMode(stationProfile.gridType === 'on_grid' ? 'on_grid' : 'off_grid');
    }
  }, [stationProfile?.gridType]);

  const [cleaningCountdown, setCleaningCountdown] = useState<number | null>(null);
  const [showWhyWiper, setShowWhyWiper] = useState<boolean>(true);
  const [showChangeCleanTimeModal, setShowChangeCleanTimeModal] = useState<boolean>(false);
  const [tachometerCluster, setTachometerCluster] = useState<'solar' | 'windmill_peltier' | 'soil_moisture'>('solar');
  const [irrigationManualActive, setIrrigationManualActive] = useState<boolean>(false);
  const [irrigationPulseSec, setIrrigationPulseSec] = useState<number | null>(null);

  // ESP32 Diagnostic State (Real Firebase Network Reachability Test + RTDB Manager)
  const [isPingingFirebase, setIsPingingFirebase] = useState(false);
  const [pingResult, setPingResult] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [rtdbUrlInput, setRtdbUrlInput] = useState<string>(() => getCustomRtdbUrl());
  const [showRtdbCreator, setShowRtdbCreator] = useState<boolean>(false);
  const [isSeedingRtdb, setIsSeedingRtdb] = useState<boolean>(false);
  const [copiedRtdbRules, setCopiedRtdbRules] = useState<boolean>(false);

  useEffect(() => {
    const onUrlChanged = (e: any) => {
      if (e?.detail && typeof e.detail === 'string') {
        setRtdbUrlInput(e.detail);
      }
    };
    window.addEventListener('solar_iot_rtdb_url_changed', onUrlChanged);
    return () => window.removeEventListener('solar_iot_rtdb_url_changed', onUrlChanged);
  }, []);

  const handleTestFirebasePing = async () => {
    setIsPingingFirebase(true);
    setPingResult(null);
    try {
      const startTime = Date.now();
      const cleanRtdb = rtdbUrlInput.trim().replace(/\/+$/, '');
      const rtdbRes = await fetch(`${cleanRtdb}/solar_iot/node_01.json`);
      const latency = Date.now() - startTime;

      if (rtdbRes.ok) {
        const payload = await rtdbRes.json();
        const isLiveNode = Boolean(payload && payload.espConnected === true && payload.voltage !== null);
        setPingResult({
          text: `HTTP 200 OK (${latency}ms) • Realtime Database (${cleanRtdb}) is reachable. Hardware status: ${isLiveNode ? 'ESP32 Online' : 'Waiting for ESP32 hardware'}.`,
          type: 'success'
        });
      } else {
        setPingResult({
          text: `RTDB HTTP ${rtdbRes.status} (${rtdbRes.statusText}) on ${cleanRtdb}. Click "Realtime DB Setup & Rules" below to copy rules or connect a new Realtime Database URL.`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setPingResult({
        text: `Connection check notice: ${err.message || 'Network check failed'}. Verify your Realtime Database URL and rules.`,
        type: 'error'
      });
    } finally {
      setIsPingingFirebase(false);
    }
  };

  const handleSaveAndSeedRtdb = async (customOverrides?: Partial<Record<string, any>>) => {
    setIsSeedingRtdb(true);
    setPingResult(null);
    try {
      const normalized = saveCustomRtdbUrl(rtdbUrlInput);
      setRtdbUrlInput(normalized);
      const res = await seedCompleteRealtimeDatabase(normalized, customOverrides);
      if (res.rtdbOk || res.firestoreOk) {
        setPingResult({
          text: res.rtdbOk
            ? `Live Solar Panel (18.6V / 63.6W) & Soil Moisture (54% Optimal) seeded to Realtime Database (${normalized}) and Cloud Firestore!`
            : `Synced to Cloud Firestore! Note for RTDB (${normalized}): ${res.message}`,
          type: res.rtdbOk ? 'success' : 'error'
        });
      } else {
        setPingResult({
          text: res.message,
          type: 'error'
        });
      }
    } catch (e: any) {
      setPingResult({
        text: `Failed to seed Realtime Database: ${e?.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsSeedingRtdb(false);
    }
  };

  const handleCopyRtdbRules = () => {
    navigator.clipboard.writeText(SCOPED_RTDB_RULES_JSON);
    setCopiedRtdbRules(true);
    setTimeout(() => setCopiedRtdbRules(false), 2500);
  };

  // Inverter Load in Watts (can be live or defaulted)
  const inverterLoadWatts = solarData.inverterLoadWatts ?? 150;

  // Calculate connection status and dynamic elapsed duration
  const getDisconnectionStatus = () => {
    if (solarData.espConnected && solarData.voltage !== null && solarData.voltage >= 0) {
      return {
        isConnected: true,
        label: 'ONLINE',
        detail: 'Real-time Solar, Soil Moisture & Windmill telemetry active'
      };
    }

    return { 
      isConnected: false, 
      label: 'Waiting for ESP32', 
      detail: 'Click "Sync Live Solar & Soil DB" to initialize Realtime Database telemetry' 
    };
  };

  const isApMode = connectionMode === 'local_ap';
  const connectionStatus = getDisconnectionStatus();
  const isHardwareConnected = isApMode ? Boolean(localApConnected) : connectionStatus.isConnected;
  const isHighTemp = solarData.temperature !== null && solarData.temperature > 45;
  
  // Panel Wattage (P = V * I)
  const currentWatt = (solarData.voltage !== null && solarData.current !== null)
    ? parseFloat((solarData.voltage * solarData.current).toFixed(1))
    : null;

  // Highest Voltage (recorded today or bus peak)
  const highestVoltage = (isHardwareConnected && solarData.highestVoltageToday != null)
    ? solarData.highestVoltageToday
    : (isHardwareConnected && solarData.voltage !== null) 
      ? Math.max(solarData.voltage, 21.8) 
      : null;

  const wattPercentOfPeak = (currentWatt !== null && solarData.highestWattToday && solarData.highestWattToday > 0)
    ? Math.min(100, Math.round((currentWatt / solarData.highestWattToday) * 100))
    : 0;

  // On-Grid Grid Export / Import calculation
  const gridExportWatts = currentWatt !== null 
    ? parseFloat((currentWatt - inverterLoadWatts).toFixed(1))
    : null;

  const scheduledCleanTime = solarData.scheduledCleanTime || '03:00 AM';
  const activeWiperCountdown = wiperCountdown > 0 ? wiperCountdown : (cleaningCountdown ?? 0);

  const handleStartClean = async () => {
    if (!user) {
      if (onRequireSignIn) onRequireSignIn();
      return;
    }
    if (isCleaning || activeWiperCountdown > 0) return;
    try {
      setCleaningCountdown(5);
      await onTriggerClean();
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b'],
        });
      } catch {}
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (cleaningCountdown === null) return;
    if (cleaningCountdown <= 0) {
      setCleaningCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setCleaningCountdown(cleaningCountdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cleaningCountdown]);

  return (
    <div className="space-y-6">
      {/* Safety & Overload Audio Alert Banner (15s Speech Throttle + Non-Blocking Toast) */}
      <OverloadAlertBanner
        inverterLoadWatts={inverterLoadWatts}
        voltage={solarData.voltage}
        current={solarData.current}
        power={currentWatt}
        temperature={solarData.temperature}
        isHardwareConnected={isHardwareConnected}
        onNavigateToStore={onNavigateToStore}
        isOwner={isOwner}
        user={user}
        onRequireSignIn={onRequireSignIn}
      />

      {/* Dual Connection Hub: Cloud Firebase vs Direct ESP32 AP (Offline Field Mode) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border shrink-0 ${
              isApMode 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}>
              {isApMode ? <Radio className="w-5 h-5 animate-pulse" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm sm:text-base">
                  {isApMode ? 'Direct ESP32 AP Hotspot (100% Offline Mode)' : 'Cloud Firebase Firestore (Global Online Mode)'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  isHardwareConnected 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {isHardwareConnected ? (isApMode ? `● LIVE AP (${localApLatency ?? 14}ms)` : '● CLOUD SYNC LIVE') : (isApMode ? '○ WAITING FOR AP' : '○ CLOUD DISCONNECTED')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {isApMode 
                  ? `Device connected to 'Solar-Cleaner-AP' • Polling http://${localApIp}/api/telemetry (Zero Internet Required)`
                  : 'Real-time WebSocket snapshot stream from Google Cloud Firestore project database'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Pill */}
          <div className="flex items-center p-1 rounded-2xl bg-black border border-zinc-800 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => onToggleConnectionMode && onToggleConnectionMode('firebase')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                !isApMode
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Cloud Firebase</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleConnectionMode && onToggleConnectionMode('local_ap')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                isApMode
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Offline ESP32 AP</span>
            </button>
          </div>
        </div>

        {/* AP Info Strip when in Local AP mode */}
        {isApMode && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-black/60 border border-amber-500/20 text-xs font-mono">
            <div className="flex items-center gap-3 flex-wrap text-[11px]">
              <span className="text-zinc-400">Wi-Fi Hotspot: <strong className="text-white">Solar-Cleaner-AP</strong></span>
              <span className="text-zinc-400">Password: <strong className="text-amber-300">SolarIOT123</strong></span>
              <span className="text-zinc-400">Gateway: <strong className="text-cyan-300">http://{localApIp}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                localApConnected 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
              }`}>
                {localApConnected ? `Connected (${localApLatency ?? 0}ms)` : 'Searching for ESP32 AP...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ESP32 Hardware & Firebase Live Connection Diagnostic Hub */}
      <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl backdrop-blur-md transition-all ${
        isHardwareConnected 
          ? 'bg-zinc-950/90 border-emerald-500/40 text-emerald-200' 
          : 'bg-zinc-950/90 border-amber-500/40 text-amber-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className={`p-3 rounded-2xl border shrink-0 ${
              isHardwareConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isHardwareConnected ? <Cpu className="w-6 h-6 animate-pulse" /> : <WifiOff className="w-6 h-6" />}
            </div>
            
            <div className="space-y-1">
              <div className="font-bold text-white text-sm sm:text-base flex items-center gap-2 flex-wrap">
                <span>{isHardwareConnected ? 'ESP32 Hardware Connected & Streaming' : 'ESP32 Hardware Waiting for Connection'}</span>
                
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                  isHardwareConnected 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {connectionStatus.label}
                </span>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  Target: solar_iot/node_01
                </span>
              </div>

              <div className="text-xs text-zinc-400 font-sans leading-relaxed">
                {isHardwareConnected ? (
                  <span>
                    Physical ESP32 / NodeMCU microcontroller is actively pushing real-time sensor frames (INA219, LM35, Rain, Windmill) to Cloud Firestore.
                  </span>
                ) : (
                  <span>
                    Your physical ESP32 has not pushed a live sensor frame recently. Ensure your ESP32 or NodeMCU is powered on and connected to Wi-Fi.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostic Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 self-stretch sm:self-auto justify-start sm:justify-end pt-1 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
            
            {/* Seed / Initialize Live Solar + Soil Moisture in RTDB */}
            <button
              type="button"
              onClick={() => handleSaveAndSeedRtdb()}
              disabled={isSeedingRtdb}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Initialize and push Live Solar Panel, Soil Moisture, Windmill & Security nodes into Realtime Database and Firestore"
            >
              {isSeedingRtdb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
              <span>Sync Live Solar & Soil DB</span>
            </button>

            {/* Open Realtime Database Creator / URL Manager */}
            <button
              type="button"
              onClick={() => setShowRtdbCreator((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
              title="Create or connect a new Firebase Realtime Database URL and copy rules"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showRtdbCreator ? 'Hide RTDB Setup' : 'New Realtime DB / Rules'}</span>
            </button>

            {/* Test Firebase REST Ping */}
            <button
              type="button"
              onClick={handleTestFirebasePing}
              disabled={isPingingFirebase}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Ping Realtime Database & Cloud Firestore REST API directly to verify network connectivity"
            >
              {isPingingFirebase ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 text-cyan-400" />}
              <span>Test Ping</span>
            </button>

            {/* Jump to ESP32 Firmware Tab */}
            {onNavigateToEsp32 && (
              <button
                type="button"
                onClick={onNavigateToEsp32}
                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>ESP32 Code</span>
              </button>
            )}

            {/* Jump to 3D Hardware Model */}
            {onNavigateToModel3d && (
              <button
                type="button"
                onClick={onNavigateToModel3d}
                className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
                title="Open 3D interactive hardware model"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>3D Model</span>
              </button>
            )}

          </div>

        </div>

        {/* Real-time Ping Result Banner */}
        {pingResult && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs font-mono animate-fadeIn">
            <div className={`flex items-center gap-2 ${pingResult.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{pingResult.text}</span>
            </div>
          </div>
        )}

        {/* Expandable Realtime Database Creator, Custom URL Switcher & Live Telemetry Seeder */}
        {showRtdbCreator && (
          <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Connect or Create a New Realtime Database */}
              <div className="p-4 rounded-2xl bg-black/80 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-indigo-300 font-mono flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-400" />
                    1. Connect or Create a New Realtime Database
                  </span>
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline"
                  >
                    <span>Open Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  To create a brand-new Realtime Database: open <strong>Firebase Console &rarr; Build &rarr; Realtime Database &rarr; Create Database</strong>, choose any region (e.g. Singapore <code>asia-southeast1</code> or US <code>us-central1</code>), start in <strong>Test Mode</strong>, and paste your new <code>https://...firebasedatabase.app</code> URL below:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={rtdbUrlInput}
                    onChange={(e) => setRtdbUrlInput(e.target.value)}
                    placeholder="https://your-project-default-rtdb.firebasedatabase.app"
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveAndSeedRtdb()}
                    disabled={isSeedingRtdb}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-mono font-bold text-xs transition cursor-pointer shrink-0"
                  >
                    {isSeedingRtdb ? 'Seeding DB...' : 'Save & Seed New RTDB'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] font-mono text-zinc-500">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultUrl = 'https://solariot-f49f5-default-rtdb.firebaseio.com';
                      setRtdbUrlInput(defaultUrl);
                      saveCustomRtdbUrl(defaultUrl);
                      handleSaveAndSeedRtdb();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-emerald-300 font-mono text-[10px] cursor-pointer"
                  >
                    Connect solariot-f49f5 RTDB & Seed All Nodes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const jitterV = parseFloat((18.2 + Math.random() * 1.4).toFixed(1));
                      const jitterI = parseFloat((3.1 + Math.random() * 0.6).toFixed(2));
                      const jitterMoist = Math.round(48 + Math.random() * 18);
                      handleSaveAndSeedRtdb({
                        voltage: jitterV,
                        current: jitterI,
                        power: parseFloat((jitterV * jitterI).toFixed(1)),
                        soilMoisture: jitterMoist,
                        soil_moisture: jitterMoist,
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] cursor-pointer"
                  >
                    Push New Live Solar + Soil Moisture Reading
                  </button>
                </div>
              </div>

              {/* Right Column: Copy Scoped Realtime Database Rules */}
              <div className="p-4 rounded-2xl bg-black/80 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-emerald-300 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    2. Realtime Database Rules (/solar_iot, /node_01 & /security_system)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRtdbRules}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRtdbRules ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRtdbRules ? 'Copied Rules!' : 'Copy RTDB Rules'}</span>
                  </button>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  Paste these rules in <strong>Realtime Database &rarr; Rules &rarr; Publish</strong> so Solar Panel, Soil Moisture, and Security Camera nodes stream without permission errors:
                </p>
                <pre className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-28">
                  {SCOPED_RTDB_RULES_JSON}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* On-Grid Mode Highlights Banner (if On-Grid is selected) */}
      {systemMode === 'on_grid' && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>On-Grid Net Metering Active</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  GRID-TIED
                </span>
              </div>
              <div className="text-xs text-emerald-300/80 mt-0.5">
                Solar array directly synchronizes with utility grid frequency. Surplus solar wattage beyond inverter load exports to the grid.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="p-2 rounded-xl bg-black border border-emerald-500/30 text-right">
              <span className="text-zinc-400 block text-[10px]">Net Grid Balance</span>
              <span className={`font-bold ${isHardwareConnected && gridExportWatts !== null && gridExportWatts >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isHardwareConnected && gridExportWatts !== null 
                  ? (gridExportWatts >= 0 ? `+${gridExportWatts} W (Export)` : `${gridExportWatts} W (Import)`)
                  : 'N/A (Offline)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Shock Safety Notice */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white">Solar Panel Safety Standard: </span>
            <span className="text-zinc-400">
              Spraying water onto solar panels during sunshine causes dangerous <strong>thermal shock</strong> that cracks the tempered glass and damages photovoltaic cells. Cleaning is handled safely via the <strong>motorized silicone wiper arm</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Rain Detection / Natural Wash Banner */}
      {solarData.isRaining && (
        <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 text-sky-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <CloudRain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sky-300 text-xs flex items-center gap-2">
                Precipitation Detected ({solarData.rainIntensityMm ?? 0} mm/hr)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 border border-sky-500/30">
                  FC-37 Rain Sensor
                </span>
              </div>
              <div className="text-[11px] text-sky-300/80">
                Natural ambient rain detected on the surface.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Engineering Metrics Bar: Highest Voltage, Highest Watt, Clean Time, and Inverter Load */}
      <div className="grid grid-cols-2 sm:grid-cols-4 grid-auto-fit-stats gap-3">
        
        {/* Metric 1: Inverter Load */}
        <div className="bg-zinc-950 border border-amber-500/25 rounded-2xl p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1.5 text-amber-400 font-semibold truncate">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Inverter Load
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {inverterLoadWatts > 800 && (
                <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold animate-pulse">
                  OVERLOAD
                </span>
              )}
              <span className="text-[10px] font-mono bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20 font-bold">
                LOAD
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isHardwareConnected ? inverterLoadWatts : 'NA'}</span>
              <span className="text-amber-400 font-bold text-xs">{isHardwareConnected ? 'Watts' : ''}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1">
              <span>{systemMode === 'on_grid' ? 'Home Demand' : 'AC Output'}</span>
              <span className="text-zinc-500 font-medium truncate ml-1">
                {isHardwareConnected ? 'Active Load' : connectionStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Highest Voltage Today */}
        <div className="bg-zinc-950 border border-sky-500/25 rounded-2xl p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/50 transition">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1.5 text-sky-400 font-semibold truncate">
              <Crown className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              Highest Voltage
            </span>
            <span className="text-[10px] font-mono bg-sky-400/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-400/20 font-bold shrink-0">
              V_MAX
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isHardwareConnected && highestVoltage !== null ? highestVoltage.toFixed(1) : 'NA'}</span>
              <span className="text-sky-400 font-bold text-xs">{isHardwareConnected && highestVoltage !== null ? 'Volts' : ''}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1">
              <span>{isHardwareConnected ? 'Peak Bus String' : 'Awaiting Data'}</span>
              <span className="text-sky-300 font-medium">INA219</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Clean Time (Last Clean & Scheduled Clean) */}
        <div className="bg-zinc-950 border border-cyan-500/25 rounded-2xl p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/50 transition">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1.5 text-cyan-400 font-semibold truncate">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              Clean Time
            </span>
            <span className="text-[10px] font-mono bg-cyan-400/10 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-400/20 font-bold shrink-0">
              {scheduledCleanTime}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-white truncate">
              {scheduledCleanTime} Daily
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1">
              <span>{solarData.lastCleanedTime ? `Last: ${solarData.lastCleanedTime}` : 'Auto Schedule'}</span>
              <button
                type="button"
                onClick={() => setShowChangeCleanTimeModal(true)}
                className="text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1 cursor-pointer transition"
                title="Change scheduled cleaning time in Firebase"
              >
                <Edit3 className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metric 4: Highest Watt Today */}
        <div className="bg-zinc-950 border border-emerald-500/25 rounded-2xl p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1.5 text-emerald-400 font-semibold truncate">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Highest Watt
            </span>
            <span className="text-[10px] font-mono bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-400/20 font-bold shrink-0">
              PEAK
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isHardwareConnected && solarData.highestWattToday !== null && solarData.highestWattToday !== 145.4 ? solarData.highestWattToday.toFixed(1) : 'NA'}</span>
              <span className="text-emerald-400 font-bold text-xs">{isHardwareConnected && solarData.highestWattToday !== null && solarData.highestWattToday !== 145.4 ? 'Watts' : ''}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1">
              <span>{isHardwareConnected && solarData.highestWattTime ? `At ${solarData.highestWattTime}` : 'Awaiting Peak'}</span>
              <span className="text-emerald-400 font-medium">
                {isHardwareConnected ? 'INA219' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Agro-IoT Soil Moisture & Irrigation Quick Telemetry Strip (Replaces Weather in Live Section) */}
      <div className="bg-zinc-950 border border-emerald-500/25 hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl backdrop-blur-md transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Droplets className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>Soil Moisture & Agro-Photovoltaic Telemetry</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <Sprout className="w-3 h-3 text-emerald-400" />
                  {isHardwareConnected 
                    ? ((solarData.soilMoisture ?? 48) < 30 ? 'DRY — WATERING NEEDED' : (solarData.soilMoisture ?? 48) > 70 ? 'WET — SOIL SATURATED' : 'OPTIMAL MOISTURE (30-70%)')
                    : 'Capacitive v1.2 (GPIO 32)'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  Agro-PV Dual Land Use
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time sub-surface soil moisture sensor beneath solar arrays. Solar panel shading reduces ground moisture evapotranspiration by <strong className="text-emerald-400">~34%</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <div className="bg-black border border-zinc-800/90 rounded-xl px-3 py-1.5 flex items-center gap-3 font-mono text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Moisture</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {isHardwareConnected ? `${solarData.soilMoisture ?? 48}%` : 'N/A (Offline)'}
                </span>
              </div>
              <div className="w-px h-6 bg-zinc-800" />
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Raw ADC</span>
                <span className="text-cyan-400 font-bold text-xs">
                  {isHardwareConnected ? (solarData.soilMoistureRaw ?? 2180) : 'Offline'}
                </span>
              </div>
              <div className="w-px h-6 bg-zinc-800" />
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Soil Temp</span>
                <span className="text-amber-400 font-bold text-xs">
                  {isHardwareConnected ? `${solarData.soilTemperature ?? 23.4}°C` : 'Offline'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTachometerCluster('soil_moisture')}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                tachometerCluster === 'soil_moisture'
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40'
              }`}
              title="Open dedicated Soil Moisture dials and irrigation controls"
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>{tachometerCluster === 'soil_moisture' ? 'Viewing Soil Dials' : 'View Soil Dials'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Telemetry Cluster: Dedicated Circular Gauges */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-2.5">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-cyan-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
              Live Sensor Tachometers ({
                tachometerCluster === 'solar'
                  ? (systemMode === 'on_grid' ? 'On-Grid Solar (5 Dials)' : 'Off-Grid Solar (5 Dials)')
                  : tachometerCluster === 'windmill_peltier'
                    ? 'Windmill & Peltier System (7 Dials)'
                    : 'Agro-IoT Soil Moisture & Irrigation (6 Dials)'
              })
            </h3>
          </div>

          {/* Generator Cluster Switcher */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="flex items-center p-1 rounded-2xl bg-black border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setTachometerCluster('solar')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition cursor-pointer font-bold ${
                  tachometerCluster === 'solar'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Solar PV (5 Dials)</span>
              </button>

              <button
                type="button"
                onClick={() => setTachometerCluster('windmill_peltier')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition cursor-pointer font-bold ${
                  tachometerCluster === 'windmill_peltier'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md'
                    : 'text-zinc-400 hover:text-amber-300'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>Windmill & Peltier (7 Dials)</span>
              </button>

              <button
                type="button"
                onClick={() => setTachometerCluster('soil_moisture')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition cursor-pointer font-bold ${
                  tachometerCluster === 'soil_moisture'
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md'
                    : 'text-zinc-400 hover:text-emerald-300'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Soil Moisture (Agro-IoT)</span>
              </button>
            </div>

            {onNavigateToWindmill && (
              <button
                type="button"
                onClick={onNavigateToWindmill}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-mono transition cursor-pointer flex items-center gap-1"
                title="Open Dedicated Windmill & Peltier Section"
              >
                <span>Full Lab</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}

            {onNavigateToSecurity && (
              <button
                type="button"
                onClick={onNavigateToSecurity}
                className="px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-500/40 text-xs font-mono transition cursor-pointer flex items-center gap-1 shadow"
                title="Open ESP32-CAM Security System & Surveillance"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>Security Cam</span>
                <ArrowUpRight className="w-3 h-3 text-red-400" />
              </button>
            )}
          </div>
        </div>

        {/* 5-Gauge Grid: Responsive */}
        {tachometerCluster === 'solar' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 grid-auto-fit-gauges gap-2.5 sm:gap-4 animate-fadeIn">

          {/* 1. Panel Voltage (INA219) */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-sky-500/30 transition">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-sky-400" />
                Panel Voltage
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                INA219
              </span>
            </div>

            <div className="my-1">
              <CircularGauge
                value={solarData.voltage}
                min={0}
                max={25}
                unit="V"
                label="Voltage"
                sublabel="V_BUS String"
                gradientId="gradVoltage"
                gradientFrom="#38bdf8"
                gradientTo="#0284c7"
                precision={2}
                isOffline={!isHardwareConnected}
              />
            </div>

            <div className="pt-2 border-t border-zinc-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>Highest: {isHardwareConnected && highestVoltage !== null ? `${highestVoltage.toFixed(1)}V` : 'NA'}</span>
              <span className="text-sky-400 font-semibold">{isHardwareConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* 2. Panel Current (INA219) */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/30 transition">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Panel Current
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                SHUNT
              </span>
            </div>

            <div className="my-1">
              <CircularGauge
                value={solarData.current}
                min={0}
                max={7}
                unit="A"
                label="Current"
                sublabel="Shunt Amp"
                gradientId="gradCurrent"
                gradientFrom="#34d399"
                gradientTo="#059669"
                precision={2}
                isOffline={!isHardwareConnected}
              />
            </div>

            <div className="pt-2 border-t border-zinc-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>Panel Amps</span>
              <span className="text-emerald-400 font-semibold">{isHardwareConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* 3. Panel Watt (Power = V * I) */}
          <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-amber-500/50 transition">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Panel Watt
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                WATTS
              </span>
            </div>

            <div className="my-1">
              <CircularGauge
                value={currentWatt}
                min={0}
                max={150}
                unit="W"
                label="Panel Watt"
                sublabel="P = V × I"
                gradientId="gradPowerWatt"
                gradientFrom="#fbbf24"
                gradientTo="#d97706"
                precision={1}
                isOffline={!isHardwareConnected}
              />
            </div>

            <div className="pt-2 border-t border-zinc-800/80 px-2 flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">Peak Ratio</span>
              <span className="text-amber-400 font-bold font-mono">
                {isHardwareConnected && currentWatt !== null ? `${wattPercentOfPeak}% Peak` : 'Offline'}
              </span>
            </div>
          </div>

          {/* 4. Gauge 4: Battery SoC (Off-Grid) OR Inverter/Grid Load (On-Grid) */}
          {systemMode === 'off_grid' ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-purple-500/30 transition">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Battery className="w-3.5 h-3.5 text-purple-400" />
                  Battery SoC
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  12V BANK
                </span>
              </div>

              <div className="my-1">
                <CircularGauge
                  value={solarData.batteryPercent}
                  min={0}
                  max={100}
                  unit="%"
                  label="Storage"
                  sublabel="12V LiFePO4"
                  gradientId="gradBattery"
                  gradientFrom="#a855f7"
                  gradientTo="#7c3aed"
                  precision={0}
                  isOffline={!isHardwareConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>Deep Cycle</span>
                <span className="text-purple-400 font-semibold">{isHardwareConnected ? 'Float Charge' : 'Offline'}</span>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/50 transition">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Inverter Load
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ON-GRID
                </span>
              </div>

              <div className="my-1">
                <CircularGauge
                  value={isHardwareConnected ? inverterLoadWatts : null}
                  min={0}
                  max={500}
                  unit="W"
                  label="AC Load"
                  sublabel="Inverter Draw"
                  gradientId="gradInverterLoad"
                  gradientFrom="#10b981"
                  gradientTo="#047857"
                  precision={0}
                  isOffline={!isHardwareConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>Demand Offset</span>
                <span className="text-emerald-400 font-semibold">{isHardwareConnected ? 'Grid Synced' : 'Offline'}</span>
              </div>
            </div>
          )}

          {/* 5. Panel Temperature (LM35) */}
          <div className={`bg-zinc-950 border rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between transition ${
            isHighTemp ? 'border-red-500/50' : 'border-zinc-800 hover:border-orange-500/30'
          }`}>
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Thermometer className={`w-3.5 h-3.5 ${isHighTemp ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
                Panel Temp
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isHighTemp 
                  ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
                LM35
              </span>
            </div>

            <div className="my-1">
              <CircularGauge
                value={solarData.temperature}
                min={10}
                max={70}
                unit="°C"
                label="Panel Temp"
                sublabel="Thermal LM35"
                gradientId="gradTemp"
                gradientFrom={isHighTemp ? '#ef4444' : '#fb923c'}
                gradientTo={isHighTemp ? '#b91c1c' : '#ea580c'}
                precision={1}
                isOffline={!isHardwareConnected}
              />
            </div>

            <div className="pt-2 border-t border-zinc-800/80 px-2 flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">Analog Scale</span>
              <span className="text-zinc-300 font-medium">
                {isHardwareConnected ? '10mV / °C' : 'Offline'}
              </span>
            </div>
          </div>

        </div>
        ) : (
          /* CLUSTER 2: Windmill & Peltier 7-Gauge Cluster */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7 gap-2.5 sm:gap-3.5 animate-fadeIn">
            
            {/* 1. Windmill RPM */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-3 shadow-xl transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1 px-1 text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5 break-words text-xs">
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Rotor RPM</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {isHardwareConnected ? 'HALL' : 'OFFLINE'}
                </span>
              </div>
              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isHardwareConnected ? solarData.windmillRpm : null}
                  min={0}
                  max={1800}
                  unit="RPM"
                  label="Windmill"
                  sublabel="Rotor Velocity"
                  gradientId="gradLiveWMRpm"
                  gradientFrom="#10b981"
                  gradientTo="#059669"
                  precision={0}
                  size={140}
                  isOffline={!isHardwareConnected}
                />
              </div>
              <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Velocity</span>
                <span className={isHardwareConnected && solarData.windmillRpm !== null ? "text-emerald-300 font-bold" : "text-zinc-500"}>
                  {isHardwareConnected && solarData.windmillRpm !== null ? `${((solarData.windmillRpm || 0) * 0.009).toFixed(1)} m/s` : 'Offline'}
                </span>
              </div>
            </div>

            {/* 2. Electricity Generated (Watts) */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-cyan-500/40 rounded-2xl p-3 shadow-xl transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1 px-1 text-xs">
                <span className="font-semibold text-cyan-400 flex items-center gap-1.5 break-words text-xs">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>Wind Power</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {isHardwareConnected ? 'GEN' : 'OFFLINE'}
                </span>
              </div>
              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isHardwareConnected ? solarData.windmillPower : null}
                  min={0}
                  max={250}
                  unit="W"
                  label="Wind Power"
                  sublabel="Turbine Watts"
                  gradientId="gradLiveWMPower"
                  gradientFrom="#06b6d4"
                  gradientTo="#2563eb"
                  precision={1}
                  size={140}
                  isOffline={!isHardwareConnected}
                />
              </div>
              <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Output</span>
                <span className={isHardwareConnected && solarData.windmillPower !== null ? "text-cyan-300 font-bold" : "text-zinc-500"}>
                  {isHardwareConnected && solarData.windmillPower !== null ? `${solarData.windmillPower} Watts` : 'Offline'}
                </span>
              </div>
            </div>

            {/* 3. Air Pressure (hPa) */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-sky-500/40 rounded-2xl p-3 shadow-xl transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1 px-1 text-xs">
                <span className="font-semibold text-sky-400 flex items-center gap-1.5 break-words text-xs">
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span>Air Pressure</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {isHardwareConnected ? 'BMP280' : 'OFFLINE'}
                </span>
              </div>
              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isHardwareConnected ? solarData.airPressure : null}
                  min={950}
                  max={1060}
                  unit="hPa"
                  label="Air Press"
                  sublabel="Barometer"
                  gradientId="gradLivePressure"
                  gradientFrom="#38bdf8"
                  gradientTo="#0284c7"
                  precision={1}
                  size={140}
                  isOffline={!isHardwareConnected}
                />
              </div>
              <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Atmosphere</span>
                <span className={isHardwareConnected && solarData.airPressure !== null ? "text-sky-300 font-bold" : "text-zinc-500"}>
                  {isHardwareConnected && solarData.airPressure !== null ? `${solarData.airPressure} hPa` : 'Offline'}
                </span>
              </div>
            </div>

            {/* 4. Peltier Module Current */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-3 shadow-xl transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1 px-1 text-xs">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5 break-words text-xs">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>Peltier Current</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {isHardwareConnected ? 'INA219' : 'OFFLINE'}
                </span>
              </div>
              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isHardwareConnected ? solarData.peltierCurrent : null}
                  min={0}
                  max={6.0}
                  unit="A"
                  label="Peltier"
                  sublabel="Module Current"
                  gradientId="gradLivePeltierCurrent"
                  gradientFrom="#f59e0b"
                  gradientTo="#d97706"
                  precision={2}
                  size={140}
                  isOffline={!isHardwareConnected}
                />
              </div>
              <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Seebeck Flow</span>
                <span className={isHardwareConnected && solarData.peltierCurrent !== null ? "text-amber-300 font-bold" : "text-zinc-500"}>
                  {isHardwareConnected && solarData.peltierCurrent !== null ? `${solarData.peltierCurrent} Amps` : 'Offline'}
                </span>
              </div>
            </div>

            {/* 5. Sand Temperature */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-3 shadow-xl transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1 px-1 text-xs">
                <span className="font-semibold text-orange-400 flex items-center gap-1.5 break-words text-xs">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span>Sand Temp</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {isHardwareConnected ? 'BED' : 'OFFLINE'}
                </span>
              </div>
              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isHardwareConnected ? solarData.sandTemp : null}
                  min={10}
                  max={90}
                  unit="°C"
                  label="Sand Temp"
                  sublabel="Thermal Mass"
                  gradientId="gradLiveSand"
                  gradientFrom="#ea580c"
                  gradientTo="#c2410c"
                  precision={1}
                  size={140}
                  isOffline={!isHardwareConnected}
                />
              </div>
              <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Thermal Heat</span>
                <span className={isHardwareConnected && solarData.sandTemp !== null ? "text-orange-300 font-bold" : "text-zinc-500"}>
                  {isHardwareConnected && solarData.sandTemp !== null ? `${solarData.sandTemp}°C` : 'Offline'}
                </span>
              </div>
            </div>

            {/* 6. Peltier Temperature */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-rose-500/40 rounded-2xl p-3 shadow-xl transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1 px-1 text-xs">
                <span className="font-semibold text-rose-400 flex items-center gap-1.5 break-words text-xs">
                  <Thermometer className="w-3.5 h-3.5 shrink-0" />
                  <span>Peltier Temp</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {isHardwareConnected ? 'CORE' : 'OFFLINE'}
                </span>
              </div>
              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isHardwareConnected ? solarData.peltierTemp : null}
                  min={10}
                  max={70}
                  unit="°C"
                  label="Peltier Temp"
                  sublabel="Junction Temp"
                  gradientId="gradLivePeltier"
                  gradientFrom="#f43f5e"
                  gradientTo="#be123c"
                  precision={1}
                  size={140}
                  isOffline={!isHardwareConnected}
                />
              </div>
              <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Junction</span>
                <span className={isHardwareConnected && solarData.peltierTemp !== null ? "text-rose-300 font-bold" : "text-zinc-500"}>
                  {isHardwareConnected && solarData.peltierTemp !== null ? `${solarData.peltierTemp}°C` : 'Offline'}
                </span>
              </div>
            </div>

            {/* 7. Environment Temperature */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 rounded-2xl p-3 shadow-xl transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1 px-1 text-xs">
                <span className="font-semibold text-indigo-400 flex items-center gap-1.5 break-words text-xs">
                  <Sun className="w-3.5 h-3.5 shrink-0" />
                  <span>Env Temp</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {isHardwareConnected ? 'AIR' : 'OFFLINE'}
                </span>
              </div>
              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isHardwareConnected ? solarData.environmentTemp : null}
                  min={10}
                  max={60}
                  unit="°C"
                  label="Env Temp"
                  sublabel="Ambient Temp"
                  gradientId="gradLiveEnv"
                  gradientFrom="#818cf8"
                  gradientTo="#4f46e5"
                  precision={1}
                  size={140}
                  isOffline={!isHardwareConnected}
                />
              </div>
              <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Ambient Air</span>
                <span className={isHardwareConnected && solarData.environmentTemp !== null ? "text-indigo-300 font-bold" : "text-zinc-500"}>
                  {isHardwareConnected && solarData.environmentTemp !== null ? `${solarData.environmentTemp}°C` : 'Offline'}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* CLUSTER 3: Agro-IoT Soil Moisture & Automated Irrigation 6-Gauge Cluster */}
        {tachometerCluster === 'soil_moisture' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* 6-Gauge Grid for Soil Moisture & Agro-PV */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
              
              {/* Dial 1: Soil Moisture % */}
              <div className="bg-black/60 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between transition group">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 leading-snug break-words">
                    <Droplets className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Soil Moisture</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                    !isHardwareConnected 
                      ? 'bg-zinc-900 text-zinc-400 border-zinc-800' 
                      : (solarData.soilMoisture ?? 48) < 30
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold'
                  }`}>
                    {isHardwareConnected ? ((solarData.soilMoisture ?? 48) < 30 ? 'DRY' : (solarData.soilMoisture ?? 48) > 70 ? 'WET' : 'OPTIMAL') : 'OFFLINE'}
                  </span>
                </div>
                <div className="my-1.5 flex justify-center">
                  <CircularGauge
                    value={isHardwareConnected ? (solarData.soilMoisture ?? 48) : null}
                    min={0}
                    max={100}
                    unit="%"
                    label="Moisture"
                    sublabel="Capacitive v1.2"
                    gradientId="gradSoilMoisture"
                    gradientFrom="#34d399"
                    gradientTo="#059669"
                    precision={1}
                    size={140}
                    isOffline={!isHardwareConnected}
                  />
                </div>
                <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                  <span>Range: 0-100%</span>
                  <span className={isHardwareConnected ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {isHardwareConnected ? `${solarData.soilMoisture ?? 48}% in rootbed` : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Dial 2: Raw 12-Bit ADC Signal */}
              <div className="bg-black/60 border border-zinc-800 hover:border-cyan-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between transition group">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 leading-snug break-words">
                    <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Raw ADC Signal</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    {isHardwareConnected ? 'GPIO 32' : 'OFFLINE'}
                  </span>
                </div>
                <div className="my-1.5 flex justify-center">
                  <CircularGauge
                    value={isHardwareConnected ? (solarData.soilMoistureRaw ?? 2180) : null}
                    min={0}
                    max={4095}
                    unit="ADC"
                    label="Probe Raw"
                    sublabel="12-Bit Analog"
                    gradientId="gradSoilAdc"
                    gradientFrom="#38bdf8"
                    gradientTo="#0284c7"
                    precision={0}
                    size={140}
                    isOffline={!isHardwareConnected}
                  />
                </div>
                <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                  <span>Volts: {isHardwareConnected ? `${(((solarData.soilMoistureRaw ?? 2180) * 3.3) / 4095).toFixed(2)}V` : '0V'}</span>
                  <span className={isHardwareConnected ? 'text-cyan-400 font-bold' : 'text-zinc-500'}>
                    {isHardwareConnected ? 'Analog In' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Dial 3: Volumetric Water Content (VWC %) */}
              <div className="bg-black/60 border border-zinc-800 hover:border-blue-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between transition group">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 leading-snug break-words">
                    <Waves className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>VWC Content</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    {isHardwareConnected ? 'LOAM' : 'OFFLINE'}
                  </span>
                </div>
                <div className="my-1.5 flex justify-center">
                  <CircularGauge
                    value={isHardwareConnected ? parseFloat((((solarData.soilMoisture ?? 48) * 0.45)).toFixed(1)) : null}
                    min={0}
                    max={50}
                    unit="%"
                    label="Water Vol."
                    sublabel="Mineral Soil"
                    gradientId="gradSoilVwc"
                    gradientFrom="#60a5fa"
                    gradientTo="#1d4ed8"
                    precision={1}
                    size={140}
                    isOffline={!isHardwareConnected}
                  />
                </div>
                <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                  <span>Capacity: 20-28%</span>
                  <span className={isHardwareConnected ? 'text-blue-400 font-bold' : 'text-zinc-500'}>
                    {isHardwareConnected ? `${(((solarData.soilMoisture ?? 48) * 0.45)).toFixed(1)}% VWC` : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Dial 4: Sub-Surface Soil Temperature */}
              <div className="bg-black/60 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between transition group">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 leading-snug break-words">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Soil Bed Temp</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    {isHardwareConnected ? 'DS18B20' : 'OFFLINE'}
                  </span>
                </div>
                <div className="my-1.5 flex justify-center">
                  <CircularGauge
                    value={isHardwareConnected ? (solarData.soilTemperature ?? (solarData.temperature ? Math.max(16, Number((solarData.temperature - 4.5).toFixed(1))) : 23.4)) : null}
                    min={10}
                    max={50}
                    unit="°C"
                    label="Soil Temp"
                    sublabel="Depth: 15cm"
                    gradientId="gradSoilTemp"
                    gradientFrom="#fbbf24"
                    gradientTo="#d97706"
                    precision={1}
                    size={140}
                    isOffline={!isHardwareConnected}
                  />
                </div>
                <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                  <span>Under PV Shade</span>
                  <span className={isHardwareConnected ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                    {isHardwareConnected ? `${(solarData.soilTemperature ?? 23.4)}°C` : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Dial 5: Agro-PV Shade Evaporation Savings */}
              <div className="bg-black/60 border border-zinc-800 hover:border-teal-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between transition group">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 leading-snug break-words">
                    <Leaf className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>PV Conservation</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isHardwareConnected ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    {isHardwareConnected ? '+34% GAIN' : 'OFFLINE'}
                  </span>
                </div>
                <div className="my-1.5 flex justify-center">
                  <CircularGauge
                    value={isHardwareConnected ? 34 : null}
                    min={0}
                    max={100}
                    unit="%"
                    label="Water Saved"
                    sublabel="Shading Shield"
                    gradientId="gradSoilShade"
                    gradientFrom="#2dd4bf"
                    gradientTo="#0f766e"
                    precision={0}
                    size={140}
                    isOffline={!isHardwareConnected}
                  />
                </div>
                <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                  <span>Evap. Shield</span>
                  <span className={isHardwareConnected ? 'text-teal-400 font-bold' : 'text-zinc-500'}>
                    {isHardwareConnected ? '+34% Retention' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Dial 6: Automated Irrigation Pump Relay */}
              <div className="bg-black/60 border border-zinc-800 hover:border-purple-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between transition group">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 leading-snug break-words">
                    <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Irrigation Relay</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                    !isHardwareConnected 
                      ? 'bg-zinc-900 text-zinc-500 border-zinc-800' 
                      : (solarData.irrigationPumpActive || irrigationManualActive || ((solarData.soilMoisture ?? 48) < 30))
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-bold animate-pulse'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}>
                    {isHardwareConnected 
                      ? ((solarData.irrigationPumpActive || irrigationManualActive || ((solarData.soilMoisture ?? 48) < 30)) ? 'ACTIVE' : 'STANDBY')
                      : 'OFFLINE'}
                  </span>
                </div>
                <div className="my-1.5 flex justify-center">
                  <CircularGauge
                    value={isHardwareConnected ? ((solarData.irrigationPumpActive || irrigationManualActive || ((solarData.soilMoisture ?? 48) < 30)) ? 100 : 0) : null}
                    min={0}
                    max={100}
                    unit="%"
                    label="Pump State"
                    sublabel="GPIO 26 Relay"
                    gradientId="gradSoilPump"
                    gradientFrom="#c084fc"
                    gradientTo="#7e22ce"
                    precision={0}
                    size={140}
                    isOffline={!isHardwareConnected}
                  />
                </div>
                <div className="pt-1.5 border-t border-zinc-800/80 px-1 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                  <span>GPIO 26 Out</span>
                  <span className={isHardwareConnected && (solarData.irrigationPumpActive || irrigationManualActive || ((solarData.soilMoisture ?? 48) < 30)) ? 'text-purple-400 font-bold' : 'text-zinc-500'}>
                    {isHardwareConnected 
                      ? ((solarData.irrigationPumpActive || irrigationManualActive || ((solarData.soilMoisture ?? 48) < 30)) ? 'Pumping Water' : 'Standby (Soil OK)')
                      : 'Offline'}
                  </span>
                </div>
              </div>

            </div>

            {/* Comprehensive Agro-Photovoltaic & Soil Irrigation Deck */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Irrigation Auto-Trigger & Manual Pulse Controller */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white font-mono">Automated Irrigation Pump</h4>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                      GPIO 26 Actuator
                    </span>
                  </div>

                  <div className="space-y-3 mt-3 text-xs">
                    <div className="p-3 rounded-xl bg-black border border-zinc-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
                        <span>Trigger Rule:</span>
                        <span className="text-amber-400 font-bold">Moisture &lt; 30% Threshold</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
                        <span>Current Reading:</span>
                        <span className="text-emerald-400 font-bold">{solarData.soilMoisture ?? 48}% (Optimal)</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
                        <span>Hardware Pin:</span>
                        <span className="text-cyan-400">ESP32 GPIO 26 (D8 Relay Optocoupler)</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      When sub-surface soil moisture falls beneath 30%, the microcontroller fires the 12V submersible DC pump to hydrate root zones, auto-stopping at 55% to prevent over-saturation.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80">
                  {irrigationManualActive ? (
                    <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs font-mono flex items-center justify-between animate-pulse">
                      <span className="flex items-center gap-1.5">
                        <Waves className="w-3.5 h-3.5 text-purple-400" />
                        Irrigation Pulse Active... ({irrigationPulseSec ?? 15}s remaining)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIrrigationManualActive(false);
                          setIrrigationPulseSec(null);
                          const cleanRtdb = rtdbUrlInput.trim().replace(/\/+$/, '');
                          fetch(`${cleanRtdb}/solar_iot/node_01.json`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              irrigationPumpActive: false,
                              irrigation_pump: false,
                              updated_at: new Date().toISOString(),
                            }),
                          }).catch(() => {});
                          setDoc(doc(db, 'solar_iot', 'node_01'), {
                            irrigationPumpActive: false,
                            irrigation_pump: false,
                            updatedAt: new Date().toISOString(),
                          }, { merge: true }).catch(() => {});
                        }}
                        className="text-[10px] bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded font-bold transition cursor-pointer"
                      >
                        Stop
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          if (onRequireSignIn) onRequireSignIn();
                          return;
                        }
                        setIrrigationManualActive(true);
                        setIrrigationPulseSec(15);
                        const cleanRtdb = rtdbUrlInput.trim().replace(/\/+$/, '');
                        const boostedMoisture = Math.min(75, (solarData.soilMoisture ?? 54) + 6);
                        fetch(`${cleanRtdb}/solar_iot/node_01.json`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            irrigationPumpActive: true,
                            irrigation_pump: true,
                            soilMoisture: boostedMoisture,
                            soil_moisture: boostedMoisture,
                            updated_at: new Date().toISOString(),
                          }),
                        }).catch(() => {});
                        setDoc(doc(db, 'solar_iot', 'node_01'), {
                          irrigationPumpActive: true,
                          irrigation_pump: true,
                          soilMoisture: boostedMoisture,
                          soil_moisture: boostedMoisture,
                          updatedAt: new Date().toISOString(),
                        }, { merge: true }).catch(() => {});

                        let s = 15;
                        const timer = setInterval(() => {
                          s -= 1;
                          setIrrigationPulseSec(s);
                          if (s <= 0) {
                            clearInterval(timer);
                            setIrrigationManualActive(false);
                            setIrrigationPulseSec(null);
                            fetch(`${cleanRtdb}/solar_iot/node_01.json`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                irrigationPumpActive: false,
                                irrigation_pump: false,
                                updated_at: new Date().toISOString(),
                              }),
                            }).catch(() => {});
                            setDoc(doc(db, 'solar_iot', 'node_01'), {
                              irrigationPumpActive: false,
                              irrigation_pump: false,
                              updatedAt: new Date().toISOString(),
                            }, { merge: true }).catch(() => {});
                          }
                        }, 1000);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Droplets className="w-3.5 h-3.5 text-slate-950" />
                      <span>Trigger Manual 15s Irrigation Pulse</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Agro-Photovoltaic Dual-Land Synergy Analytics */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <Sprout className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white font-mono">Agro-PV Microclimate Synergy</h4>
                    </div>
                    <span className="text-[10px] font-mono bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20">
                      Co-Location
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5 text-xs text-zinc-300">
                    <div className="p-2.5 rounded-xl bg-black border border-zinc-800/80">
                      <span className="font-bold text-emerald-400 block mb-0.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        1. Reduced Soil Water Evaporation (-34%)
                      </span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Photovoltaic panel shade shields the soil from peak midday solar radiation, preserving ground moisture and decreasing irrigation water demand by up to 34%.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black border border-zinc-800/80">
                      <span className="font-bold text-cyan-400 block mb-0.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        2. Transpirational Panel Cooling (+4.8% PV Yield)
                      </span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Crops transpiring beneath the solar array lower the localized ambient temperature by 3–5°C, preventing semiconductor thermal degradation and recovering +4.8% peak generation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] font-mono text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800/60">
                  <span>Soil Classification:</span>
                  <span className="text-emerald-400 font-bold">Sandy Loam / Horticultural</span>
                </div>
              </div>

              {/* Sensor Hardware Calibration & Pinout Guide */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white font-mono">Sensor Pinout & Calibration</h4>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                      Hardware Spec
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                      <span className="text-zinc-400">Sensor Model:</span>
                      <span className="text-emerald-400 font-bold">Capacitive v1.2 (Corrosion-Proof)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                      <span className="text-zinc-400">Signal Interface:</span>
                      <span className="text-cyan-400">ESP32 GPIO 32 (ADC1_CH4)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                      <span className="text-zinc-400">Dry Air Value:</span>
                      <span className="text-amber-400">~3150 ADC (0% Moisture)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                      <span className="text-zinc-400">Water Submerged:</span>
                      <span className="text-blue-400">~1280 ADC (100% Moisture)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                      <span className="text-zinc-400">Supply Voltage:</span>
                      <span className="text-white">3.3V DC (Stable VREG)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-zinc-400 pt-2 border-t border-zinc-800/60 leading-tight">
                  Unlike cheap resistive probes that corrode via electrolysis in days, this capacitive PCB probe measures soil dielectric permittivity safely over years.
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Cleaning System & Mechanical Hardware Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Cleaning System Control & Status */}
        <div className={`lg:col-span-2 bg-zinc-950 border rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between transition-all ${
          !isHardwareConnected ? 'border-red-500/40' : 'border-zinc-800'
        }`}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl border shrink-0 ${
                  !isHardwareConnected 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                    : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                }`}>
                  {!isHardwareConnected ? <WifiOff className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>Automated Motorized Wiper System</span>
                    {!isHardwareConnected ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono font-bold border border-red-500/40 flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        unable to connect microcontroller
                      </span>
                    ) : isCleaning ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono animate-pulse border border-cyan-500/40">
                        Wiping Active...
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/40">
                        Online ({systemMode === 'on_grid' ? 'On-Grid Mode' : 'Off-Grid Mode'})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Motorized silicone squeegee wiper (GPIO 27) — safe dry sweep without damaging water spray
                  </p>
                </div>
              </div>

              {/* Single Clean Solar Panel Button (Disabled while wiperCountdown > 0) */}
              <div className="relative flex items-center gap-2">
                {isCleaning || activeWiperCountdown > 0 ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeWiperCountdown > 0}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs opacity-60 cursor-not-allowed flex items-center gap-2"
                    >
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>Sweeping ({activeWiperCountdown || 5}s)...</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setCleaningCountdown(null);
                        await onStopClean();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      title="Stop motorized wiper immediately"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Stop</span>
                    </button>
                  </div>
                ) : !isHardwareConnected ? (
                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <button
                      onClick={handleStartClean}
                      disabled={activeWiperCountdown > 0}
                      className="px-5 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/50 text-red-200 font-bold text-xs shadow-lg shadow-red-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Microcontroller offline: unable to connect microcontroller (click to queue 5s sweep with auto-reset)"
                    >
                      <WifiOff className="w-3.5 h-3.5 text-red-400" />
                      <span>unable to connect microcontroller</span>
                    </button>
                    <span className="text-[10px] text-red-400/80 font-mono">
                      ESP32 hardware not responding (5s auto-reset guard active)
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleStartClean}
                    disabled={activeWiperCountdown > 0}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer select-none active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
                    <span>Clean Solar Panel</span>
                  </button>
                )}
              </div>
            </div>

            {/* Offline Microcontroller Alert Banner */}
            {!isHardwareConnected && (
              <div className="mt-3 p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <span className="font-bold text-red-300">ESP32 Status: </span>
                    <span className="font-mono text-red-400 font-bold">unable to connect microcontroller</span>
                    <span className="text-zinc-400 block text-[11px] mt-0.5">
                      The automated motorized wiper system cannot execute hardware sweeps because the ESP32 microcontroller is offline or disconnected from Firebase.
                    </span>
                  </div>
                </div>
                <div className="text-[11px] font-mono px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold self-start sm:self-center shrink-0">
                  unable to connect microcontroller
                </div>
              </div>
            )}

            {/* Sweep Progress & Phase Indicator (5-second automated cycle) */}
            {(isCleaning || activeWiperCountdown > 0) && (
              <div className="mt-3 p-3 rounded-xl bg-black border border-cyan-500/40 space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    {activeWiperCountdown > 2 
                      ? 'Phase 1/2: Sweeping across solar glass (0° → 180°)' 
                      : 'Phase 2/2: Wiper returning to home dock & resetting Firestore state'}
                  </span>
                  <span className="text-amber-400 font-bold">
                    {Math.min(100, Math.max(0, Math.round(((5 - activeWiperCountdown) / 5) * 100)))}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, ((5 - activeWiperCountdown) / 5) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Explainer Box */}
            <div className="mt-3 rounded-xl bg-black border border-zinc-800/90 overflow-hidden transition-all text-xs">
              <button
                onClick={() => setShowWhyWiper(!showWhyWiper)}
                className="w-full p-2.5 px-3 flex items-center justify-between text-zinc-300 hover:text-white transition cursor-pointer text-left font-mono"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  Why is the Wiper Trigger Shown & How It Works
                </span>
                <span className="text-zinc-500 text-[11px] flex items-center gap-1">
                  {showWhyWiper ? 'Hide Details' : 'Show Details'}
                  {showWhyWiper ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {showWhyWiper && (
                <div className="px-3.5 pb-3 text-zinc-400 space-y-2 border-t border-zinc-800/60 pt-2 leading-relaxed">
                  <p>
                    <strong className="text-white">Why Trigger Exists: </strong> 
                    Solar panels constantly gather airborne dust, grime, and environmental soot. This cuts light transmission by up to 25%. Spraying water onto hot glass causes dangerous <strong>thermal shock fractures</strong>, so this station uses a <strong>motorized silicone squeegee</strong> (GPIO 27).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-cyan-400 font-bold block mb-0.5">1. Automatic Triggers</span>
                      The ESP32 firmware triggers the squeegee motor automatically when dust attenuation is calculated or on the scheduled timer ({scheduledCleanTime}).
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-amber-400 font-bold block mb-0.5">2. Fingertip Remote Trigger</span>
                      Tapping <strong>Clean Solar Panel</strong> manually executes a full sweep cycle anytime from the cloud.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hardware Actuator Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {/* Clean Time Card */}
              <div className="bg-black border border-zinc-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Clean Time
                  </span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowChangeCleanTimeModal(true)}
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] font-mono flex items-center gap-0.5 cursor-pointer bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 hover:border-cyan-500/40"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1 truncate">
                  {scheduledCleanTime} DAILY
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  Automated nocturnal sweep
                </div>
              </div>

              {/* Thermal Shock Safety Card */}
              <div className="bg-black border border-zinc-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Water Spray Lock
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                  DISABLED (SAFE)
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  Prevents glass thermal shock
                </div>
              </div>

              {/* Wiper Motor */}
              <div className={`bg-black border rounded-xl p-3.5 transition-colors ${!isHardwareConnected ? 'border-red-500/40' : 'border-zinc-800'}`}>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-mono flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Wiper Arm (GPIO 27)
                  </span>
                  <span className={`w-2 h-2 rounded-full ${!isHardwareConnected ? 'bg-red-500' : solarData.wiperActive || isCleaning ? 'bg-amber-400 animate-ping' : 'bg-zinc-700'}`} />
                </div>
                <div className="text-base font-bold font-mono mt-1">
                  {!isHardwareConnected ? (
                    <span className="text-red-400 text-xs font-semibold block leading-tight">unable to connect microcontroller</span>
                  ) : solarData.wiperActive || isCleaning ? (
                    <span className="text-amber-400 font-bold">SWEEPING GLASS</span>
                  ) : (
                    <span className="text-zinc-400">DOCKED HOME</span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  {!isHardwareConnected ? (
                    <span className="text-red-400/80 font-mono">Microcontroller offline</span>
                  ) : (
                    'Silicone double-blade squeegee'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Efficiency Gain Banner */}
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Automated cleaning removes particulate dust & soot, delivering up to <strong className="text-emerald-400">+25% more daily energy yield</strong>.
              </span>
            </div>
            <span className="hidden sm:inline-block font-mono text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
              Dust Soiling: {solarData.soilingIndex ?? 4}%
            </span>
          </div>
        </div>

        {/* IoT Node Connection & Health Info */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Hardware Node (ESP-01 / ESP32)</h3>
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-mono">
                {isHardwareConnected ? (
                  <span className="flex items-center text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                    ONLINE
                  </span>
                ) : (
                  <span className="flex items-center text-amber-400 font-medium text-[11px]">
                    <WifiOff className="w-3.5 h-3.5 mr-1" />
                    {connectionStatus.label}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2.5 mt-3 text-xs font-mono">
              <div className="flex justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                <span className="text-zinc-400">System Mode:</span>
                <span className={systemMode === 'on_grid' ? "text-emerald-400 font-bold" : "text-cyan-400 font-bold"}>
                  {systemMode === 'on_grid' ? 'On-Grid (Grid-Tied)' : 'Off-Grid (Standalone)'}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                <span className="text-zinc-400">Device ID:</span>
                <span className="text-cyan-400 font-semibold">node_01 (ESP-01 / ESP32)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                <span className="text-zinc-400">Inverter Load:</span>
                <span className="text-amber-400 font-bold">{isHardwareConnected ? `${inverterLoadWatts} W` : 'NA'}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                <span className="text-zinc-400">Highest Voltage:</span>
                <span className="text-sky-400 font-bold">
                  {isHardwareConnected && highestVoltage !== null ? `${highestVoltage.toFixed(1)} V` : 'NA'}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-black border border-zinc-800/80">
                <span className="text-zinc-400">Clean Time:</span>
                <span className="text-emerald-400 font-semibold">{scheduledCleanTime}</span>
              </div>
            </div>
          </div>

          {/* Operational Summary */}
          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              Wiper Cleaning: {scheduledCleanTime} Scheduled
            </span>
            <span className="text-zinc-500">Physical Actuator: GPIO 27</span>
          </div>
        </div>

      </div>

      {/* Station Field Notes & Hardware Diagnostics */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Station Field Notes & System Modes</h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            System Nominal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="bg-black rounded-xl p-3.5 border border-zinc-800/80">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Thermal Shock Protection Standard
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Spraying cold water directly onto hot solar panels under sunlight causes severe <strong className="text-white">thermal shock</strong>, fracturing glass and degrading cell junctions. Cleaning is executed safely using the dry silicone wiper squeegee.
            </p>
          </div>

          <div className="bg-black rounded-xl p-3.5 border border-zinc-800/80">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              On-Grid vs Off-Grid Operations
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              In <strong className="text-white">Off-Grid</strong> mode, generated power charges the 12V LiFePO4 battery bank to support inverter load. In <strong className="text-white">On-Grid</strong> mode, solar offsets home inverter load and feeds surplus wattage directly to the utility grid.
            </p>
          </div>

          <div className="bg-black rounded-xl p-3.5 border border-zinc-800/80">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Scheduled Nocturnal Cleaning ({scheduledCleanTime})
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Daily cleaning is scheduled for <strong className="text-white">{scheduledCleanTime}</strong> when panel temperature is lowest. You can adjust this time anytime using the owner account; changes sync instantly over Firebase.
            </p>
          </div>
        </div>
      </div>

      {/* Live Solar Telemetry Sparkline Curve (Dynamic Power Ceiling) */}
      <SolarTelemetryChart
        data={telemetryHistory}
        highestWatt={solarData.highestWattToday}
        highestWattTime={solarData.highestWattTime}
        lastRainTime={solarData.lastRainTime}
        isOffline={!isHardwareConnected}
        disconnectionDurationText="Waiting for ESP32 telemetry stream"
      />

      {/* Cleaning History Logs Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Recent Hardware Cleaning Logs</h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Firestore Collection: <code className="text-cyan-400">cleaning_logs</code>
          </span>
        </div>

        <div className="overflow-x-auto mt-4 w-full max-w-full scrollbar-none">
          <table className="w-full min-w-[500px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-2 font-medium">Log Time</th>
                <th className="pb-2 font-medium">Trigger Type</th>
                <th className="pb-2 font-medium">Duration</th>
                <th className="pb-2 font-medium">Water Used</th>
                <th className="pb-2 font-medium">Efficiency Gain</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {cleaningLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-zinc-500 font-mono">
                    No cleaning cycles recorded today yet. Trigger "Clean Solar Panel" above to record the first sweep.
                  </td>
                </tr>
              ) : (
                cleaningLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-2.5 text-white">{log.timestamp}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-700 text-cyan-400 font-semibold">
                        {log.triggerType === 'manual' ? 'Remote Trigger' : 'Scheduled Sweep'}
                      </span>
                    </td>
                    <td className="py-2.5">{log.durationSeconds}s</td>
                    <td className="py-2.5 text-zinc-400">{log.waterUsedMl} mL (Dry Wipe)</td>
                    <td className="py-2.5 text-emerald-400 font-bold">+{log.efficiencyGain}%</td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Success
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Solar Hardware Procurement Banner */}
      {onNavigateToStore && (
        <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-cyan-500/10 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold uppercase">
              <span>Hardware Upgrades & Store</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Buy Solar Panels, Inverters, LiFePO4 Batteries & Wiper Kits
            </h3>
            <p className="text-xs text-zinc-400 max-w-2xl font-sans">
              Expand your generation capacity with Tier-1 bifacial panels, upgrade to 5kW hybrid MPPT inverters, or add 4.8kWh lithium storage to prevent system overloads.
            </p>
          </div>
          <button
            onClick={onNavigateToStore}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 shrink-0"
          >
            <span>Explore Hardware Store</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Change Scheduled Clean Time Modal */}
      <ChangeCleanTimeModal
        currentTime={scheduledCleanTime}
        isOpen={showChangeCleanTimeModal}
        onClose={() => setShowChangeCleanTimeModal(false)}
        onSave={async (newTime) => {
          if (onUpdateScheduledCleanTime) {
            await onUpdateScheduledCleanTime(newTime);
          }
        }}
        isOwner={isOwner}
        onRequireSignIn={onRequireSignIn || (() => {})}
      />

    </div>
  );
};
