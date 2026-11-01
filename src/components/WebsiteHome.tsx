import React from 'react';
import { 
  Sun, 
  Zap, 
  Droplets, 
  CloudRain, 
  Cpu, 
  ShieldCheck, 
  ArrowRight, 
  TrendingUp, 
  Sparkles, 
  Layers, 
  Gauge, 
  Activity,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Flame,
  Award,
  Hand,
  WifiOff,
  AlertTriangle,
  Smartphone,
  Database,
  ShoppingBag,
  MessageSquare,
  Newspaper,
  Wind,
  Thermometer,
  RotateCw,
  ArrowDownToLine,
  FileCode,
  ShieldAlert,
  Users,
  Camera
} from 'lucide-react';
import { SolarData } from '../types/solar';

interface WebsiteHomeProps {
  solarData: SolarData;
  onNavigate: (tab: 'dashboard' | 'security' | 'workers' | 'calculators' | 'esp32' | 'research' | 'about' | 'reviews' | 'store' | 'weather' | 'updates' | 'windmill_peltier' | 'model3d') => void;
  onTriggerClean: () => void;
  isCleaning: boolean;
  user?: any;
  onRequireSignIn?: () => void;
}

export const WebsiteHome: React.FC<WebsiteHomeProps> = ({
  solarData,
  onNavigate,
  onTriggerClean,
  isCleaning,
  user,
  onRequireSignIn
}) => {
  const isLive = Boolean(solarData.espConnected && solarData.voltage !== null && solarData.voltage > 0);
  const currentWatt = isLive && solarData.voltage !== null && solarData.current !== null
    ? (solarData.voltage * solarData.current).toFixed(1)
    : 'NA';
  const peakWatt = isLive && solarData.highestWattToday !== null && solarData.highestWattToday !== 145.4
    ? solarData.highestWattToday.toFixed(1)
    : 'NA';

  return (
    <div className="space-y-12 pb-8">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-10 lg:p-14 shadow-2xl backdrop-blur-xl">
        {/* Glow ambient lights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 border border-cyan-500/30 text-xs font-mono font-medium shadow-inner">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${solarData.espConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${solarData.espConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="text-white font-semibold">Farm.IOT Enterprise</span>
            <span className="text-zinc-600">•</span>
            <span className={solarData.espConnected ? "text-emerald-300" : "text-amber-300"}>
              {solarData.espConnected 
                ? 'ESP32 Microgrid & 24/7 Security Live' 
                : 'ESP32 Disconnected (Field Standby)'}
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-tight lg:leading-tight">
            Smart Power Management &{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
              Security
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Autonomous agro-industrial microgrid telemetry & perimeter defense. High-precision bus tracking via <strong>INA219</strong>, hybrid renewable harvesting (Solar, Wind & Peltier), and 24/7 vision surveillance with <strong>ESP32-CAM</strong> motion alerts & active alarm deterrents.
          </p>

          {/* Core Feature Matrix: Smart Power vs 24/7 Security */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2">
            
            {/* Card 1: Smart Power Management */}
            <div 
              onClick={() => onNavigate('dashboard')}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-cyan-950/30 border border-emerald-500/30 hover:border-emerald-400/60 transition-all cursor-pointer group shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Microgrid Telemetry
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Smart Power Management
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  INA219 Active
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-3 font-sans leading-relaxed">
                Real-time bus voltage & current measurement, battery state optimization, dual-pass silicone squeegee wiper sweeps, and aero-kinetic windmill harvesting.
              </p>
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Bus Telemetry
                </span>
                <span className="flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                  Open Power Hub <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Card 2: 24/7 Security & Surveillance */}
            <div 
              onClick={() => onNavigate('security')}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-950/30 via-zinc-900 to-red-950/30 border border-rose-500/30 hover:border-rose-400/60 transition-all cursor-pointer group shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 group-hover:scale-105 transition-transform">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                      Perimeter Defense
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                      ESP32-CAM AI Security &amp; Camera Feed
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  ESP32-CAM Guard
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-3 font-sans leading-relaxed">
                Optical video surveillance stream, PIR motion intrusion trigger, hardware active siren buzzer on GPIO 12, and automated Firebase incident photo logging.
              </p>
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-rose-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  Surveillance Standby
                </span>
                <span className="flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                  Open ESP32-CAM Center <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

          </div>

          {/* Main Action Navigation Strip */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-cyan-500/25 transition cursor-pointer flex items-center gap-2 group active:scale-95"
              >
                <Zap className="w-4 h-4 text-slate-950" />
                <span>Explore Live Power Telemetry</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate('model3d')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center gap-2 group active:scale-95"
              >
                <Layers className="w-4 h-4 text-black" />
                <span>3D Hardware Model</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/20 text-black font-bold">
                  Three.js
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate('security')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-2 group active:scale-95 ring-2 ring-rose-500/40"
              >
                <Camera className="w-4 h-4 text-white" />
                <span>ESP32-CAM Option</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 text-rose-200">
                  Live Feed
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Quick Ecosystem Hub Links */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
              <button
                onClick={() => onNavigate('model3d')}
                className="px-3.5 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 font-semibold border border-cyan-500/40 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Interactive 3D Rig</span>
              </button>
              <button
                onClick={() => onNavigate('workers')}
                className="px-3.5 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-semibold border border-emerald-500/40 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Workers &amp; RFID Hub</span>
              </button>
              <button
                onClick={() => onNavigate('windmill_peltier')}
                className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-cyan-300 font-semibold border border-cyan-500/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>Windmill & Peltier</span>
              </button>
              <button
                onClick={() => onNavigate('store')}
                className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 font-semibold border border-amber-500/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>Hardware Store</span>
              </button>
              <button
                onClick={() => onNavigate('calculators')}
                className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-slate-200 font-semibold border border-zinc-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Power Sizing Calculators</span>
              </button>
              <button
                onClick={() => onNavigate('esp32')}
                className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-emerald-300 font-mono border border-emerald-500/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Arduino & ESP Sketches</span>
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('weather-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-sky-300 font-semibold border border-sky-500/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Sun className="w-3.5 h-3.5 text-sky-400" />
                <span>Solar Weather & UV</span>
              </button>
              <button
                onClick={() => onNavigate('reviews')}
                className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 font-semibold border border-amber-500/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Reviews</span>
              </button>
              <button
                onClick={() => onNavigate('updates')}
                className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-purple-300 font-semibold border border-purple-500/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Newspaper className="w-3.5 h-3.5 text-purple-400" />
                <span>Updates & Downloads</span>
              </button>
            </div>
          </div>

          {/* Responsive Interactive Station Hardware Showcase */}
          <div className="w-full max-w-full relative sm:aspect-video min-h-0 sm:min-h-[380px] max-h-none sm:max-h-[520px] rounded-2xl bg-zinc-950/90 border border-zinc-800/90 shadow-2xl overflow-hidden flex flex-col justify-between p-3.5 sm:p-6 text-left my-4">
            {/* Top Bar of Station Showcase */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-white tracking-wide">
                  Hybrid Solar, Aero-Kinetic & Thermoelectric Station Schematic
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-cyan-300">
                  16:9 Hardware Viewport
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                <span className="text-zinc-500">I2C Node:</span>
                <span className="text-amber-400 font-bold">INA219 (0x40)</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-500">Telemetry:</span>
                <span className={isLive ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                  {isLive ? 'Synchronized' : 'Standby / Disconnected'}
                </span>
              </div>
            </div>

            {/* Middle Visual Diagram with Aspect-Locked Sub-panels */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 my-auto py-2">
              
              {/* Left Sub-panel: Solar Panel Glass & Wiper Arm */}
              <div className="md:col-span-6 bg-black/70 border border-zinc-800/80 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>PV Solar Array & Squeegee Wiper</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isCleaning 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse font-bold' 
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}>
                    {isCleaning ? 'Wiper Sweeping (GPIO 27)' : 'Silicone Wiper: Parked'}
                  </span>
                </div>

                {/* Simulated Solar Panel Surface with Wiper Track */}
                <div className="relative h-20 sm:h-24 w-full rounded-lg bg-gradient-to-br from-blue-950 via-slate-900 to-black border border-cyan-500/30 overflow-hidden shadow-inner flex items-center">
                  {/* Grid Lines representing photovoltaic cells */}
                  <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-0.5 opacity-30 pointer-events-none">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div key={i} className="border border-cyan-400/40 bg-blue-900/10" />
                    ))}
                  </div>

                  {/* Squeegee Wiper Arm Animation */}
                  <div 
                    className={`absolute top-0 bottom-0 w-2.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded-sm shadow-[0_0_12px_#f59e0b] z-20 transition-all ${
                      isCleaning 
                        ? 'left-[88%] duration-[10000ms] ease-linear' 
                        : 'left-2 duration-500 ease-out'
                    }`}
                  >
                    <div className="absolute -top-1 -left-1 w-4.5 h-3 bg-zinc-900 border border-amber-400 rounded-sm" />
                    <div className="absolute -bottom-1 -left-1 w-4.5 h-3 bg-zinc-900 border border-amber-400 rounded-sm" />
                  </div>

                  {/* Telemetry overlay labels */}
                  <div className="relative z-10 p-2 text-[10px] font-mono space-y-1">
                    <div className="text-cyan-300 font-bold flex items-center gap-1">
                      <span>INA219:</span>
                      <span className="text-white">{isLive ? `${solarData.voltage?.toFixed(2)}V • ${solarData.current?.toFixed(2)}A` : 'N/A'}</span>
                    </div>
                    <div className="text-orange-300 flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      <span>LM35 Surface: {isLive && solarData.temperature !== null ? `${solarData.temperature.toFixed(1)}°C` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Sensor Indicators Footer */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
                  <span>Dry Sweep (No Thermal Shock)</span>
                  <span className="text-sky-400">Rain Board: {solarData.isRaining ? 'Precipitation' : 'Dry'}</span>
                </div>
              </div>

              {/* Right Sub-panel: Aero-Kinetic Windmill & Thermoelectric Peltier Module */}
              <div className="md:col-span-6 bg-black/70 border border-zinc-800/80 rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Wind className="w-4 h-4 text-cyan-400" />
                    <span>Aero-Kinetic Rotor & Peltier Module</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-cyan-400">
                    Seebeck Thermoelectric
                  </span>
                </div>

                {/* Interactive Graphic: Windmill Rotor + Thermal Seebeck Junction */}
                <div className="relative h-20 sm:h-24 w-full rounded-lg bg-zinc-900/60 border border-zinc-800 p-2 flex items-center justify-between">
                  
                  {/* Spinning Windmill Rotor Graphic */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative">
                      <RotateCw className={`w-8 h-8 text-cyan-400 ${
                        solarData.espConnected && (solarData.windmillRpm || 0) > 0
                          ? 'animate-spin' 
                          : 'animate-spin-slow opacity-60'
                      }`} style={{ animationDuration: isLive ? '1.5s' : '8s' }} />
                      <div className="absolute w-2 h-2 rounded-full bg-white shadow-sm" />
                    </div>
                    <div className="text-[10px] font-mono">
                      <div className="text-zinc-400">Wind Rotor</div>
                      <div className="text-cyan-300 font-bold text-xs">
                        {isLive && solarData.windmillRpm ? `${solarData.windmillRpm} RPM` : 'Standby RPM'}
                      </div>
                      <div className="text-zinc-500 text-[9px]">
                        Gen: {isLive && solarData.windmillPower !== undefined && solarData.windmillPower !== null ? `${solarData.windmillPower}W` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Peltier Seebeck Thermal Gradient */}
                  <div className="text-right text-[10px] font-mono space-y-1">
                    <div className="text-amber-400 font-bold flex items-center justify-end gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>Sand: {isLive && solarData.sandTemp !== undefined && solarData.sandTemp !== null ? `${solarData.sandTemp}°C` : 'N/A'}</span>
                    </div>
                    <div className="text-emerald-400 font-bold">
                      Peltier Current: {isLive && solarData.peltierCurrent !== undefined ? `${solarData.peltierCurrent}A` : 'N/A'}
                    </div>
                    <div className="text-zinc-500 text-[9px]">
                      Press: {isLive && solarData.airPressure !== undefined ? `${solarData.airPressure} hPa` : 'N/A'}
                    </div>
                  </div>

                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
                  <span className="text-amber-300 font-semibold">Dual Energy Harvesting</span>
                  <button
                    onClick={() => onNavigate('windmill_peltier')}
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect Windmill Section</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Status & Wiper Trigger Bar */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
              <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                <span className="text-zinc-500">Wiper Status:</span>
                <span className={isCleaning ? "text-cyan-400 font-bold animate-pulse" : "text-emerald-400 font-bold"}>
                  {isCleaning ? 'Active Cleaning Sweep (10s)' : 'Clean & Ready'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onTriggerClean}
                  disabled={isCleaning}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isCleaning ? 'Sweeping...' : 'Sweep Wiper Now'}</span>
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <span>Open Gauges</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </button>
              </div>
            </div>

          </div>

          {/* Live Quick-Stats Ticker */}
          <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-black p-3 rounded-xl border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Live Output</div>
              <div className="text-xl font-mono font-bold text-amber-400 flex items-baseline gap-1">
                <span>{currentWatt}</span>
                <span className="text-xs text-zinc-400 font-normal">{currentWatt !== 'NA' ? 'Watts' : ''}</span>
              </div>
            </div>
            <div className="bg-black p-3 rounded-xl border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Peak Today</div>
              <div className="text-xl font-mono font-bold text-white flex items-baseline gap-1">
                <span>{peakWatt}</span>
                <span className="text-xs text-zinc-400 font-normal">{peakWatt !== 'NA' ? 'Watts' : ''}</span>
              </div>
            </div>
            <div className="bg-black p-3 rounded-xl border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Surface Temp</div>
              <div className="text-xl font-mono font-bold text-zinc-200 flex items-baseline gap-1">
                <span>{isLive && solarData.temperature !== null ? `${solarData.temperature.toFixed(1)}°C` : 'NA'}</span>
              </div>
            </div>
            <div className="bg-black p-3 rounded-xl border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Precipitation</div>
              <div className="text-xl font-mono font-bold text-sky-400 truncate">
                {isLive && solarData.isRaining !== null ? (solarData.isRaining ? 'Raining' : 'Clear Sky') : 'NA'}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4 Core System Architecture Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Integrated Power Management & Security Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Dual-layer cyber-physical engineering uniting high-efficiency multi-source microgrid harvesting with automated 24/7 camera surveillance and physical actuators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Pillar 1: Smart Power */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-300 group">
            <div className="space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gauge className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">INA219 Power Analytics</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Measures bus voltage and shunt current over I2C (<code className="text-cyan-300 font-mono">GPIO 21 & 22</code>). Instantaneous <code className="text-amber-300 font-mono">V × I = Watts</code> computation streams active telemetry to cloud & local field AP.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-zinc-800/80 text-[11px] font-mono text-cyan-400 flex items-center justify-between">
              <span>I2C Communication</span>
              <span>12-Bit Precision ADC</span>
            </div>
          </div>

          {/* Pillar 2: Security */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-rose-500/40 transition-all duration-300 group">
            <div className="space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">ESP32-CAM 24/7 Security</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                AI-Thinker OV2640 camera streaming, PIR infrared intrusion detection (<code className="text-rose-300 font-mono">GPIO 13</code>), and active siren alarm buzzer (<code className="text-rose-300 font-mono">GPIO 12</code>) with cloud photo logging.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-zinc-800/80 text-[11px] font-mono text-rose-400 flex items-center justify-between">
              <span>Vision Surveillance</span>
              <span>Intruder Alarm Siren</span>
            </div>
          </div>

          {/* Pillar 3: Wiper Maintenance */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300 group">
            <div className="space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Motorized Squeegee Wiper</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Mechanical dual-pass silicone wiper (<code className="text-purple-300 font-mono">GPIO 27</code>) sweeps dust at 03:00 AM without spraying cold water, completely protecting solar panel glass from destructive thermal shock.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-zinc-800/80 text-[11px] font-mono text-amber-400 flex items-center justify-between">
              <span>Zero Thermal Shock</span>
              <span>Silicone Squeegee</span>
            </div>
          </div>

          {/* Pillar 4: Hybrid Harvesting */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 group">
            <div className="space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wind className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Kinetic & Thermal Harvest</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Windmill Hall-effect tachometer interrupt (<code className="text-cyan-300 font-mono">GPIO 34</code>) coupled with Peltier Seebeck thermal harvesting over heated sand beds with DS18B20 temperature probes.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-zinc-800/80 text-[11px] font-mono text-emerald-400 flex items-center justify-between">
              <span>Aero Dynamo RPM</span>
              <span>Seebeck Generator</span>
            </div>
          </div>

        </div>
      </section>

      {/* Security System & ESP32-CAM Feature Banner */}
      <section className="bg-gradient-to-r from-red-950/40 via-zinc-950 to-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>New Feature: Real-Time Security & AI Surveillance</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              ESP32-CAM Perimeter Security with Buzzer & Storage
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              Monitors <code className="text-red-300 font-mono bg-black/60 px-1.5 py-0.5 rounded">/security_system/last_detection</code> in Firebase Realtime Database. Displays instant visual photo verification (<code className="text-cyan-300 font-mono">latest_photo.jpg</code>) for <strong>Human Detected!</strong> alerts, dispatches automatic buzzer deterrent commands (<code className="text-yellow-300 font-mono">GPIO 12</code>) for <strong>Animal Detected</strong>, and lets you toggle camera power remotely.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => onNavigate('security')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono font-bold text-xs tracking-wider uppercase transition cursor-pointer shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Open Security Dashboard</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive System Preview & Trigger */}
      <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center space-x-1.5 text-xs font-mono">
              {isLive ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Live Interactive Node: node_01</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Microcontroller:</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[11px] font-bold">
                    unable to connect microcontroller
                  </span>
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white">
              Motorized Wiper Sweep
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Trigger a real-time wiper sweep on the station. The motorized silicone squeegee arm will sweep across the photovoltaic panel, clearing dust soiling without spraying water, preserving solar glass integrity.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <button
              onClick={onTriggerClean}
              disabled={isCleaning}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xl cursor-pointer select-none active:scale-95 ${
                isCleaning 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse' 
                  : !isLive
                    ? 'bg-red-950/60 hover:bg-red-900/60 border border-red-500/50 text-red-200 shadow-red-500/10'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-cyan-500/25'
              }`}
            >
              {isCleaning ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : !isLive ? (
                <WifiOff className="w-4 h-4 text-red-400" />
              ) : (
                <Hand className="w-4 h-4 animate-bounce text-slate-950" />
              )}
              <span>{isCleaning ? 'Wiper Cycle Active (10s)...' : !isLive ? 'unable to connect microcontroller' : 'Trigger Wiper Sweep'}</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs sm:text-sm border border-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open Full Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Mobile App (APK & PWA) and Arduino IDE Software Banner */}
      <section className="bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-cyan-950/40 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-emerald-400">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 font-bold">
                📱 Android APK & Firmware Software
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">v2.4.0 Release</span>
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Download Android APK & Arduino IDE Firmware Suite
            </h3>
            
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              Run Farm.IOT as a standalone mobile application on your Android phone with real-time Firebase telemetry and 1-tap remote motorized wiper sweeps. Plus, get the official Arduino IDE software, CH340 / CP2102 USB drivers, and complete ready-to-flash <code className="text-emerald-300 font-mono">.ino</code> firmware sketches.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            {/* Direct APK Download Button */}
            <a
              href="/api/download/apk"
              download="Farm_IOT_SmartStation_v2.4.apk"
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 font-black text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer select-none active:scale-95"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Download APK (.apk)</span>
            </a>

            {/* Arduino IDE Software & Flasher Link */}
            <button
              onClick={() => onNavigate('esp32')}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 font-bold text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer select-none"
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Arduino IDE & Sketches</span>
            </button>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800 flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">Android APK v2.4.0</div>
              <div className="text-[10px] text-zinc-400">Direct Sideload • Android 7.0 to 15+</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">Arduino IDE 2.3+ & Legacy 1.8</div>
              <div className="text-[10px] text-zinc-400">Windows, macOS & Linux</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800 flex items-center gap-2.5">
            <Database className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">100% Synced Cloud</div>
              <div className="text-[10px] text-zinc-400">Shared Firestore Database</div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications Quick Table */}
      <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          Technical Hardware Specifications & Bill of Materials
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-black p-3 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-400 text-[11px]">Microcontroller</div>
            <div className="text-white font-bold mt-1">ESP32 Dual-Core @ 240MHz</div>
            <div className="text-zinc-500 text-[10px]">Wi-Fi 802.11 b/g/n + BLE</div>
          </div>
          <div className="bg-black p-3 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-400 text-[11px]">Voltage & Current</div>
            <div className="text-sky-400 font-bold mt-1">INA219 High-Side I2C</div>
            <div className="text-zinc-500 text-[10px]">0–26V Bus, ±3.2A Shunt</div>
          </div>
          <div className="bg-black p-3 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-400 text-[11px]">Surface Temp Sensor</div>
            <div className="text-orange-400 font-bold mt-1">LM35 Precision Analog</div>
            <div className="text-zinc-500 text-[10px]">10mV/°C Linear Scale</div>
          </div>
          <div className="bg-black p-3 rounded-xl border border-zinc-800/80">
            <div className="text-zinc-400 text-[11px]">Raindrop Sensor</div>
            <div className="text-cyan-400 font-bold mt-1">FC-37 Rain Board</div>
            <div className="text-zinc-500 text-[10px]">Natural Rinse Detection</div>
          </div>
        </div>
      </section>

    </div>
  );
};
