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
  Hand
} from 'lucide-react';
import { SolarData } from '../types/solar';

interface WebsiteHomeProps {
  solarData: SolarData;
  onNavigate: (tab: 'dashboard' | 'calculators' | 'esp32' | 'research' | 'about') => void;
  onTriggerClean: () => void;
  isCleaning: boolean;
}

export const WebsiteHome: React.FC<WebsiteHomeProps> = ({
  solarData,
  onNavigate,
  onTriggerClean,
  isCleaning,
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 sm:p-10 lg:p-14 shadow-2xl backdrop-blur-xl">
        {/* Glow ambient lights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium">
            <span className={`w-2 h-2 rounded-full ${solarData.espConnected ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`} />
            <span>
              {solarData.espConnected 
                ? 'Autonomous Solar Station • ESP32 Hardware Online' 
                : 'Solar Station Platform • ESP32 Disconnected (Sensors: N/A)'}
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none">
            Smart Solar Panel Monitoring &{' '}
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 bg-clip-text text-transparent">
              Automated Wiper Cleaning
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Protect photovoltaic generation from <strong>dust soiling loss</strong>. Real-time telemetry via <strong>INA219</strong>, surface temperature tracking via <strong>LM35</strong>, and natural precipitation detection via <strong>FC-37</strong>.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-2 group"
            >
              <span>Explore Live Telemetry</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('calculators')}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition cursor-pointer flex items-center gap-2"
            >
              <span>Solar Sizing Calculators</span>
            </button>
            <button
              onClick={() => onNavigate('esp32')}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs border border-slate-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Arduino Firmware</span>
            </button>
          </div>

          {/* Live Quick-Stats Ticker */}
          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Live Output</div>
              <div className="text-xl font-mono font-bold text-amber-400 flex items-baseline gap-1">
                <span>{currentWatt}</span>
                <span className="text-xs text-slate-400 font-normal">{currentWatt !== 'NA' ? 'Watts' : ''}</span>
              </div>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Peak Today</div>
              <div className="text-xl font-mono font-bold text-white flex items-baseline gap-1">
                <span>{peakWatt}</span>
                <span className="text-xs text-slate-400 font-normal">{peakWatt !== 'NA' ? 'Watts' : ''}</span>
              </div>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Surface Temp</div>
              <div className="text-xl font-mono font-bold text-slate-200 flex items-baseline gap-1">
                <span>{isLive && solarData.temperature !== null ? `${solarData.temperature.toFixed(1)}°C` : 'NA'}</span>
              </div>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Precipitation</div>
              <div className="text-xl font-mono font-bold text-sky-400 truncate">
                {isLive && solarData.isRaining !== null ? (solarData.isRaining ? 'Raining' : 'Clear Sky') : 'NA'}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3 Core System Architecture Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Engineered for Photovoltaic Efficiency
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            A comprehensive IoT-driven physical solution addressing dust accumulation and surface condition monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pillar 1 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-300 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gauge className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">INA219 High-Side Power Sensor</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Measures bus voltage and shunt current over I2C (<code className="text-cyan-300 font-mono">GPIO 21 & 22</code>). Real-time <code className="text-amber-300 font-mono">V × I = Watts</code> computation streams active telemetry continuously.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-cyan-400 flex items-center justify-between">
              <span>I2C Communication</span>
              <span>12-Bit ADC</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Motorized Squeegee Wiper (Safe Dry Sweep)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mechanical dry wiping system uses a motorized silicone squeegee wiper (<code className="text-purple-300 font-mono">GPIO 27</code>) to sweep dust without spraying cold water, completely protecting solar panel glass from destructive thermal shock.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-amber-400 flex items-center justify-between">
              <span>Thermal Shock Protected</span>
              <span>Silicone Squeegee</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-sky-500/40 transition-all duration-300 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CloudRain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Rain Detection & LM35 Thermal Sensor</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                FC-37 raindrop sensor (<code className="text-sky-300 font-mono">GPIO 35</code>) detects natural ambient precipitation. LM35 analog sensor (<code className="text-orange-300 font-mono">GPIO 34</code>) provides precise solar surface temperature telemetry over a linear 10mV/°C scale without fake alarms.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-sky-400 flex items-center justify-between">
              <span>Natural Precipitation</span>
              <span>Analog Thermal Scale</span>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive System Preview & Trigger */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Live Interactive Node: node_01</span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              Test Motorized Wiper Sweep
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
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
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-cyan-500/25'
              }`}
            >
              {isCleaning ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <Hand className="w-4 h-4 animate-bounce text-slate-950" />
              )}
              <span>{isCleaning ? 'Wiper Cycle Active (10s)...' : 'Trigger Wiper Sweep'}</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open Full Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Technical Specifications Quick Table */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          Technical Hardware Specifications & Bill of Materials
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-slate-400 text-[11px]">Microcontroller</div>
            <div className="text-white font-bold mt-1">ESP32 Dual-Core @ 240MHz</div>
            <div className="text-slate-500 text-[10px]">Wi-Fi 802.11 b/g/n + BLE</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-slate-400 text-[11px]">Voltage & Current</div>
            <div className="text-sky-400 font-bold mt-1">INA219 High-Side I2C</div>
            <div className="text-slate-500 text-[10px]">0–26V Bus, ±3.2A Shunt</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-slate-400 text-[11px]">Surface Temp Sensor</div>
            <div className="text-orange-400 font-bold mt-1">LM35 Precision Analog</div>
            <div className="text-slate-500 text-[10px]">10mV/°C Linear Scale</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-slate-400 text-[11px]">Raindrop Sensor</div>
            <div className="text-cyan-400 font-bold mt-1">FC-37 Rain Board</div>
            <div className="text-slate-500 text-[10px]">Natural Rinse Detection</div>
          </div>
        </div>
      </section>

    </div>
  );
};
