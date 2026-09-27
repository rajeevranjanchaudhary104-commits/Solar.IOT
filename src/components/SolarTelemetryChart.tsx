import React, { useState } from 'react';
import { 
  TrendingUp, 
  Sun, 
  CloudRain, 
  Zap, 
  Thermometer, 
  Crown, 
  WifiOff,
  Database
} from 'lucide-react';
import { TelemetryPoint } from '../types/solar';

interface SolarTelemetryChartProps {
  data: TelemetryPoint[];
  highestWatt: number | null;
  highestWattTime: string | null;
  lastRainTime: string | null;
  isOffline?: boolean;
  disconnectionDurationText?: string;
}

export const SolarTelemetryChart: React.FC<SolarTelemetryChartProps> = ({
  data,
  highestWatt,
  highestWattTime,
  lastRainTime,
  isOffline = false,
  disconnectionDurationText = 'Not connected last 1 hour',
}) => {
  const [activeMetric, setActiveMetric] = useState<'power' | 'voltage' | 'current' | 'temperature'>('power');
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingLeft = 45;
  const paddingRight = 35;
  const paddingTop = 40;
  const paddingBottom = 45;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Value boundaries
  let metricMax = 120;
  let metricUnit = 'W';
  let metricColor = '#f59e0b'; // amber
  let gradientFrom = '#fbbf24';
  let gradientTo = '#d97706';

  if (activeMetric === 'voltage') {
    metricMax = 24;
    metricUnit = 'V';
    metricColor = '#38bdf8'; // sky
    gradientFrom = '#38bdf8';
    gradientTo = '#0284c7';
  } else if (activeMetric === 'current') {
    metricMax = 7;
    metricUnit = 'A';
    metricColor = '#10b981'; // emerald
    gradientFrom = '#34d399';
    gradientTo = '#059669';
  } else if (activeMetric === 'temperature') {
    metricMax = 60;
    metricUnit = '°C';
    metricColor = '#f97316'; // orange
    gradientFrom = '#fb923c';
    gradientTo = '#ea580c';
  }

  // Calculate points from real telemetry data in Firebase
  const hasData = Array.isArray(data) && data.length > 0;
  const points = hasData ? data.map((d, index) => {
    const val = activeMetric === 'power' ? d.power :
                activeMetric === 'voltage' ? d.voltage :
                activeMetric === 'current' ? d.current : d.temperature;
    
    const divisor = data.length > 1 ? data.length - 1 : 1;
    const x = paddingLeft + (index / divisor) * chartWidth;
    const y = paddingTop + chartHeight - (Math.min(val, metricMax) / metricMax) * chartHeight;
    return { x, y, val, d, index };
  }) : [];

  // SVG Path generator (smooth cubic bezier curve)
  const generatePath = () => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const linePath = generatePath();
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  // Find Peak Watt Index for beacon crown
  const peakIndex = points.length > 0
    ? points.reduce((maxI, p, i, arr) => (p.d.power > arr[maxI].d.power ? i : maxI), 0)
    : -1;
  const peakPoint = peakIndex !== -1 ? points[peakIndex] : null;

  // Find Rain index
  const rainIndex = points.findIndex((p) => p.d.isRaining);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl backdrop-blur-md relative overflow-hidden">
      
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-sm sm:text-base">
                Telemetry & Generation Curve
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Database className="w-3 h-3 text-cyan-400" />
                Firebase Real Data
              </span>
              {isOffline ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  {disconnectionDurationText}
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Stream
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Real photovoltaic generation history from INA219 sensor logged into Cloud Firestore
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="grid grid-cols-2 sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono gap-1 sm:gap-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveMetric('power')}
            className={`px-2.5 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeMetric === 'power'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>Power (W)</span>
          </button>
          <button
            onClick={() => setActiveMetric('voltage')}
            className={`px-2.5 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeMetric === 'voltage'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Voltage (V)</span>
          </button>
          <button
            onClick={() => setActiveMetric('current')}
            className={`px-2.5 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeMetric === 'current'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Current (A)</span>
          </button>
          <button
            onClick={() => setActiveMetric('temperature')}
            className={`px-2.5 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeMetric === 'temperature'
                ? 'bg-orange-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 shrink-0" />
            <span>Temp (°C)</span>
          </button>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 my-3 sm:my-4">
        {/* Highest Watt Banner */}
        <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Highest Watt (Peak)
              </div>
              <div className="text-sm font-bold font-mono text-white flex items-baseline gap-1">
                <span>{highestWatt !== null && highestWatt !== 145.4 ? highestWatt.toFixed(1) : 'NA'}</span>
                <span className="text-amber-400 font-normal text-xs">{highestWatt !== null && highestWatt !== 145.4 ? 'Watts' : ''}</span>
                {highestWatt !== null && highestWatt !== 145.4 && highestWattTime && (
                  <span className="text-[10px] text-slate-400 ml-1">@ {highestWattTime}</span>
                )}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            RECORD
          </span>
        </div>

        {/* Last Rain Banner */}
        <div className="bg-slate-950/70 border border-sky-500/20 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Last Rain (FC-37)
              </div>
              <div className="text-sm font-bold font-mono text-white flex items-baseline gap-1">
                <span>{lastRainTime || 'Dry (No Rain)'}</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
            FC-37
          </span>
        </div>

        {/* Hardware Status Banner */}
        <div className="hidden md:flex bg-slate-950/70 border border-slate-800 rounded-xl p-3 items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Connection Status
              </div>
              <div className="text-sm font-bold font-mono text-white">
                {isOffline ? disconnectionDurationText : 'Connected (Real-Time)'}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            isOffline 
              ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' 
              : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
          }`}>
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* SVG Line / Area Graph */}
      <div className="relative mt-2 rounded-xl bg-slate-950/80 border border-slate-800/80 p-2 sm:p-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[500px] sm:min-w-full overflow-visible select-none"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradientFrom} stopOpacity={0.35} />
              <stop offset="100%" stopColor={gradientTo} stopOpacity={0.0} />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Lines (Y-Axis) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const valLabel = Math.round(metricMax * ratio);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {valLabel}{metricUnit}
                </text>
              </g>
            );
          })}

          {/* X-Axis Timestamps */}
          {hasData && points.map((p, i) => {
            // Show timestamps spaced out
            const step = Math.max(1, Math.floor(points.length / 6));
            if (i % step === 0 || i === points.length - 1) {
              return (
                <text
                  key={i}
                  x={p.x}
                  y={paddingTop + chartHeight + 20}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {p.d.time}
                </text>
              );
            }
            return null;
          })}

          {/* Area Fill */}
          {hasData && areaPath && (
            <path d={areaPath} fill="url(#curveGradient)" />
          )}

          {/* Curve Stroke Line */}
          {hasData && linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={metricColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Rain Indication Marker */}
          {hasData && rainIndex !== -1 && points[rainIndex] && (
            <g transform={`translate(${points[rainIndex].x}, ${points[rainIndex].y})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={paddingTop + chartHeight - points[rainIndex].y}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle r="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
              <text
                x="0"
                y="-10"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                🌧️ Rain
              </text>
            </g>
          )}

          {/* Peak Watt Crown Beacon */}
          {hasData && peakPoint && activeMetric === 'power' && (
            <g transform={`translate(${peakPoint.x}, ${peakPoint.y})`}>
              <circle r="8" fill="#fbbf24" opacity="0.3" className="animate-ping" />
              <circle r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              
              {/* Callout box */}
              <g transform="translate(0, -28)">
                <rect
                  x="-55"
                  y="-12"
                  width="110"
                  height="22"
                  rx="6"
                  fill="#1e293b"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#fef3c7"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  👑 Peak: {highestWatt !== null && highestWatt !== 145.4 ? `${highestWatt.toFixed(1)}W` : `${peakPoint.val.toFixed(1)}W`}
                </text>
              </g>
            </g>
          )}

          {/* Interactive Hover Point & Cursor */}
          {hoverIndex !== null && points[hoverIndex] && (
            <g transform={`translate(${points[hoverIndex].x}, ${points[hoverIndex].y})`}>
              <line
                x1="0"
                y1={-(points[hoverIndex].y - paddingTop)}
                x2="0"
                y2={paddingTop + chartHeight - points[hoverIndex].y}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle r="6" fill={metricColor} stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* Hover Invisible overlay areas */}
          {hasData && points.map((p, i) => (
            <rect
              key={i}
              x={p.x - (chartWidth / points.length) / 2}
              y={paddingTop}
              width={chartWidth / points.length}
              height={chartHeight}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => {
                setHoveredPoint(p.d);
                setHoverIndex(i);
              }}
              onMouseLeave={() => {
                setHoveredPoint(null);
                setHoverIndex(null);
              }}
            />
          ))}
        </svg>

        {/* Empty state when zero points in Firebase */}
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/60 backdrop-blur-xs rounded-xl">
            <WifiOff className="w-8 h-8 text-amber-400 mb-2 animate-pulse" />
            <div className="text-sm font-bold text-white font-mono">
              Awaiting Real ESP32 Telemetry in Firebase
            </div>
            <p className="text-xs text-slate-400 max-w-md mt-1 font-mono">
              Real historical sensor data from your INA219 will plot here directly from Firestore. No simulated data is rendered.
            </p>
            <div className="mt-3 text-[11px] font-mono text-cyan-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              Firestore Doc: solar_iot/node_01
            </div>
          </div>
        )}

        {/* Floating Tooltip readout on scrub */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono pointer-events-none z-20 flex items-center space-x-4">
            <div>
              <div className="text-[10px] text-slate-400">Timestamp</div>
              <div className="text-white font-bold">{hoveredPoint.time}</div>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <div className="text-[10px] text-amber-400">Solar Power</div>
              <div className="text-amber-300 font-bold">{hoveredPoint.power.toFixed(1)} W</div>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <div className="text-[10px] text-sky-400">Voltage</div>
              <div className="text-sky-300 font-bold">{hoveredPoint.voltage.toFixed(2)} V</div>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <div className="text-[10px] text-emerald-400">Current</div>
              <div className="text-emerald-300 font-bold">{hoveredPoint.current.toFixed(2)} A</div>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <div className="text-[10px] text-orange-400">LM35 Temp</div>
              <div className="text-orange-300 font-bold">{hoveredPoint.temperature.toFixed(1)}°C</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Real Sensor Telemetry Sync: Cloud Firestore <code className="text-slate-400">solar_iot/node_01</code>
        </span>
        <span className="text-slate-400">
          Scrub across chart to inspect point-in-time telemetry
        </span>
      </div>
    </div>
  );
};
