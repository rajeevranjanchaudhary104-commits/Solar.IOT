import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Battery, 
  Thermometer, 
  Droplets, 
  Zap, 
  Activity, 
  Wifi, 
  WifiOff, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  Play, 
  Sparkles, 
  CloudRain, 
  Crown, 
  TrendingUp, 
  Layers, 
  ShieldCheck, 
  FileText,
  Gauge,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Square,
  Edit3
} from 'lucide-react';
import { SolarData, CleaningLog, TelemetryPoint } from '../types/solar';
import { CircularGauge } from './CircularGauge';
import { SolarTelemetryChart } from './SolarTelemetryChart';
import { ChangeCleanTimeModal } from './ChangeCleanTimeModal';
import confetti from 'canvas-confetti';

interface LiveDashboardProps {
  solarData: SolarData;
  telemetryHistory: TelemetryPoint[];
  onTriggerClean: () => Promise<void>;
  onStopClean: () => Promise<void>;
  cleaningLogs: CleaningLog[];
  isCleaning: boolean;
  isOwner?: boolean;
  onRequireSignIn?: () => void;
  onUpdateScheduledCleanTime?: (newTime: string) => Promise<void>;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  solarData,
  telemetryHistory,
  onTriggerClean,
  onStopClean,
  cleaningLogs,
  isCleaning,
  isOwner = false,
  onRequireSignIn,
  onUpdateScheduledCleanTime,
}) => {
  const [cleaningCountdown, setCleaningCountdown] = useState<number | null>(null);
  const [showWhyWiper, setShowWhyWiper] = useState<boolean>(true);
  const [showChangeCleanTimeModal, setShowChangeCleanTimeModal] = useState<boolean>(false);

  // Calculate connection status and dynamic elapsed duration
  const getDisconnectionStatus = () => {
    if (solarData.espConnected && solarData.voltage !== null && solarData.voltage > 0 && solarData.updatedAt) {
      const ageMs = Date.now() - new Date(solarData.updatedAt).getTime();
      // If telemetry arrived within last 3 minutes, it is actively live
      if (ageMs < 3 * 60 * 1000) {
        return { isConnected: true, label: 'ONLINE', detail: 'Real-time telemetry streaming' };
      }
      const hours = Math.floor(ageMs / (1000 * 60 * 60));
      const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
      if (hours >= 1) {
        return { 
          isConnected: false, 
          label: `Not connected last ${hours} hour${hours > 1 ? 's' : ''}`, 
          detail: `Last heartbeat: ${new Date(solarData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
        };
      }
      return { 
        isConnected: false, 
        label: `Not connected last ${Math.max(1, minutes)} min`, 
        detail: `Last heartbeat: ${new Date(solarData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
      };
    }

    // Default status when offline or no current session: exactly "Not connected last 1 hour"
    return { 
      isConnected: false, 
      label: 'Not connected last 1 hour', 
      detail: 'No active ESP32 heartbeat detected in Firebase' 
    };
  };

  const connectionStatus = getDisconnectionStatus();
  const isHardwareConnected = connectionStatus.isConnected;
  const isHighTemp = solarData.temperature !== null && solarData.temperature > 45;
  const currentWatt = (solarData.voltage !== null && solarData.current !== null)
    ? parseFloat((solarData.voltage * solarData.current).toFixed(1))
    : null;
  const wattPercentOfPeak = (currentWatt !== null && solarData.highestWattToday && solarData.highestWattToday > 0)
    ? Math.min(100, Math.round((currentWatt / solarData.highestWattToday) * 100))
    : 0;

  const scheduledCleanTime = solarData.scheduledCleanTime || '03:00 AM';

  const handleStartClean = async () => {
    if (isCleaning) return;
    try {
      await onTriggerClean();
      setCleaningCountdown(10);
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
      
      {/* Hardware Disconnected / Offline Banner - Displays exact connection duration */}
      {!isHardwareConnected && (
        <div className="p-4 rounded-2xl bg-slate-900/95 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                <span>ESP32 Hardware Disconnected</span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  {connectionStatus.label}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  Sensors: N/A
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Your physical ESP32 has not connected to Firebase. Live sensor tachometers show <strong>N/A</strong> until hardware streams. Historical data and settings are preserved in Cloud Firestore.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-xs font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/20">
            <span>Auto-Sync Active</span>
          </div>
        </div>
      )}

      {/* Thermal Shock Safety Notice - Explaining why water spray is dangerous on solar panels */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white">Solar Panel Safety Standard: </span>
            <span className="text-slate-400">
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

      {/* Top Engineering Metrics Bar: Highest Watt, Rain, Cleaning Schedule, and Energy */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Highest Watt Today */}
        <div className="bg-slate-900/90 border border-amber-500/25 rounded-2xl p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono flex items-center gap-1.5 text-amber-400 font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Highest Watt
            </span>
            <span className="text-[10px] font-mono bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20 font-bold">
              PEAK
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isHardwareConnected && solarData.highestWattToday !== null && solarData.highestWattToday !== 145.4 ? solarData.highestWattToday.toFixed(1) : 'NA'}</span>
              <span className="text-amber-400 font-bold text-xs">{isHardwareConnected && solarData.highestWattToday !== null && solarData.highestWattToday !== 145.4 ? 'Watts' : ''}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>{isHardwareConnected && solarData.highestWattTime ? `At ${solarData.highestWattTime}` : 'Awaiting Peak'}</span>
              <span className="text-slate-500 font-medium truncate ml-1">
                {isHardwareConnected ? 'Hardware Live' : connectionStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Last Time Rain */}
        <div className="bg-slate-900/90 border border-sky-500/25 rounded-2xl p-3 sm:p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/50 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono flex items-center gap-1.5 text-sky-400 font-semibold truncate">
              <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              Last Rain
            </span>
            <span className="text-[10px] font-mono bg-sky-400/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-400/20 font-bold shrink-0">
              FC-37
            </span>
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-white truncate">
              {isHardwareConnected && solarData.lastRainTime ? solarData.lastRainTime : 'NA'}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>{isHardwareConnected && solarData.isRaining !== null ? (solarData.isRaining ? 'Raining' : 'Dry') : 'Sensor: NA'}</span>
              <span className="text-sky-300 font-medium">
                {isHardwareConnected && solarData.rainIntensityMm !== null ? `${solarData.rainIntensityMm} mm` : 'NA'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Automated Clean Schedule (Changeable by owner in Firebase) */}
        <div className="bg-slate-900/90 border border-cyan-500/25 rounded-2xl p-3 sm:p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/50 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono flex items-center gap-1.5 text-cyan-400 font-semibold truncate">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              Clean Schedule
            </span>
            <span className="text-[10px] font-mono bg-cyan-400/10 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-400/20 font-bold shrink-0">
              {scheduledCleanTime}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-white truncate">
              {scheduledCleanTime} Daily
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>Auto Sweep</span>
              <button
                type="button"
                onClick={() => setShowChangeCleanTimeModal(true)}
                className="text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1 cursor-pointer transition"
                title="Change scheduled cleaning time in Firebase"
              >
                <Edit3 className="w-3 h-3" />
                <span>Change Time</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metric 4: Daily Energy Output */}
        <div className="bg-slate-900/90 border border-emerald-500/25 rounded-2xl p-3 sm:p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono flex items-center gap-1.5 text-emerald-400 font-semibold truncate">
              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Energy Yield
            </span>
            <span className="text-[10px] font-mono bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-400/20 font-bold shrink-0">
              WH
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{isHardwareConnected && solarData.dailyEnergyWh != null ? solarData.dailyEnergyWh.toFixed(1) : 'NA'}</span>
              <span className="text-emerald-400 font-bold text-xs">{isHardwareConnected && solarData.dailyEnergyWh != null ? 'Wh' : ''}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>Today: {isHardwareConnected && solarData.efficiency != null ? `${solarData.efficiency}%` : 'NA'}</span>
              <span className="text-emerald-400 font-medium">
                {isHardwareConnected ? 'INA219' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Telemetry Cluster: Dedicated Circular Gauges */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-cyan-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
              Live Sensor Tachometers
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Node Refresh: <span className="text-emerald-400 font-semibold">3.0s</span> ({isHardwareConnected ? 'Streaming' : connectionStatus.label})
          </span>
        </div>

        {/* 5-Gauge Grid: Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">

          {/* 1. Panel Voltage (INA219) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-sky-500/30 transition">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-sky-400" />
                Panel Voltage
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
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

            <div className="pt-2 border-t border-slate-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>INA219 I2C Bus</span>
              <span className="text-sky-400 font-semibold">{isHardwareConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* 2. Panel Current (INA219) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/30 transition">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Panel Current
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
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

            <div className="pt-2 border-t border-slate-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Load Amperage</span>
              <span className="text-emerald-400 font-semibold">{isHardwareConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* 3. Real-Time Solar Power Watt Gauge */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-amber-500/50 transition">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Solar Power
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
                label="Instant Watt"
                sublabel="P = V × I"
                gradientId="gradPowerWatt"
                gradientFrom="#fbbf24"
                gradientTo="#d97706"
                precision={1}
                isOffline={!isHardwareConnected}
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80 px-2 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Peak Ratio</span>
              <span className="text-amber-400 font-bold font-mono">
                {isHardwareConnected && currentWatt !== null ? `${wattPercentOfPeak}% Peak` : 'Offline'}
              </span>
            </div>
          </div>

          {/* 4. Battery State of Charge */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-purple-500/30 transition">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Battery className="w-3.5 h-3.5 text-purple-400" />
                Battery SoC
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
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

            <div className="pt-2 border-t border-slate-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Deep Cycle</span>
              <span className="text-purple-400 font-semibold">{isHardwareConnected ? 'Float Charge' : 'Offline'}</span>
            </div>
          </div>

          {/* 5. LM35 Surface Temperature */}
          <div className={`bg-slate-900/90 border rounded-2xl p-3 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between transition ${
            isHighTemp ? 'border-red-500/50' : 'border-slate-800 hover:border-orange-500/30'
          }`}>
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Thermometer className={`w-3.5 h-3.5 ${isHighTemp ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
                Panel Temp
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isHighTemp 
                  ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
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
                label="Temperature"
                sublabel="Thermal LM35"
                gradientId="gradTemp"
                gradientFrom={isHighTemp ? '#ef4444' : '#fb923c'}
                gradientTo={isHighTemp ? '#b91c1c' : '#ea580c'}
                precision={1}
                isOffline={!isHardwareConnected}
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80 px-2 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Analog Scale</span>
              <span className="text-slate-300 font-medium">
                {isHardwareConnected ? '10mV / °C' : 'Offline'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Interactive 24-Hour Telemetry & Generation Curve Chart (Real data from Firebase) */}
      <SolarTelemetryChart
        data={telemetryHistory}
        highestWatt={isHardwareConnected && solarData.highestWattToday !== 145.4 ? solarData.highestWattToday : null}
        highestWattTime={solarData.highestWattTime}
        lastRainTime={solarData.lastRainTime}
        isOffline={!isHardwareConnected}
        disconnectionDurationText={connectionStatus.label}
      />

      {/* Cleaning System & Mechanical Hardware Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Cleaning System Control & Status */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Automated Motorized Wiper System
                    {isCleaning && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono animate-pulse border border-cyan-500/40">
                        Wiping Active...
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Motorized silicone squeegee wiper (GPIO 27) — safe dry sweep without damaging water spray
                  </p>
                </div>
              </div>

              {/* Simple Single Button to Clean Solar Panel */}
              <div className="relative flex items-center gap-2">
                {isCleaning ? (
                  <button
                    onClick={async () => {
                      setCleaningCountdown(null);
                      await onStopClean();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 animate-pulse"
                    title="Stop motorized wiper immediately"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop Cleaning ({cleaningCountdown ?? 10}s)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartClean}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer select-none active:scale-95 group"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
                    <span>Clean Solar Panel</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sweep Progress & Phase Indicator (Visible while cleaning) */}
            {isCleaning && cleaningCountdown !== null && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    {cleaningCountdown > 5 
                      ? 'Phase 1/2: Sweeping across solar glass (0° → 180°)' 
                      : 'Phase 2/2: Wiper returning to home dock (180° → 0°)'}
                  </span>
                  <span className="text-amber-400 font-bold">
                    {Math.round(((10 - cleaningCountdown) / 10) * 100)}%
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${((10 - cleaningCountdown) / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Why Triggers Are Shown & How It Works Explainer Box */}
            <div className="mt-3 rounded-xl bg-slate-950/70 border border-slate-800/90 overflow-hidden transition-all text-xs">
              <button
                onClick={() => setShowWhyWiper(!showWhyWiper)}
                className="w-full p-2.5 px-3 flex items-center justify-between text-slate-300 hover:text-white transition cursor-pointer text-left font-mono"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  Why is the Wiper Trigger Shown & How It Works
                </span>
                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                  {showWhyWiper ? 'Hide Details' : 'Show Details'}
                  {showWhyWiper ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {showWhyWiper && (
                <div className="px-3.5 pb-3 text-slate-400 space-y-2 border-t border-slate-800/60 pt-2 leading-relaxed">
                  <p>
                    <strong className="text-white">Why Trigger Exists: </strong> 
                    Solar panels constantly gather airborne dust, grime, and environmental soot. This cuts light transmission by up to 25%. Spraying water onto hot glass causes dangerous <strong>thermal shock fractures</strong>, so this station uses a <strong>motorized silicone squeegee</strong> (GPIO 27).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold block mb-0.5">1. Automatic Triggers</span>
                      The ESP32 firmware triggers the squeegee motor automatically when dust attenuation is calculated or on the scheduled timer ({scheduledCleanTime}).
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-amber-400 font-bold block mb-0.5">2. Fingertip Remote Trigger</span>
                      Tapping <strong>Clean Solar Panel</strong> manually executes a full sweep cycle anytime from the cloud.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hardware Actuator Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {/* Automated Clean Schedule Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Clean Schedule
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowChangeCleanTimeModal(true)}
                    className="text-cyan-400 hover:text-cyan-300 text-[10px] font-mono flex items-center gap-0.5 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1 truncate">
                  {scheduledCleanTime} DAILY
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Automated nocturnal dust sweep
                </div>
              </div>

              {/* Thermal Shock Safety Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Water Spray Lock
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                  DISABLED (SAFE)
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Prevents glass thermal shock
                </div>
              </div>

              {/* Wiper Motor */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="font-mono flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Wiper Arm (GPIO 27)
                  </span>
                  <span className={`w-2 h-2 rounded-full ${solarData.wiperActive || isCleaning ? 'bg-amber-400 animate-ping' : 'bg-slate-700'}`} />
                </div>
                <div className="text-base font-bold font-mono text-white mt-1">
                  {solarData.wiperActive || isCleaning ? (
                    <span className="text-amber-400 font-bold">SWEEPING GLASS</span>
                  ) : (
                    <span className="text-slate-400">DOCKED HOME</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Silicone double-blade squeegee
                </div>
              </div>
            </div>
          </div>

          {/* Efficiency Gain Banner */}
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">Device ID:</span>
                <span className="text-cyan-400 font-semibold">node_01 (ESP-01 / ESP32)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">Connection State:</span>
                <span className={isHardwareConnected ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                  {isHardwareConnected ? 'Connected & Active' : connectionStatus.label}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">Wi-Fi RSSI:</span>
                <span className="text-white font-semibold">{isHardwareConnected ? `${solarData.rssi || -58} dBm (Strong)` : 'N/A (Offline)'}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">Rain Sensor (FC-37):</span>
                <span className={solarData.isRaining ? 'text-sky-400 font-bold' : 'text-slate-300'}>
                  {solarData.isRaining ? 'Rain Active' : 'Dry / Clear'}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">Highest Watt (Today):</span>
                <span className="text-amber-400 font-bold">
                  {solarData.highestWattToday !== null && solarData.highestWattToday !== 145.4 ? `${solarData.highestWattToday.toFixed(1)} W` : 'NA'}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Clean Schedule Summary */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              Automated Cleaning: {scheduledCleanTime} Scheduled
            </span>
            <span className="text-slate-500">Physical Actuator: GPIO 27</span>
          </div>
        </div>

      </div>

      {/* Station Field Notes & Hardware Diagnostics */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Station Field Notes & Hardware Diagnostics</h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            System Nominal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Thermal Shock Protection Standard
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Spraying cold water directly onto hot solar panels under sunlight causes severe <strong className="text-white">thermal shock</strong>, fracturing glass and degrading cell junctions. Cleaning is executed safely using the dry silicone wiper squeegee.
            </p>
          </div>

          <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              Rain Precipitation Washing
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              When the gold-plated FC-37 sensor detects rainwater, the controller activates an ambient wash routine, locking out pumps and allowing natural precipitation to rinse the panel before mechanical squeegee wiping.
            </p>
          </div>

          <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Scheduled Nocturnal Cleaning ({scheduledCleanTime})
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Daily cleaning is scheduled for <strong className="text-white">{scheduledCleanTime}</strong> when panel temperature is lowest. You can adjust this time anytime using the owner account; changes sync instantly over Firebase.
            </p>
          </div>
        </div>
      </div>

      {/* Cleaning History Logs Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Recent Hardware Cleaning Logs</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Firestore Collection: <code className="text-cyan-400">cleaning_logs</code>
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 font-medium">Log Time</th>
                <th className="pb-2 font-medium">Trigger Type</th>
                <th className="pb-2 font-medium">Duration</th>
                <th className="pb-2 font-medium">Water Used</th>
                <th className="pb-2 font-medium">Efficiency Gain</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {cleaningLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-500 font-mono">
                    No cleaning cycles recorded today yet. Trigger "Clean Solar Panel" above to record the first sweep.
                  </td>
                </tr>
              ) : (
                cleaningLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 text-white">{log.timestamp}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-cyan-400 font-semibold">
                        {log.triggerType === 'manual' ? 'Remote Trigger' : 'Scheduled Sweep'}
                      </span>
                    </td>
                    <td className="py-2.5">{log.durationSeconds}s</td>
                    <td className="py-2.5 text-slate-400">{log.waterUsedMl} mL (Dry Wipe)</td>
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
