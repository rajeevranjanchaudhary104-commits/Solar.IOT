import React from 'react';
import { 
  Sun, 
  ShieldCheck, 
  LogIn, 
  Lock, 
  CheckCircle2, 
  Cpu, 
  Sparkles, 
  Zap, 
  ChevronRight,
  Database,
  X
} from 'lucide-react';

interface AuthModalProps {
  onSignInWithGoogle: () => void;
  onDemoSignIn: () => void;
  onClose?: () => void;
  error?: string | null;
  loading?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSignInWithGoogle,
  onDemoSignIn,
  onClose,
  error,
  loading = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-400 mb-4 shadow-inner">
            <Sun className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Solar<span className="text-amber-400">.</span><span className="text-cyan-400">IOT</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            ESP32-Powered Smart Solar Panel Monitoring & Automated Cleaning Station
          </p>

          <div className="my-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-left space-y-2.5">
            <div className="flex items-center space-x-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-time INA219 (V & I) and LM35 Temperature telemetry</span>
            </div>
            <div className="flex items-center space-x-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Remote pump spray & mechanized wiper activation</span>
            </div>
            <div className="flex items-center space-x-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Photovoltaic rooftop & LiFePO4 battery sizing calculators</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 text-left">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onSignInWithGoogle}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg transition flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Signing In...' : 'Sign in with Google Account'}</span>
            </button>

            <button
              onClick={onDemoSignIn}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Continue with Authorized Engineer Session</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mt-5 font-mono">
            Firebase Auth + Realtime Database Security Enforced
          </p>
        </div>
      </div>
    </div>
  );
};
