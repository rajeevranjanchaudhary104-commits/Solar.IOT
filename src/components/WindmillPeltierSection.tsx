import React, { useState, useEffect } from 'react';
import { 
  Wind, 
  Zap, 
  Thermometer, 
  Gauge, 
  RotateCw, 
  Compass, 
  Flame, 
  Sun, 
  Activity, 
  Sliders, 
  RefreshCw, 
  ArrowUpRight, 
  WifiOff,
  Cpu,
  Layers,
  Settings,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Play,
  Check,
  X,
  ShieldCheck,
  Radio,
  HelpCircle,
  Info
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SolarData, WindmillPeltierData } from '../types/solar';
import { CircularGauge } from './CircularGauge';
import { SupportedLanguage, getTranslation } from '../lib/translations';

interface WindmillPeltierSectionProps {
  solarData?: SolarData;
  isHardwareConnected?: boolean;
  user: any;
  isOwner: boolean;
  onRequireSignIn: () => void;
  language?: SupportedLanguage;
  onNavigateToLive?: () => void;
}

export const WindmillPeltierSection: React.FC<WindmillPeltierSectionProps> = ({
  solarData,
  isHardwareConnected = false,
  user,
  isOwner,
  onRequireSignIn,
  language = 'en',
  onNavigateToLive,
}) => {
  const t = (key: string) => getTranslation(language, key);

  // Live Telemetry State (Starts strictly offline until real hardware connects)
  const [data, setData] = useState<WindmillPeltierData>({
    peltierCurrent: null,
    peltierVoltage: null,
    peltierPower: null,
    sandTemp: null,
    peltierTemp: null,
    environmentTemp: null,
    windmillRpm: null,
    windmillPower: null,
    windmillVoltage: null,
    windmillCurrent: null,
    airPressure: null,
    status: 'offline',
    espConnected: false,
    updatedAt: null,
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [historyPoints, setHistoryPoints] = useState<Array<{
    time: string;
    rpm: number;
    watts: number;
    peltierAmps: number;
    sandTemp: number;
    envTemp: number;
    pressure: number;
  }>>([]);

  const [activeTab, setActiveTab] = useState<'metrics' | 'components' | 'physics' | 'wiring'>('metrics');
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [pulsesPerRev, setPulsesPerRev] = useState<number>(1);
  const [rotorDiameterM, setRotorDiameterM] = useState<number>(0.85);

  // Synchronize with parent solarData telemetry only when hardware is genuinely connected
  useEffect(() => {
    if (isHardwareConnected && solarData?.espConnected) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentRpm = solarData.windmillRpm ?? null;
      const currentWatts = solarData.windmillPower ?? null;
      const currentPeltierAmps = solarData.peltierCurrent ?? null;
      const currentSand = solarData.sandTemp ?? null;
      const currentEnv = solarData.environmentTemp ?? null;
      const currentPress = solarData.airPressure ?? null;

      if (currentRpm !== null || currentWatts !== null || currentPeltierAmps !== null) {
        const newPoint = {
          time: timeStr,
          rpm: currentRpm ?? 0,
          watts: currentWatts ?? 0,
          peltierAmps: currentPeltierAmps ?? 0,
          sandTemp: currentSand ?? 0,
          envTemp: currentEnv ?? 0,
          pressure: currentPress ?? 1013,
        };

        setHistoryPoints((prevHist) => {
          const last = prevHist[prevHist.length - 1];
          if (last && last.time === timeStr) {
            return [...prevHist.slice(0, -1), newPoint];
          }
          return [...prevHist.slice(-14), newPoint];
        });
      }

      setData({
        peltierCurrent: currentPeltierAmps,
        peltierVoltage: solarData.peltierVoltage ?? null,
        peltierPower: solarData.peltierPower ?? null,
        sandTemp: currentSand,
        peltierTemp: solarData.peltierTemp ?? null,
        environmentTemp: currentEnv,
        windmillRpm: currentRpm,
        windmillPower: currentWatts,
        windmillVoltage: solarData.windmillVoltage ?? null,
        windmillCurrent: solarData.windmillCurrent ?? null,
        airPressure: currentPress,
        status: 'generating',
        espConnected: true,
        updatedAt: solarData.updatedAt || new Date().toISOString(),
      });
    } else if (!isHardwareConnected) {
      setData((prev) => ({
        ...prev,
        peltierCurrent: null,
        peltierVoltage: null,
        peltierPower: null,
        sandTemp: null,
        peltierTemp: null,
        environmentTemp: null,
        windmillRpm: null,
        windmillPower: null,
        windmillVoltage: null,
        windmillCurrent: null,
        airPressure: null,
        status: 'offline',
        espConnected: false,
      }));
    }
  }, [isHardwareConnected, solarData]);

  // Listen to Firestore document 'solar_iot/windmill_peltier' for dedicated telemetry
  useEffect(() => {
    try {
      const docRef = doc(db, 'solar_iot', 'windmill_peltier');
      const unsub = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remote = snapshot.data();
          if (remote) {
            const updatedAtTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
            const isRecent = updatedAtTime > 0 && (Date.now() - updatedAtTime < 30 * 1000);
            const isLive = Boolean(remote.espConnected === true && isRecent);

            if (isLive) {
              const getRemoteVal = (...keys: string[]) => {
                for (const k of keys) {
                  if (remote[k] !== undefined && remote[k] !== null) return remote[k];
                }
                return undefined;
              };

              const rRpm = getRemoteVal('windmillRpm', 'windmill_rpm', 'rpm');
              const rWatts = getRemoteVal('electricityGenerated', 'windmillPower', 'windmill_power', 'power_generated');
              const rPeltierAmps = getRemoteVal('peltierCurrent', 'peltier_current');
              const rPeltierVolts = getRemoteVal('peltierVoltage', 'peltier_voltage');
              const rPeltierWatts = getRemoteVal('peltierPower', 'peltier_power');
              const rSandTemp = getRemoteVal('sandTemp', 'sand_temp');
              const rPeltierTemp = getRemoteVal('peltierTemp', 'peltier_temp');
              const rEnvTemp = getRemoteVal('environmentTemp', 'environment_temp', 'env_temp');
              const rWindVoltage = getRemoteVal('windmillVoltage', 'windmill_voltage');
              const rWindCurrent = getRemoteVal('windmillCurrent', 'windmill_current');
              const rPressure = getRemoteVal('airPressure', 'air_pressure', 'pressure');

              const newPoint = {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                rpm: rRpm !== undefined ? Number(rRpm) : 0,
                watts: rWatts !== undefined ? Number(rWatts) : 0,
                peltierAmps: rPeltierAmps !== undefined ? Number(rPeltierAmps) : 0,
                sandTemp: rSandTemp !== undefined ? Number(rSandTemp) : 0,
                envTemp: rEnvTemp !== undefined ? Number(rEnvTemp) : 0,
                pressure: rPressure !== undefined ? Number(rPressure) : 1013,
              };

              setHistoryPoints((prevHist) => [...prevHist.slice(-14), newPoint]);

              setData({
                peltierCurrent: rPeltierAmps !== undefined ? Number(rPeltierAmps) : null,
                peltierVoltage: rPeltierVolts !== undefined ? Number(rPeltierVolts) : null,
                peltierPower: rPeltierWatts !== undefined ? Number(rPeltierWatts) : null,
                sandTemp: rSandTemp !== undefined ? Number(rSandTemp) : null,
                peltierTemp: rPeltierTemp !== undefined ? Number(rPeltierTemp) : null,
                environmentTemp: rEnvTemp !== undefined ? Number(rEnvTemp) : null,
                windmillRpm: rRpm !== undefined ? Number(rRpm) : null,
                windmillPower: rWatts !== undefined ? Number(rWatts) : null,
                windmillVoltage: rWindVoltage !== undefined ? Number(rWindVoltage) : null,
                windmillCurrent: rWindCurrent !== undefined ? Number(rWindCurrent) : null,
                airPressure: rPressure !== undefined ? Number(rPressure) : null,
                updatedAt: remote.updatedAt || new Date().toISOString(),
                status: 'generating',
                espConnected: true,
              });
            } else if (!isHardwareConnected) {
              // Remote document is stale or marked disconnected
              setData((prev) => ({
                ...prev,
                espConnected: false,
                status: 'offline',
                peltierCurrent: null,
                peltierVoltage: null,
                peltierPower: null,
                sandTemp: null,
                peltierTemp: null,
                environmentTemp: null,
                windmillRpm: null,
                windmillPower: null,
                windmillVoltage: null,
                windmillCurrent: null,
                airPressure: null,
              }));
            }
          }
        }
      }, (err) => {
        console.warn('Note on windmill_peltier snapshot:', err.message);
      });

      return () => unsub();
    } catch (e) {
      // silent fallback
    }
  }, [isHardwareConnected]);

  // Comprehensive hardware connection check
  const isStationConnected = Boolean(
    (isHardwareConnected && solarData?.espConnected) ||
    (data.espConnected && data.updatedAt && (Date.now() - new Date(data.updatedAt).getTime() < 30 * 1000) && (data.windmillRpm !== null || data.peltierCurrent !== null))
  );

  // Active effective values strictly from physical station telemetry
  const isEffectiveConnected = isStationConnected;
  const effectiveRpm = isStationConnected ? data.windmillRpm : null;
  const effectiveWindmillPower = isStationConnected ? data.windmillPower : null;
  const effectiveWindmillVoltage = isStationConnected ? data.windmillVoltage : null;
  const effectiveWindmillCurrent = isStationConnected ? data.windmillCurrent : null;
  const effectiveAirPressure = isStationConnected ? data.airPressure : null;
  const effectiveSandTemp = isStationConnected ? data.sandTemp : null;
  const effectiveEnvTemp = isStationConnected ? data.environmentTemp : null;
  const effectivePeltierPower = isStationConnected ? data.peltierPower : null;
  const effectivePeltierVoltage = isStationConnected ? data.peltierVoltage : null;
  const effectivePeltierCurrent = isStationConnected ? data.peltierCurrent : null;
  const effectivePeltierTemp = isStationConnected ? data.peltierTemp : null;

  // Aerodynamic & physical calculations
  const effectiveWindSpeedMs = effectiveRpm !== null ? (effectiveRpm * 0.009).toFixed(1) : null;
  const windSpeedNum = effectiveWindSpeedMs ? parseFloat(effectiveWindSpeedMs) : 0;
  const sweptRadius = rotorDiameterM / 2;
  const sweptArea = (Math.PI * Math.pow(sweptRadius, 2)).toFixed(2);
  const airDensity = effectiveAirPressure && effectiveEnvTemp
    ? ((effectiveAirPressure * 100) / (287.05 * (effectiveEnvTemp + 273.15))).toFixed(3)
    : '1.225';
  const kineticWindFluxWatts = (0.5 * parseFloat(airDensity) * parseFloat(sweptArea) * Math.pow(windSpeedNum, 3)).toFixed(1);
  const betzMaxWatts = (parseFloat(kineticWindFluxWatts) * (16 / 27)).toFixed(1);
  const omegaRadSec = ((effectiveRpm || 0) * 2 * Math.PI) / 60;
  const tipSpeedMs = omegaRadSec * sweptRadius;
  const tipSpeedRatio = windSpeedNum > 0 ? (tipSpeedMs / windSpeedNum).toFixed(2) : '0.00';
  const counterTorqueNm = (effectiveRpm && effectiveRpm > 0 && effectiveWindmillPower)
    ? (effectiveWindmillPower / omegaRadSec).toFixed(3)
    : '0.000';
  const hallFrequencyHz = effectiveRpm ? ((effectiveRpm / 60) * pulsesPerRev).toFixed(1) : '0.0';
  const aerodynamicCpPercent = (parseFloat(kineticWindFluxWatts) > 0 && effectiveWindmillPower)
    ? (((effectiveWindmillPower) / parseFloat(kineticWindFluxWatts)) * 100).toFixed(1)
    : '0.0';

  // Manual Push to Cloud (Owner only)
  const handleSaveToCloud = async () => {
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'solar_iot', 'windmill_peltier');
      await setDoc(docRef, {
        peltierCurrent: effectivePeltierCurrent,
        peltierVoltage: effectivePeltierVoltage,
        peltierPower: effectivePeltierPower,
        sandTemp: effectiveSandTemp,
        peltierTemp: effectivePeltierTemp,
        environmentTemp: effectiveEnvTemp,
        windmillRpm: effectiveRpm,
        electricityGenerated: effectiveWindmillPower,
        windmillVoltage: effectiveWindmillVoltage,
        windmillCurrent: effectiveWindmillCurrent,
        airPressure: effectiveAirPressure,
        updatedAt: new Date().toISOString(),
        status: isEffectiveConnected ? 'generating' : 'offline',
        espConnected: isEffectiveConnected,
      }, { merge: true });
    } catch (err) {
      console.warn('Note saving windmill_peltier:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // Thermoelectric thermal gradient delta
  const hasTempData = isEffectiveConnected && effectiveSandTemp !== null && effectiveEnvTemp !== null;
  const deltaT = hasTempData ? (effectiveSandTemp! - effectiveEnvTemp!).toFixed(1) : null;
  
  // Total hybrid clean energy generation
  const hasGenerationData = isEffectiveConnected && (effectiveWindmillPower !== null || effectivePeltierPower !== null);
  const totalCombinedGeneration = hasGenerationData 
    ? (((effectiveWindmillPower ?? 0) + (effectivePeltierPower ?? 0))).toFixed(1)
    : null;

  // Dynamic CSS rotation speed for the windmill SVG based on live RPM
  const rotationDurationSec = (isEffectiveConnected && (effectiveRpm ?? 0) > 0)
    ? Math.max(0.3, Math.min(5, 60 / ((effectiveRpm || 100) / 3)))
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Top Banner & Control Strip */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`p-2 rounded-xl border ${
                isStationConnected 
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {isStationConnected ? <Wind className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                Hybrid Aero-Kinetic & Thermoelectric Station
              </span>
              
              {/* Real Connection Status Pill */}
              {isStationConnected ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Telemetry Synchronized
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Station Disconnected (Offline)
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              {t('windmillPeltier')}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Real-time monitoring of <strong>Windmill Rotor RPM</strong>, <strong>Electricity Generated</strong>, and <strong>Atmospheric Air Pressure</strong> coupled with <strong>Peltier Seebeck Thermoelectric Current</strong> harvested across <strong>Sand Thermal Storage</strong> and <strong>Environmental Ambient Temperature</strong>.
            </p>
          </div>

          {/* Cloud Sync & Dashboard Navigation Controls */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto shrink-0 font-mono text-xs">
            <button
              onClick={handleSaveToCloud}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition cursor-pointer flex items-center gap-2"
              title="Sync current telemetry state to Firebase Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>

            {onNavigateToLive && (
              <button
                onClick={onNavigateToLive}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <span>Live Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Stats Card Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Total Generation */}
        <div className="bg-zinc-950 border border-cyan-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1.5 text-cyan-400 font-bold break-words">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Total Wind + Peltier</span>
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
              isEffectiveConnected ? 'bg-cyan-400/10 text-cyan-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {isEffectiveConnected ? 'HYBRID' : 'OFFLINE'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isEffectiveConnected && totalCombinedGeneration !== null ? totalCombinedGeneration : 'N/A'}</span>
              <span className="text-cyan-400 font-bold text-xs">Watts</span>
            </div>
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 mt-1 gap-1">
              <span>{isEffectiveConnected ? `Wind: ${effectiveWindmillPower ?? 0}W` : 'Microcontroller'}</span>
              <span className={isEffectiveConnected ? "text-amber-300" : "text-red-400 font-semibold"}>
                {isEffectiveConnected ? `Peltier: ${effectivePeltierPower ?? 0}W` : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Rotor RPM */}
        <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1.5 text-emerald-400 font-bold break-words">
              <RotateCw className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('windmillRpm')}</span>
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
              isEffectiveConnected ? 'bg-emerald-400/10 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {isEffectiveConnected ? 'TACHOMETER' : 'OFFLINE'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isEffectiveConnected && effectiveRpm !== null ? effectiveRpm : 'N/A'}</span>
              <span className="text-emerald-400 font-bold text-xs">RPM</span>
            </div>
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 mt-1 gap-1">
              <span>Rotor Velocity</span>
              <span className={isEffectiveConnected ? "text-emerald-300 font-medium" : "text-zinc-500"}>
                {isEffectiveConnected && effectiveRpm !== null
                  ? ((effectiveRpm > 800 ? 'High Wind' : effectiveRpm > 300 ? 'Optimal' : 'Low Breeze'))
                  : 'Hardware Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Sand Thermal Gradient */}
        <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1.5 text-amber-400 font-bold break-words">
              <Flame className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sand ΔT Gradient</span>
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
              isEffectiveConnected ? 'bg-amber-400/10 text-amber-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {isEffectiveConnected ? 'SEEBECK' : 'OFFLINE'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isEffectiveConnected && deltaT !== null ? `+${deltaT}` : 'N/A'}</span>
              <span className="text-amber-400 font-bold text-xs">°C Δ</span>
            </div>
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 mt-1 gap-1">
              <span>{isEffectiveConnected ? `Sand: ${effectiveSandTemp ?? 'N/A'}°C` : 'Sensors Offline'}</span>
              <span className={isEffectiveConnected ? "text-cyan-300" : "text-zinc-500"}>
                {isEffectiveConnected ? `Env: ${effectiveEnvTemp ?? 'N/A'}°C` : 'No Signal'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Barometric Pressure */}
        <div className="bg-zinc-950 border border-sky-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1.5 text-sky-400 font-bold break-words">
              <Compass className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{t('airPressure')}</span>
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
              isEffectiveConnected ? 'bg-sky-400/10 text-sky-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {isEffectiveConnected ? 'BMP280' : 'OFFLINE'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isEffectiveConnected && effectiveAirPressure !== null ? effectiveAirPressure : 'N/A'}</span>
              <span className="text-sky-400 font-bold text-xs">hPa</span>
            </div>
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 mt-1 gap-1">
              <span>Atmospheric Density</span>
              <span className={isEffectiveConnected ? "text-sky-300 font-medium" : "text-zinc-500"}>
                {isEffectiveConnected ? `${airDensity} kg/m³` : 'Hardware Disconnected'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Main 7-Core Sensor Tachometer Cluster & Subsystem Center */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${
              isEffectiveConnected 
                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Windmill & Peltier Component System</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isEffectiveConnected 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold' 
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}>
                  {isEffectiveConnected ? '6 Subsystems Calibrated' : 'Station Disconnected'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Hardware: Hall Sensor (GPIO 34), INA219 (I2C 0x41), BMP280 (I2C 0x76), DS18B20 (GPIO 4), Peltier Seebeck TEG
              </p>
            </div>
          </div>

          {/* Subsystem & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black border border-zinc-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  activeTab === 'metrics'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                1. 7 Dials
              </button>
              <button
                onClick={() => setActiveTab('components')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  activeTab === 'components'
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                2. Components (6)
              </button>
              <button
                onClick={() => setActiveTab('physics')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  activeTab === 'physics'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                3. Aerodynamics & Power Curve
              </button>
              <button
                onClick={() => setActiveTab('wiring')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  activeTab === 'wiring'
                    ? 'bg-purple-500 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                4. Wiring Pinouts
              </button>
            </div>

            <button
              onClick={() => setShowCalibrationModal(true)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-cyan-400 font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow shrink-0"
              title="Open Hardware Calibration & Sensor Offsets"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hardware Calibration</span>
            </button>
          </div>
        </div>

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7 gap-3 sm:gap-4">
            
            {/* Dial 1: Windmill RPM */}
            <div className="bg-black/60 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-3.5 shadow-md transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 text-xs px-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-xs break-words">
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('windmillRpm')}</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isStationConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {isStationConnected ? 'HALL' : 'OFFLINE'}
                </span>
              </div>

              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isStationConnected ? data.windmillRpm : null}
                  min={0}
                  max={1800}
                  unit="RPM"
                  label="Windmill"
                  sublabel="Rotor Velocity"
                  gradientId="gradWindmillRpm"
                  gradientFrom="#10b981"
                  gradientTo="#059669"
                  precision={0}
                  size={142}
                  isOffline={!isStationConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Estimated Wind:</span>
                <span className={isStationConnected && data.windmillRpm !== null ? "text-emerald-300 font-bold" : "text-zinc-500"}>
                  {isStationConnected && data.windmillRpm !== null ? `${((data.windmillRpm || 0) * 0.009).toFixed(1)} m/s` : 'Offline'}
                </span>
              </div>
            </div>

            {/* Dial 2: Electricity Generated */}
            <div className="bg-black/60 border border-zinc-800 hover:border-cyan-500/40 rounded-2xl p-3.5 shadow-md transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 text-xs px-1">
                <span className="font-semibold text-cyan-400 flex items-center gap-1.5 text-xs break-words">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('electricityGenerated')}</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isStationConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {isStationConnected ? 'GEN' : 'OFFLINE'}
                </span>
              </div>

              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isStationConnected ? data.windmillPower : null}
                  min={0}
                  max={250}
                  unit="W"
                  label="Wind Power"
                  sublabel="Electric Power"
                  gradientId="gradWindmillPower"
                  gradientFrom="#06b6d4"
                  gradientTo="#2563eb"
                  precision={1}
                  size={142}
                  isOffline={!isStationConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Bus Output:</span>
                <span className={isStationConnected && data.windmillPower !== null ? "text-cyan-300 font-bold" : "text-zinc-500"}>
                  {isStationConnected && data.windmillVoltage !== null && data.windmillCurrent !== null 
                    ? `${data.windmillVoltage}V @ ${data.windmillCurrent}A` 
                    : 'Offline'}
                </span>
              </div>
            </div>

            {/* Dial 3: Air Pressure */}
            <div className="bg-black/60 border border-zinc-800 hover:border-sky-500/40 rounded-2xl p-3.5 shadow-md transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 text-xs px-1">
                <span className="font-semibold text-sky-400 flex items-center gap-1.5 text-xs break-words">
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('airPressure')}</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isStationConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {isStationConnected ? 'BMP280' : 'OFFLINE'}
                </span>
              </div>

              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isStationConnected ? data.airPressure : null}
                  min={950}
                  max={1060}
                  unit="hPa"
                  label="Air Press"
                  sublabel="Barometer"
                  gradientId="gradAirPressure"
                  gradientFrom="#38bdf8"
                  gradientTo="#0284c7"
                  precision={1}
                  size={142}
                  isOffline={!isStationConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Elevation:</span>
                <span className={isStationConnected && data.airPressure !== null ? "text-sky-300 font-bold" : "text-zinc-500"}>
                  {isStationConnected && data.airPressure !== null 
                    ? `${Math.round(44330 * (1 - Math.pow(((data.airPressure) / 1013.25), 0.1903)))} m ASL`
                    : 'Offline'}
                </span>
              </div>
            </div>

            {/* Dial 4: Peltier Module Current */}
            <div className="bg-black/60 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-3.5 shadow-md transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 text-xs px-1">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5 text-xs break-words">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('peltierCurrent')}</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isStationConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {isStationConnected ? 'INA219' : 'OFFLINE'}
                </span>
              </div>

              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isStationConnected ? data.peltierCurrent : null}
                  min={0}
                  max={6.0}
                  unit="A"
                  label="Peltier"
                  sublabel="Seebeck Loop"
                  gradientId="gradPeltierCurrent"
                  gradientFrom="#f59e0b"
                  gradientTo="#d97706"
                  precision={2}
                  size={142}
                  isOffline={!isStationConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Peltier Power:</span>
                <span className={isStationConnected && data.peltierPower !== null ? "text-amber-300 font-bold" : "text-zinc-500"}>
                  {isStationConnected && data.peltierPower !== null ? `${data.peltierPower} Watts` : 'Offline'}
                </span>
              </div>
            </div>

            {/* Dial 5: Sand Temperature */}
            <div className="bg-black/60 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-3.5 shadow-md transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 text-xs px-1">
                <span className="font-semibold text-orange-400 flex items-center gap-1.5 text-xs break-words">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('sandTemp')}</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isStationConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {isStationConnected ? 'DS18B20' : 'OFFLINE'}
                </span>
              </div>

              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isStationConnected ? data.sandTemp : null}
                  min={10}
                  max={90}
                  unit="°C"
                  label="Sand Temp"
                  sublabel="Thermal Mass"
                  gradientId="gradSandTemp"
                  gradientFrom="#ea580c"
                  gradientTo="#c2410c"
                  precision={1}
                  size={142}
                  isOffline={!isStationConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Thermal Bed:</span>
                <span className={isStationConnected && data.sandTemp !== null ? "text-orange-300 font-bold" : "text-zinc-500"}>
                  {isStationConnected && data.sandTemp !== null ? `${data.sandTemp}°C` : 'Offline'}
                </span>
              </div>
            </div>

            {/* Dial 6: Peltier Temperature */}
            <div className="bg-black/60 border border-zinc-800 hover:border-rose-500/40 rounded-2xl p-3.5 shadow-md transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 text-xs px-1">
                <span className="font-semibold text-rose-400 flex items-center gap-1.5 text-xs break-words">
                  <Thermometer className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('peltierTemp')}</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isStationConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {isStationConnected ? 'CORE' : 'OFFLINE'}
                </span>
              </div>

              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isStationConnected ? data.peltierTemp : null}
                  min={10}
                  max={70}
                  unit="°C"
                  label="Peltier Temp"
                  sublabel="Junction Temp"
                  gradientId="gradPeltierTemp"
                  gradientFrom="#f43f5e"
                  gradientTo="#be123c"
                  precision={1}
                  size={142}
                  isOffline={!isStationConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Junction:</span>
                <span className={isStationConnected && data.peltierTemp !== null ? "text-rose-300 font-bold" : "text-zinc-500"}>
                  {isStationConnected && data.peltierTemp !== null ? `${data.peltierTemp}°C` : 'Offline'}
                </span>
              </div>
            </div>

            {/* Dial 7: Environment Temperature */}
            <div className="bg-black/60 border border-zinc-800 hover:border-indigo-500/40 rounded-2xl p-3.5 shadow-md transition flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1.5 text-xs px-1">
                <span className="font-semibold text-indigo-400 flex items-center gap-1.5 text-xs break-words">
                  <Sun className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('environmentTemp')}</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  isStationConnected ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {isStationConnected ? 'AMBIENT' : 'OFFLINE'}
                </span>
              </div>

              <div className="my-1.5 flex justify-center">
                <CircularGauge
                  value={isStationConnected ? data.environmentTemp : null}
                  min={10}
                  max={60}
                  unit="°C"
                  label="Env Temp"
                  sublabel="Surroundings"
                  gradientId="gradEnvTemp"
                  gradientFrom="#818cf8"
                  gradientTo="#4f46e5"
                  precision={1}
                  size={142}
                  isOffline={!isStationConnected}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 text-zinc-400">
                <span>Surroundings:</span>
                <span className={isStationConnected && data.environmentTemp !== null ? "text-indigo-300 font-bold" : "text-zinc-500"}>
                  {isStationConnected && data.environmentTemp !== null ? `${data.environmentTemp}°C` : 'Offline'}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: All 6 Components Detailed Breakdown & Live Health */}
        {activeTab === 'components' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-black/80 rounded-2xl border border-zinc-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">6 Core Windmill & Thermoelectric Subsystem Components</span>
              </div>
              <span className="text-[11px] text-zinc-400">
                Live Status: <strong className={isEffectiveConnected ? "text-emerald-400" : "text-amber-400"}>
                  {isEffectiveConnected ? 'All 6 Hardware Channels Operational' : 'Awaiting ESP32 Microcontroller Signal'}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Component 1: Hall Effect Tachometer */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                      <RotateCw className="w-4 h-4 text-emerald-400" />
                      1. Hall Effect Tachometer
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isEffectiveConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {isEffectiveConnected ? 'INTERRUPT ACTIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-2 leading-relaxed">
                    Mounted on rotor bearing. Detects magnetic pulse per revolution on <strong>GPIO 34</strong> using hardware interrupt edge trigger.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black border border-zinc-900 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-300">
                    <span>Rotor Velocity:</span>
                    <strong className="text-emerald-400 font-bold">{effectiveRpm !== null ? `${effectiveRpm} RPM` : 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Pulse Frequency:</span>
                    <span className="text-zinc-200">{hallFrequencyHz} Hz ({pulsesPerRev} PPR)</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Pin / Protocol:</span>
                    <span className="text-cyan-400 font-bold">GPIO 34 (FALLING ISR)</span>
                  </div>
                </div>
              </div>

              {/* Component 2: 3-Phase Dynamo & Rectifier */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-cyan-500/40 transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      2. 3-Phase Dynamo Generator
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isEffectiveConnected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {isEffectiveConnected ? 'AC RECTIFIED' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-2 leading-relaxed">
                    Low-RPM brushless 3-phase alternator coupled to Schottky full-wave bridge rectifier to produce smooth DC charging current.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black border border-zinc-900 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-300">
                    <span>Output Power:</span>
                    <strong className="text-cyan-400 font-bold">{effectiveWindmillPower !== null ? `${effectiveWindmillPower} Watts` : 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Terminal Voltage:</span>
                    <span className="text-zinc-200">{effectiveWindmillVoltage !== null ? `${effectiveWindmillVoltage} V` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Generator Type:</span>
                    <span className="text-zinc-300">Permanent Magnet (PMSG)</span>
                  </div>
                </div>
              </div>

              {/* Component 3: INA219 Windmill Power Monitor */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-blue-400" />
                      3. INA219 Power Shunt (0x41)
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isEffectiveConnected ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {isEffectiveConnected ? 'I2C CALIBRATED' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-2 leading-relaxed">
                    High-side 0.1Ω precision current shunt sensor monitoring the wind generator load bank on I2C address <strong>0x41</strong>.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black border border-zinc-900 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-300">
                    <span>Current Draw:</span>
                    <strong className="text-blue-400 font-bold">{effectiveWindmillCurrent !== null ? `${effectiveWindmillCurrent} A` : 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>I2C Address:</span>
                    <span className="text-zinc-200">0x41 (A0 bridged to VCC)</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Bus Voltage / Shunt:</span>
                    <span className="text-cyan-400 font-bold">GPIO 21 (SDA), GPIO 22 (SCL)</span>
                  </div>
                </div>
              </div>

              {/* Component 4: BMP280 Barometer & Air Density */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-sky-500/40 transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-sky-400" />
                      4. BMP280 Barometric Sensor
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isEffectiveConnected ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {isEffectiveConnected ? 'I2C 0x76' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-2 leading-relaxed">
                    Accurate atmospheric pressure for real-time air density (ρ) calculation in aerodynamic kinetic wind flux formulas.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black border border-zinc-900 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-300">
                    <span>Barometric Pressure:</span>
                    <strong className="text-sky-400 font-bold">{effectiveAirPressure !== null ? `${effectiveAirPressure} hPa` : 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Calculated Air Density ρ:</span>
                    <span className="text-zinc-200">{airDensity} kg/m³</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Kinetic Flux Potential:</span>
                    <span className="text-amber-400 font-bold">{kineticWindFluxWatts} W (Swept)</span>
                  </div>
                </div>
              </div>

              {/* Component 5: Peltier Seebeck Thermoelectric Tile */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400" />
                      5. Peltier Seebeck Generator
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isEffectiveConnected ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {isEffectiveConnected ? 'THERMOELECTRIC' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-2 leading-relaxed">
                    Solid-state bismuth telluride (Bi₂Te₃) module generating direct DC current across sand bed and ambient air thermal gradients.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black border border-zinc-900 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-300">
                    <span>Seebeck Current:</span>
                    <strong className="text-amber-400 font-bold">{effectivePeltierCurrent !== null ? `${effectivePeltierCurrent} A` : 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Harvested Power:</span>
                    <span className="text-zinc-200">{effectivePeltierPower !== null ? `${effectivePeltierPower} W` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Thermal Gradient ΔT:</span>
                    <span className="text-amber-300 font-bold">{deltaT !== null ? `+${deltaT}°C` : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Component 6: DS18B20 Sand Bed Thermal Probe */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-orange-500/40 transition space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-orange-400 flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4 text-orange-400" />
                      6. DS18B20 Thermal Probe
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isEffectiveConnected ? 'bg-orange-500/20 text-orange-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {isEffectiveConnected ? 'ONEWIRE GPIO 4' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-2 leading-relaxed">
                    Waterproof stainless steel temperature probe submerged in concentrated sand thermal storage bed with 4.7kΩ pullup resistor.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black border border-zinc-900 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-300">
                    <span>Sand Storage Temp:</span>
                    <strong className="text-orange-400 font-bold">{effectiveSandTemp !== null ? `${effectiveSandTemp}°C` : 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Ambient Environment:</span>
                    <span className="text-zinc-200">{effectiveEnvTemp !== null ? `${effectiveEnvTemp}°C` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Bus / Protocol:</span>
                    <span className="text-cyan-400 font-bold">Dallas 1-Wire (GPIO 4)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Physics, Aerodynamics & Power Curve */}
        {activeTab === 'physics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* Visual 1: Animated Windmill Turbine */}
              <div className="p-5 rounded-2xl bg-black border border-zinc-800 space-y-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wind className={`w-4 h-4 ${isEffectiveConnected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                    <span className="font-bold text-white text-sm">Wind Turbine Aerodynamic Rotor</span>
                  </div>
                  <span className={`text-xs font-mono ${isEffectiveConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {isEffectiveConnected && effectiveRpm !== null 
                      ? `${effectiveRpm} RPM • Speed: ${((effectiveRpm || 0) * 0.009).toFixed(1)} m/s`
                      : 'Rotor Inactive (Station Disconnected)'}
                  </span>
                </div>

                {/* Dynamic SVG Windmill */}
                <div className="flex items-center justify-center py-6">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    
                    {/* Tower Pole */}
                    <div className="absolute bottom-0 w-3 h-24 bg-gradient-to-t from-zinc-800 to-zinc-600 rounded-t" />

                    {/* Spinning Rotor Blades (Only spins if hardware connected & rotating) */}
                    <svg 
                      viewBox="0 0 100 100" 
                      className="w-40 h-40 origin-center transition-all"
                      style={{
                        animation: (isEffectiveConnected && (effectiveRpm ?? 0) > 0)
                          ? `spin ${rotationDurationSec}s linear infinite` 
                          : 'none'
                      }}
                    >
                      <g transform="translate(50, 50)">
                        {/* Blade 1 (0 deg) */}
                        <path d="M 0 0 C -4 -15, -6 -35, 0 -45 C 6 -35, 4 -15, 0 0 Z" fill={isEffectiveConnected ? "#22d3ee" : "#475569"} opacity={isEffectiveConnected ? 0.9 : 0.4} />
                        {/* Blade 2 (120 deg) */}
                        <g transform="rotate(120)">
                          <path d="M 0 0 C -4 -15, -6 -35, 0 -45 C 6 -35, 4 -15, 0 0 Z" fill={isEffectiveConnected ? "#38bdf8" : "#475569"} opacity={isEffectiveConnected ? 0.9 : 0.4} />
                        </g>
                        {/* Blade 3 (240 deg) */}
                        <g transform="rotate(240)">
                          <path d="M 0 0 C -4 -15, -6 -35, 0 -45 C 6 -35, 4 -15, 0 0 Z" fill={isEffectiveConnected ? "#0284c7" : "#475569"} opacity={isEffectiveConnected ? 0.9 : 0.4} />
                        </g>
                        {/* Center Hub */}
                        <circle cx="0" cy="0" r="6" fill="#f8fafc" stroke={isEffectiveConnected ? "#0284c7" : "#64748b"} strokeWidth="2" />
                      </g>
                    </svg>

                    {/* Ambient Wind Flow Lines (Active only when connected) */}
                    {isEffectiveConnected && (effectiveRpm ?? 0) > 0 && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-around opacity-30">
                        <span className="w-8 h-0.5 bg-cyan-400 rounded-full animate-pulse" />
                        <span className="w-12 h-0.5 bg-cyan-300 rounded-full animate-pulse delay-100" />
                        <span className="w-6 h-0.5 bg-cyan-500 rounded-full animate-pulse delay-200" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Kinetic Electricity Generated:</span>
                    <strong className={isEffectiveConnected && effectiveWindmillPower !== null ? "text-cyan-400" : "text-zinc-500"}>
                      {isEffectiveConnected && effectiveWindmillPower !== null ? `${effectiveWindmillPower} Watts` : 'Offline'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Air Pressure (Barometer):</span>
                    <strong className={isEffectiveConnected && effectiveAirPressure !== null ? "text-sky-400" : "text-zinc-500"}>
                      {isEffectiveConnected && effectiveAirPressure !== null ? `${effectiveAirPressure} hPa` : 'Offline'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tip Speed Ratio (TSR λ):</span>
                    <span className="text-emerald-400 font-bold">{tipSpeedRatio} (Optimal: 4.0 - 7.0)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aerodynamic Torque (Q):</span>
                    <span className="text-amber-400 font-bold">{counterTorqueNm} N·m</span>
                  </div>
                </div>
              </div>

              {/* Visual 2: Peltier Thermoelectric Module Cross-Section */}
              <div className="p-5 rounded-2xl bg-black border border-zinc-800 space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className={`w-4 h-4 ${isEffectiveConnected ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="font-bold text-white text-sm">Peltier-Seebeck Thermoelectric Physics</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isEffectiveConnected ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {isEffectiveConnected && deltaT !== null ? `ΔT = +${deltaT}°C` : 'Thermal Loop: Offline'}
                  </span>
                </div>

                {/* Cross-section Graphic */}
                <div className="space-y-3 py-2 font-mono text-xs">
                  
                  {/* Cold Side (Environment) */}
                  <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-indigo-400" />
                      <span>Cool Side: Ambient Environment Air</span>
                    </div>
                    <strong className="text-white text-sm">
                      {isEffectiveConnected && effectiveEnvTemp !== null ? `${effectiveEnvTemp}°C` : 'Offline'}
                    </strong>
                  </div>

                  {/* Semiconductor Junction Pellets */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/40 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-300 font-bold">
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">P-Type Bi₂Te₃</span>
                      <span>⇄</span>
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">N-Type Bi₂Te₃</span>
                    </div>
                    <div className="text-[11px] text-amber-300 font-mono">
                      Seebeck Coefficient: α ≈ 200 µV/K • Direct Thermoelectric Current Flow
                    </div>
                    <div className="flex items-center justify-center gap-3 text-xs pt-1">
                      <span className="text-amber-400 font-black text-sm">
                        {isEffectiveConnected && effectivePeltierCurrent !== null ? `${effectivePeltierCurrent} Amperes` : '0.00 A'}
                      </span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-amber-300 font-bold">
                        {isEffectiveConnected && effectivePeltierVoltage !== null ? `${effectivePeltierVoltage} Volts` : '0.0 V'}
                      </span>
                    </div>
                  </div>

                  {/* Hot Side (Sand Thermal Bed) */}
                  <div className="p-3 rounded-xl bg-orange-950/60 border border-orange-500/40 text-orange-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span>Hot Side: High-Capacity Sand Bed Thermal Storage</span>
                    </div>
                    <strong className="text-white text-sm">
                      {isEffectiveConnected && effectiveSandTemp !== null ? `${effectiveSandTemp}°C` : 'Offline'}
                    </strong>
                  </div>

                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed font-sans">
                  The Seebeck effect converts the thermal gradient between hot concentrated sand and ambient cool air directly into electricity without mechanical wear.
                </div>
              </div>

            </div>

            {/* Visual 3: Wind Turbine Aerodynamic Power Curve & Betz Limit */}
            <div className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm font-mono">Turbine Power Curve & Betz Limit Law</h3>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">
                    Wind Speed (m/s) vs. Output Power (Watts) comparing Betz theoretical limit (Cp = 59.3%) against actual generator output.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
                    Betz Theoretical Max
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                    Actual Turbine Power
                  </span>
                </div>
              </div>

              {/* Interactive Power Curve SVG Chart */}
              <div className="bg-black/90 p-4 rounded-2xl border border-zinc-900 relative">
                <svg viewBox="0 0 600 240" className="w-full h-56">
                  {/* Grid Lines */}
                  {[0, 1, 2, 3, 4].map((gridIdx) => {
                    const y = 200 - gridIdx * 45;
                    return (
                      <g key={gridIdx}>
                        <line x1="50" y1={y} x2="570" y2={y} stroke="#27272a" strokeDasharray="3 3" />
                        <text x="40" y={y + 4} fill="#71717a" fontSize="10" textAnchor="end" fontFamily="monospace">
                          {gridIdx * 25}W
                        </text>
                      </g>
                    );
                  })}

                  {/* X Axis Wind Speed Labels */}
                  {[0, 2, 4, 6, 8, 10, 12, 14, 16].map((spd) => {
                    const x = 50 + (spd / 16) * 520;
                    return (
                      <g key={spd}>
                        <line x1={x} y1="20" x2={x} y2="200" stroke="#18181b" />
                        <text x={x} y="216" fill="#71717a" fontSize="10" textAnchor="middle" fontFamily="monospace">
                          {spd}m/s
                        </text>
                      </g>
                    );
                  })}

                  {/* Cut-in Speed Marker (2.5 m/s) */}
                  <line x1={50 + (2.5 / 16) * 520} y1="20" x2={50 + (2.5 / 16) * 520} y2="200" stroke="#eab308" strokeDasharray="4 2" />
                  <text x={50 + (2.5 / 16) * 520} y="15" fill="#eab308" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                    Cut-in (2.5 m/s)
                  </text>

                  {/* Rated Speed Marker (11.0 m/s) */}
                  <line x1={50 + (11.0 / 16) * 520} y1="20" x2={50 + (11.0 / 16) * 520} y2="200" stroke="#10b981" strokeDasharray="4 2" />
                  <text x={50 + (11.0 / 16) * 520} y="15" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                    Rated (11 m/s)
                  </text>

                  {/* Furling / Cut-out Marker (15.0 m/s) */}
                  <line x1={50 + (15.0 / 16) * 520} y1="20" x2={50 + (15.0 / 16) * 520} y2="200" stroke="#ef4444" strokeDasharray="4 2" />
                  <text x={50 + (15.0 / 16) * 520} y="15" fill="#ef4444" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                    Cut-out
                  </text>

                  {/* Curve 1: Betz Limit Theoretical (Cyan dashed) */}
                  <path
                    d={`M 50 200 C 130 198, 220 185, 320 150 C 400 110, 480 50, 570 25`}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />

                  {/* Curve 2: Actual Turbine Power Curve (Emerald solid) */}
                  <path
                    d={`M 50 200 L 131 200 C 180 195, 260 170, 360 120 C 410 85, 430 75, 470 75 L 537 75 L 538 200`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />

                  {/* Live Operating Point Marker (If hardware connected or test mode active) */}
                  {isEffectiveConnected && windSpeedNum > 0 && (
                    <g>
                      {(() => {
                        const markerX = Math.min(570, Math.max(50, 50 + (windSpeedNum / 16) * 520));
                        const curWatts = effectiveWindmillPower ?? 0;
                        const markerY = Math.min(200, Math.max(20, 200 - (curWatts / 100) * 180));
                        return (
                          <>
                            <line x1={markerX} y1="20" x2={markerX} y2="200" stroke="#34d399" strokeWidth="1.5" strokeDasharray="2 2" />
                            <circle cx={markerX} cy={markerY} r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" className="animate-pulse" />
                            <text x={markerX + 10} y={markerY - 8} fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                              LIVE: {curWatts}W @ {windSpeedNum} m/s
                            </text>
                          </>
                        );
                      })()}
                    </g>
                  )}
                </svg>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono text-zinc-400 border-t border-zinc-900 mt-2">
                  <div>Swept Area: <strong className="text-white">{sweptArea} m²</strong> (D = {rotorDiameterM}m)</div>
                  <div>Power Coeff (Cp): <strong className="text-emerald-400">{aerodynamicCpPercent}%</strong></div>
                  <div>Betz Theoretical: <strong className="text-cyan-400">{betzMaxWatts} W</strong></div>
                  <div>Live Generation: <strong className="text-white">{effectiveWindmillPower ?? 0} W</strong></div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 4: Wiring Pinouts for Windmill and Peltier Subsystems */}
        {activeTab === 'wiring' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                ESP32 Hardware Pin Allocation Matrix (Aero-Windmill & Thermoelectric Lab)
              </span>
              <span className="text-[10px] text-zinc-400">Microcontroller: 3.3V Logic Level</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Wiring Group 1: Windmill Station */}
              <div className="p-4 rounded-2xl bg-black border border-zinc-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <RotateCw className="w-4 h-4" />
                    Wind Turbine Subsystem Wiring
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">Turbine</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex justify-between">
                    <div>
                      <div className="text-white font-bold">Hall Effect Tachometer (A3144)</div>
                      <div className="text-zinc-500">VCC → 3.3V / GND → GND / OUT → GPIO 34</div>
                    </div>
                    <span className="text-emerald-400 font-bold self-center">GPIO 34 (ISR)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex justify-between">
                    <div>
                      <div className="text-white font-bold">INA219 Current Sensor (Addr 0x41)</div>
                      <div className="text-zinc-500">SDA → GPIO 21 / SCL → GPIO 22 (A0 bridged)</div>
                    </div>
                    <span className="text-cyan-400 font-bold self-center">I2C (0x41)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex justify-between">
                    <div>
                      <div className="text-white font-bold">BMP280 Barometer Sensor (Addr 0x76)</div>
                      <div className="text-zinc-500">SDA → GPIO 21 / SCL → GPIO 22</div>
                    </div>
                    <span className="text-sky-400 font-bold self-center">I2C (0x76)</span>
                  </div>
                </div>
              </div>

              {/* Wiring Group 2: Peltier Seebeck Station */}
              <div className="p-4 rounded-2xl bg-black border border-zinc-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4" />
                    Peltier Thermoelectric Subsystem Wiring
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">Seebeck</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex justify-between">
                    <div>
                      <div className="text-white font-bold">DS18B20 Sand Bed Temperature Probe</div>
                      <div className="text-zinc-500">VCC → 3.3V / DQ → GPIO 4 (4.7kΩ pullup) / GND</div>
                    </div>
                    <span className="text-orange-400 font-bold self-center">GPIO 4 (1-Wire)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex justify-between">
                    <div>
                      <div className="text-white font-bold">Peltier Element (Bi₂Te₃ TEC-12706)</div>
                      <div className="text-zinc-500">V+ → INA219 Vin+ / V- → Load/Ground shunt</div>
                    </div>
                    <span className="text-amber-400 font-bold self-center">DC Harvest</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex justify-between">
                    <div>
                      <div className="text-white font-bold">Ambient Environment Reference</div>
                      <div className="text-zinc-500">Internal temperature register of BMP280</div>
                    </div>
                    <span className="text-indigo-400 font-bold self-center">I2C Register</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Interactive Calibration & Test Bench Modal */}
      {showCalibrationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl font-mono text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Windmill Hardware Calibration & Test Bench</h3>
              </div>
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Pulses Per Revolution */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-bold flex justify-between">
                  <span>Rotor Pulses Per Revolution (PPR):</span>
                  <span className="text-cyan-400 font-bold">{pulsesPerRev} magnet(s)</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={pulsesPerRev}
                  onChange={(e) => setPulsesPerRev(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500">Number of rare-earth magnets installed on the rotating shaft hub.</p>
              </div>

              {/* Rotor Blade Diameter */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-bold flex justify-between">
                  <span>Rotor Diameter:</span>
                  <span className="text-emerald-400 font-bold">{rotorDiameterM} meters</span>
                </label>
                <input
                  type="range"
                  min="0.30"
                  max="2.00"
                  step="0.05"
                  value={rotorDiameterM}
                  onChange={(e) => setRotorDiameterM(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500">Swept circle diameter for aerodynamic Betz flux calculations.</p>
              </div>

            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Telemetry Stream Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-zinc-300">
          <span className="font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Live Telemetry Ingestion History (Time Series)
          </span>
          <span className="text-[10px] text-zinc-500">{isStationConnected ? 'Every 2.5s' : 'Awaiting Connection'}</span>
        </div>

        {historyPoints.length > 0 ? (
          <div className="overflow-x-auto w-full max-w-full scrollbar-none">
            <table className="w-full min-w-[550px] text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-[11px]">
                  <th className="py-2 px-2">Time</th>
                  <th className="py-2 px-2">Windmill RPM</th>
                  <th className="py-2 px-2">Windmill Watts</th>
                  <th className="py-2 px-2">Peltier Current</th>
                  <th className="py-2 px-2">Sand Temp</th>
                  <th className="py-2 px-2">Env Temp</th>
                  <th className="py-2 px-2">Pressure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {historyPoints.slice().reverse().map((pt, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/40 transition">
                    <td className="py-1.5 px-2 text-zinc-400">{pt.time}</td>
                    <td className="py-1.5 px-2 text-emerald-400 font-bold">{pt.rpm} RPM</td>
                    <td className="py-1.5 px-2 text-cyan-400 font-bold">{pt.watts} W</td>
                    <td className="py-1.5 px-2 text-amber-400 font-bold">{pt.peltierAmps} A</td>
                    <td className="py-1.5 px-2 text-orange-400 font-bold">{pt.sandTemp}°C</td>
                    <td className="py-1.5 px-2 text-indigo-400">{pt.envTemp}°C</td>
                    <td className="py-1.5 px-2 text-sky-400">{pt.pressure} hPa</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-black border border-zinc-900 text-center space-y-2">
            <div className="text-zinc-500 font-mono text-xs">
              {isStationConnected 
                ? 'Listening for incoming sensor telemetry packets from ESP32...'
                : 'Station Disconnected: No live telemetry stream detected. Connect the ESP32 microcontroller to start streaming real data.'}
            </div>
            <div className="text-[11px] text-zinc-600 font-mono">
              Target Cloud Collection: <code className="text-cyan-400 font-bold">solar_iot/node_01</code> or <code className="text-cyan-400 font-bold">solar_iot/windmill_peltier</code>
            </div>
          </div>
        )}
      </div>

      {/* Hardware Calibration & ESP32 Pinout Guide */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-xs font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Microcontroller Wire Connections & Calibration</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
            ESP32 WROOM-32
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-2">
            <span className="text-emerald-400 font-bold block">1. Windmill RPM & Power</span>
            <ul className="space-y-1 text-zinc-400 text-[11px]">
              <li>• Hall Effect Sensor: <strong>GPIO 34 (Interrupt)</strong></li>
              <li>• INA219 Power Shunt: <strong>SDA (GPIO 21), SCL (GPIO 22)</strong></li>
              <li>• 3-Phase Diode Bridge Rectifier to 12V Battery</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-2">
            <span className="text-amber-400 font-bold block">2. Peltier Thermoelectric Loop</span>
            <ul className="space-y-1 text-zinc-400 text-[11px]">
              <li>• Current Shunt Sensor: <strong>INA219 #2 (I2C 0x41)</strong></li>
              <li>• Sand Temp: <strong>DS18B20 OneWire (GPIO 4)</strong></li>
              <li>• Peltier Junction Temp: <strong>NTC / Thermocouple (GPIO 35)</strong></li>
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-2">
            <span className="text-sky-400 font-bold block">3. Air Pressure & Environment</span>
            <ul className="space-y-1 text-zinc-400 text-[11px]">
              <li>• Barometer: <strong>BMP280 / BME280 (I2C 0x76)</strong></li>
              <li>• Ambient Air Temp: <strong>BMP280 internal temperature</strong></li>
              <li>• Pressure Range: <strong>300 hPa – 1100 hPa</strong></li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};
