import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  Clock, 
  Check, 
  Settings, 
  Radio, 
  RotateCw,
  Monitor
} from 'lucide-react';

interface AutoRefreshControllerProps {
  onSoftRefresh: () => void;
  lastUpdated: Date;
}

export const AutoRefreshController: React.FC<AutoRefreshControllerProps> = ({
  onSoftRefresh,
  lastUpdated,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [intervalSec, setIntervalSec] = useState<number>(5); // 5 seconds default
  const [remainingSec, setRemainingSec] = useState<number>(5);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [refreshMode, setRefreshMode] = useState<'soft' | 'hard'>('soft');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [timeAgoText, setTimeAgoText] = useState<string>('Just now');

  const onSoftRefreshRef = useRef(onSoftRefresh);
  useEffect(() => {
    onSoftRefreshRef.current = onSoftRefresh;
  }, [onSoftRefresh]);

  // Relative "time ago" string
  useEffect(() => {
    const updateRelativeTime = () => {
      const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diffSec < 2) setTimeAgoText('Just now');
      else if (diffSec < 60) setTimeAgoText(`${diffSec}s ago`);
      else setTimeAgoText(`${Math.floor(diffSec / 60)}m ago`);
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const triggerRefresh = useCallback(() => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 700);

    if (refreshMode === 'hard') {
      window.location.reload();
    } else {
      onSoftRefreshRef.current();
    }
  }, [refreshMode]);

  // Separate effect to trigger refresh when remainingSec reaches 0
  // Crucial: this ensures no parent setState is called during a child's setState updater!
  useEffect(() => {
    if (remainingSec === 0) {
      triggerRefresh();
      setRemainingSec(intervalSec);
    }
  }, [remainingSec, intervalSec, triggerRefresh]);

  // Countdown timer loop
  useEffect(() => {
    if (!isEnabled) return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isEnabled]);

  const handleManualRefresh = () => {
    setRemainingSec(intervalSec);
    triggerRefresh();
  };

  const toggleAutoRefresh = () => {
    setIsEnabled((prev) => !prev);
    setRemainingSec(intervalSec);
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-mono shadow-sm">
        
        {/* Toggle Play / Pause auto refresh */}
        <button
          onClick={toggleAutoRefresh}
          title={isEnabled ? `Auto-refresh active (${intervalSec}s). Click to pause.` : 'Auto-refresh paused. Click to resume.'}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer ${
            isEnabled 
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' 
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          {isEnabled ? (
            <>
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="font-semibold">{remainingSec}s</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-slate-400" />
              <span className="text-[11px]">Paused</span>
            </>
          )}
        </button>

        {/* Manual Refresh Now Button */}
        <button
          onClick={handleManualRefresh}
          title="Refresh webpage & telemetry now"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="text-[10px] hidden sm:inline">Refresh</span>
        </button>

        {/* Settings gear dropdown button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          title="Auto-refresh settings"
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            showSettings 
              ? 'bg-slate-700 text-white' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings Popover Dropdown */}
      {showSettings && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-sans font-bold text-white">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Auto Refresh Settings
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {timeAgoText}
            </span>
          </div>

          {/* Refresh Intervals */}
          <div className="mt-3">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
              Refresh Interval:
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
              {[3, 5, 10, 30].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    setIntervalSec(sec);
                    setRemainingSec(sec);
                  }}
                  className={`py-1 rounded-lg border text-center transition cursor-pointer ${
                    intervalSec === sec
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Refresh Mode: Soft Live Sync vs Full Browser Reload */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
              Refresh Mode:
            </label>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer">
                <input
                  type="radio"
                  name="refreshMode"
                  checked={refreshMode === 'soft'}
                  onChange={() => setRefreshMode('soft')}
                  className="accent-cyan-500"
                />
                <div>
                  <div className="text-white font-medium text-[11px]">Live Telemetry Sync</div>
                  <div className="text-[10px] text-slate-400">Pulls latest sensor data smoothly without page flicker</div>
                </div>
              </label>

              <label className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer">
                <input
                  type="radio"
                  name="refreshMode"
                  checked={refreshMode === 'hard'}
                  onChange={() => setRefreshMode('hard')}
                  className="accent-cyan-500"
                />
                <div>
                  <div className="text-white font-medium text-[11px] flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-amber-400" />
                    Full Webpage Reload (Kiosk)
                  </div>
                  <div className="text-[10px] text-slate-400">Hard browser reload for unattended displays</div>
                </div>
              </label>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowSettings(false)}
            className="w-full mt-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};
