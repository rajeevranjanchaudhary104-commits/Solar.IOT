import React from 'react';

interface CircularGaugeProps {
  value: number | null | undefined;
  min?: number;
  max: number;
  unit: string;
  label: string;
  sublabel?: string;
  color?: string; // fallback or base hex
  gradientId?: string;
  gradientFrom?: string;
  gradientTo?: string;
  warningThreshold?: number;
  dangerThreshold?: number;
  peakValue?: number | null; // e.g. highest recorded today
  size?: number;
  precision?: number;
  icon?: React.ReactNode;
  isOffline?: boolean;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  min = 0,
  max,
  unit,
  label,
  sublabel,
  color = '#10b981',
  gradientId = 'gaugeGradient',
  gradientFrom,
  gradientTo,
  warningThreshold,
  dangerThreshold,
  peakValue,
  size = 148,
  precision = 1,
  icon,
  isOffline = false,
}) => {
  const isAvailable = value !== null && value !== undefined && !isOffline;
  const strokeWidth = 11;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc angle (240 degrees arc for industrial tachometer style)
  const arcLength = circumference * 0.75;

  // Clamped percentage if available, otherwise 0
  const clampedVal = isAvailable ? Math.min(Math.max(value, min), max) : min;
  const normalized = isAvailable ? (clampedVal - min) / (max - min) : 0;
  const strokeDashoffsetFilled = circumference - (arcLength * normalized);

  // Peak position if provided and available
  let peakDashoffset = circumference;
  if (isAvailable && peakValue !== undefined && peakValue !== null) {
    const clampedPeak = Math.min(Math.max(peakValue, min), max);
    const normalizedPeak = (clampedPeak - min) / (max - min);
    peakDashoffset = circumference - (arcLength * normalizedPeak);
  }

  // Dynamic status color if thresholds provided
  let isDanger = false;
  let isWarning = false;

  if (isAvailable) {
    if (dangerThreshold !== undefined && value >= dangerThreshold) {
      isDanger = true;
    } else if (warningThreshold !== undefined && value >= warningThreshold) {
      isWarning = true;
    }
  }

  const gradStart = !isAvailable
    ? '#475569' 
    : isDanger 
    ? '#ef4444' 
    : isWarning 
    ? '#f59e0b' 
    : (gradientFrom || color);
    
  const gradEnd = !isAvailable 
    ? '#334155' 
    : isDanger 
    ? '#dc2626' 
    : isWarning 
    ? '#d97706' 
    : (gradientTo || color);

  return (
    <div className="flex flex-col items-center justify-center p-2 relative select-none group">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform rotate-[135deg] overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradStart} />
              <stop offset="100%" stopColor={gradEnd} />
            </linearGradient>
            {isAvailable && (
              <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={gradEnd} floodOpacity="0.45" />
              </filter>
            )}
          </defs>

          {/* Background Track with subtle tick dash */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1e293b" // slate-800
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Secondary tick guide */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 8}
            fill="transparent"
            stroke="#334155" // slate-700
            strokeWidth="1.5"
            strokeDasharray="2 12"
            strokeDashoffset="0"
            opacity="0.3"
          />

          {/* Active Value Progress Arc with Glow */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffsetFilled}
            strokeLinecap="round"
            filter={isAvailable ? `url(#glow-${gradientId})` : undefined}
            className="transition-all duration-700 ease-out"
          />

          {/* Peak Marker tick if provided */}
          {isAvailable && peakValue !== undefined && peakValue !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#fbbf24" // amber-400
              strokeWidth={strokeWidth + 4}
              strokeDasharray={`4 ${circumference}`}
              strokeDashoffset={peakDashoffset}
              strokeLinecap="butt"
              className="transition-all duration-500"
            >
              <title>{`Peak: ${peakValue}${unit}`}</title>
            </circle>
          )}
        </svg>

        {/* Center Digital Readout - Safely centered without clipping or hiding words */}
        <div 
          className="absolute inset-0 m-auto flex flex-col items-center justify-center text-center pointer-events-none p-1 z-10"
          style={{ width: `${Math.round(radius * 1.62)}px`, height: `${Math.round(radius * 1.62)}px` }}
        >
          {icon && (
            <div className={`mb-0.5 shrink-0 scale-75 sm:scale-85 ${isAvailable ? 'opacity-90 group-hover:scale-100' : 'opacity-40'} transition-transform duration-300`}>
              {icon}
            </div>
          )}
          
          <div 
            className="text-[9px] sm:text-[10px] font-mono uppercase tracking-tight text-slate-300 font-bold px-0.5 leading-snug break-words max-w-full" 
            title={label}
          >
            {label}
          </div>

          <div
            className={`font-mono font-black tracking-tight transition-all duration-300 flex items-baseline justify-center max-w-full px-0.5 my-0.5 ${
              !isAvailable
                ? 'text-slate-400 text-lg sm:text-xl'
                : isDanger
                ? 'text-red-500 animate-pulse text-lg sm:text-xl drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                : isWarning
                ? 'text-amber-400 text-lg sm:text-xl'
                : 'text-white text-lg sm:text-xl'
            }`}
          >
            {isAvailable ? (
              <>
                <span className="tabular-nums">{value.toFixed(precision)}</span>
                <span className="text-[9px] sm:text-[10px] font-mono ml-0.5 text-slate-300 font-semibold shrink-0">
                  {unit}
                </span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-bold tracking-widest text-slate-500">
                NA
              </span>
            )}
          </div>

          <div 
            className="text-[8.5px] sm:text-[9.5px] font-mono text-slate-400 px-0.5 leading-tight break-words max-w-full" 
            title={isAvailable ? (sublabel || `${label} active`) : 'Hardware Offline'}
          >
            {isAvailable ? (sublabel || `${label} active`) : 'Offline'}
          </div>
        </div>
      </div>

      {/* Min / Max Range & Peak Indicators */}
      <div className="flex justify-between items-center w-full px-1.5 mt-1 text-[9px] font-mono text-slate-400">
        <span>{min}{unit}</span>
        {isAvailable && peakValue !== undefined && peakValue !== null && (
          <span className="text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded text-[8px] flex items-center gap-0.5 font-bold" title="Highest Recorded">
            ▲ {peakValue.toFixed(precision)}{unit}
          </span>
        )}
        {!isAvailable && (
          <span className="text-slate-500 text-[8px]">No Signal</span>
        )}
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};
