import React, { useState } from 'react';
import { Clock, Check, X, Sparkles, ShieldCheck, Moon, Sun, AlertCircle } from 'lucide-react';

interface ChangeCleanTimeModalProps {
  currentTime: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTime: string) => Promise<void>;
  isOwner: boolean;
  onRequireSignIn: () => void;
}

const PRESET_TIMES = [
  { time: '03:00 AM', label: '03:00 AM (Recommended - Cool Night, Zero Thermal Shock)', icon: Moon },
  { time: '04:00 AM', label: '04:00 AM (Pre-Dawn Nocturnal Sweep)', icon: Moon },
  { time: '05:30 AM', label: '05:30 AM (Early Morning Pre-Sun Prep)', icon: Sun },
  { time: '11:00 PM', label: '11:00 PM (Late Night Dust Removal)', icon: Moon },
];

export const ChangeCleanTimeModal: React.FC<ChangeCleanTimeModalProps> = ({
  currentTime,
  isOpen,
  onClose,
  onSave,
  isOwner,
  onRequireSignIn,
}) => {
  // Parse current time e.g. "03:00 AM"
  const parseTime = (timeStr: string) => {
    try {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        return {
          hour: match[1].padStart(2, '0'),
          minute: match[2],
          ampm: match[3].toUpperCase() as 'AM' | 'PM',
        };
      }
    } catch {
      // fallback
    }
    return { hour: '03', minute: '00', ampm: 'AM' as const };
  };

  const initial = parseTime(currentTime || '03:00 AM');
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>(initial.ampm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const formattedTime = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;

  const handleSelectPreset = (presetTime: string) => {
    const parsed = parseTime(presetTime);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedAmPm(parsed.ampm);
  };

  const handleSave = async () => {
    if (!isOwner) {
      setError('Administrator credentials required. Please sign in with the owner account to change cleaning schedules.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(formattedTime);
      setSuccessNotice(`Scheduled cleaning time updated to ${formattedTime} in Firebase!`);
      setTimeout(() => {
        onClose();
        setSuccessNotice(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update cleaning schedule in Firebase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
                <span>Set Solar Cleaning Schedule</span>
              </h3>
              <p className="text-xs text-slate-400">
                Synchronized with Firebase Firestore & ESP32 Microcontroller
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Schedule Banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300 font-mono">Current Cleaning Schedule:</span>
          </div>
          <span className="text-sm font-bold font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
            {currentTime || '03:00 AM'} Daily
          </span>
        </div>

        {/* Time Selector Controls */}
        <div className="mt-5 space-y-4">
          <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Select New Daily Cleaning Time
          </label>

          <div className="flex items-center justify-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            {/* Hour Picker */}
            <div className="flex flex-col items-center">
              <label className="text-[10px] text-slate-500 font-mono mb-1">HOUR</label>
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xl px-3 py-2 rounded-xl focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <span className="text-2xl font-black text-slate-500 font-mono mt-4">:</span>

            {/* Minute Picker */}
            <div className="flex flex-col items-center">
              <label className="text-[10px] text-slate-500 font-mono mb-1">MINUTE</label>
              <select
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xl px-3 py-2 rounded-xl focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* AM / PM Toggle */}
            <div className="flex flex-col items-center">
              <label className="text-[10px] text-slate-500 font-mono mb-1">AM / PM</label>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedAmPm('AM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    selectedAmPm === 'AM'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAmPm('PM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    selectedAmPm === 'PM'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-2">
              Recommended Solar Engineering Presets:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_TIMES.map((preset) => {
                const Icon = preset.icon;
                const isSelected = formattedTime === preset.time;
                return (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => handleSelectPreset(preset.time)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-mono transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thermal Shock Engineering Note */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Engineering Best Practice: </strong> 
              Nocturnal cleaning between <span className="text-white">01:00 AM and 05:00 AM</span> is recommended. The glass is cooled down to ambient temperature, eliminating thermal shock and ensuring the panel is clean before morning irradiance.
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition cursor-pointer"
          >
            Cancel
          </button>

          {isOwner ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving to Firebase...' : `Save ${formattedTime} to Firebase`}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequireSignIn}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-mono font-bold text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>Admin Login to Change</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
