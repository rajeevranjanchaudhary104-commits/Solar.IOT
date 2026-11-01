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
  Monitor,
  LogOut,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';

interface AutoRefreshControllerProps {
  onSoftRefresh: () => void;
  lastUpdated: Date;
  currentUser?: { displayName?: string | null; email?: string | null } | null;
  onSignOut?: () => void;
  onSignIn?: () => void;
  onOpenSettings?: () => void;
}

export const AutoRefreshController: React.FC<AutoRefreshControllerProps> = ({
  onSoftRefresh,
  lastUpdated,
  currentUser,
  onSignOut,
  onSignIn,
  onOpenSettings
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [intervalSec, setIntervalSec] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_refresh_interval');
      if (saved) return Number(saved) || 5;
    } catch {}
    return 5;
  });
  const [remainingSec, setRemainingSec] = useState<number>(5);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [refreshMode, setRefreshMode] = useState<'soft' | 'hard'>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_refresh_mode');
      if (saved === 'hard' || saved === 'soft') return saved;
    } catch {}
    return 'soft';
  });

  const onSoftRefreshRef = useRef(onSoftRefresh);
  useEffect(() => {
    onSoftRefreshRef.current = onSoftRefresh;
  }, [onSoftRefresh]);

  // Sync settings when modified from main Settings v2.4 page
  useEffect(() => {
    const handleSettingsUpdate = () => {
      try {
        const savedInterval = localStorage.getItem('solar_iot_refresh_interval');
        if (savedInterval) {
          const num = Number(savedInterval);
          if (num > 0) {
            setIntervalSec(num);
            setRemainingSec(num);
          }
        }
        const savedMode = localStorage.getItem('solar_iot_refresh_mode');
        if (savedMode === 'hard' || savedMode === 'soft') {
          setRefreshMode(savedMode);
        }
      } catch {}
    };

    window.addEventListener('solar_iot_refresh_settings_changed', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);
    return () => {
      window.removeEventListener('solar_iot_refresh_settings_changed', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
    };
  }, []);

  const triggerRefresh = useCallback(() => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 700);

    if (refreshMode === 'hard') {
      window.location.reload();
    } else {
      onSoftRefreshRef.current();
    }
  }, [refreshMode]);

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

        {/* Open main Settings v2.4 */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Open Station Settings v2.4"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
