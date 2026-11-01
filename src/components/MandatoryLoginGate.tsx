import React, { useState } from 'react';
import { 
  Sun, 
  ShieldCheck, 
  LogIn, 
  Lock, 
  Moon, 
  Mail, 
  AlertCircle,
  KeyRound,
  RefreshCw,
  Cpu,
  Eye
} from 'lucide-react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, getTranslation } from '../lib/translations';

export interface AuthorizedProfile {
  email: string;
  displayName: string;
  role: 'owner' | 'admin' | 'engineer';
  description: string;
  badge: string;
  avatarBg: string;
}

// Keep export for backward compatibility if imported elsewhere
export const VERIFIED_PROFILES: AuthorizedProfile[] = [
  {
    email: 'sushilnisha23112004@gmail.com',
    displayName: 'Er. Sushil Kumar',
    role: 'admin',
    description: 'Project Mentor Teacher & Faculty Guide',
    badge: 'Mentor Teacher',
    avatarBg: 'from-emerald-500 to-teal-600'
  },
  {
    email: 'rajeevranjanchaudhary104@gmail.com',
    displayName: 'Lead Developer',
    role: 'owner',
    description: 'Lead Student Researcher & System Developer',
    badge: 'Lead Developer',
    avatarBg: 'from-amber-500 to-orange-600'
  }
];

interface MandatoryLoginGateProps {
  onSignInWithGoogle: () => void;
  onEngineerSignIn?: (profile: { email: string; displayName: string; role?: string }) => void;
  onEmailPasswordSignIn?: (email: string, pass: string, isSignUp: boolean) => Promise<void>;
  onContinueAsGuest?: () => void;
  error?: string | null;
  loading?: boolean;
  language: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const MandatoryLoginGate: React.FC<MandatoryLoginGateProps> = ({
  onSignInWithGoogle,
  onEngineerSignIn,
  onEmailPasswordSignIn,
  onContinueAsGuest,
  error,
  loading = false,
  language,
  onSelectLanguage,
  theme,
  onToggleTheme,
}) => {
  const t = (key: string) => getTranslation(language, key);

  // Email login mode: standard password vs quick engineer email token
  const [usePasswordless, setUsePasswordless] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleEmailPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (!usePasswordless && passwordInput.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }
    setLocalError(null);
    setSubmitting(true);
    try {
      if (usePasswordless || !onEmailPasswordSignIn) {
        // Fast direct authorized engineer session
        if (onEngineerSignIn) {
          onEngineerSignIn({
            email: cleanEmail,
            displayName: customNameInput.trim() || cleanEmail.split('@')[0],
            role: 'engineer',
          });
        }
      } else {
        await onEmailPasswordSignIn(cleanEmail, passwordInput, isSignUp);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error || localError;

  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col justify-between items-center p-4 sm:p-6 sm:py-8 transition-colors duration-300 ${
      theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-black text-slate-100'
    }`}>
      
      {/* Top Header: Brand & Status */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 px-4 rounded-2xl bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md shadow-xl mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sun className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-white">
              Farm<span className="text-amber-400">.</span><span className="text-cyan-400">IOT</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono ml-2 hidden sm:inline">
              Solar + ESP32 Microgrid
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">Secure Gate</span>
          </div>

          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Main Login Gate Card */}
      <main className="max-w-md w-full mx-auto my-4 space-y-4 animate-fadeIn">
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          
          {/* Ambient Glows */}
          <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-5">
            
            {/* Top Brand Banner */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Station Authentication</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Farm<span className="text-amber-400">.</span><span className="text-cyan-400">IOT</span> Console
              </h2>
              <p className="text-xs text-zinc-400 font-sans max-w-sm mx-auto">
                Sign in to monitor solar telemetry, control automated wiper cleaning, and sync physical ESP32 hardware.
              </p>
            </div>

            {/* Error Message if any */}
            {displayError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 text-left flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div>{displayError}</div>
                  {displayError.includes('unauthorized-domain') && (
                    <div className="text-[11px] text-amber-300">
                      💡 Tip: Use your email & password or direct email below if domain authorization is pending in Firebase console.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Primary Action: Google Sign In */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={onSignInWithGoogle}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm shadow-xl transition flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                <span>{loading ? 'Connecting Google Account...' : 'Sign In with Google Account'}</span>
              </button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <span className="relative px-3 bg-zinc-950 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Or Sign In With Email
                </span>
              </div>

              {!showEmailForm ? (
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <span>Use Email & Password</span>
                </button>
              ) : (
                <form onSubmit={handleEmailPassSubmit} className="space-y-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 text-left animate-fadeIn">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                    <span className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>{usePasswordless ? 'Direct Email Access' : (isSignUp ? 'Create Station Account' : 'Email Authentication')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setUsePasswordless(!usePasswordless)}
                      className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                    >
                      {usePasswordless ? 'Switch to Password' : 'No Password? Click here'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-zinc-400">Email Address</label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="youremail@gmail.com"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-black border border-zinc-700 text-white placeholder-zinc-500 text-xs font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {!usePasswordless && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                        <span>Password</span>
                        <span className="text-[10px] text-zinc-500">Min 6 characters</span>
                      </label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-black border border-zinc-700 text-white placeholder-zinc-500 text-xs font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  )}

                  {isSignUp && !usePasswordless && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-zinc-400">Display Name</label>
                      <input
                        type="text"
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-3 py-2 rounded-xl bg-black border border-zinc-700 text-white placeholder-zinc-500 text-xs font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="rememberDevice"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                    />
                    <label htmlFor="rememberDevice" className="text-[11px] font-mono text-zinc-400 cursor-pointer">
                      Remember this browser session
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs font-mono transition shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>{usePasswordless ? 'Access Console' : (isSignUp ? 'Create Account' : 'Sign In')}</span>
                      </>
                    )}
                  </button>

                  {!usePasswordless && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-[10px] font-mono text-zinc-400 hover:text-amber-300 transition cursor-pointer"
                      >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                      </button>
                    </div>
                  )}
                </form>
              )}

              {onContinueAsGuest && (
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-cyan-400 text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Continue as Guest (Live Monitoring)</span>
                </button>
              )}
            </div>

            {/* Hardware & Cloud Health Badge */}
            <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>ESP32 Target: <strong className="text-zinc-300">node_01</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Firestore Cloud Ready</span>
              </div>
            </div>

            {/* Language Quick Selector */}
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                <span>Language / भाषा:</span>
                <span>Active: {language.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap text-[11px] font-mono">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => onSelectLanguage(l.code)}
                    className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                      language === l.code
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800/80'
                    }`}
                  >
                    {l.flag} {l.nativeName}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs font-mono text-zinc-500 py-2 mt-auto">
        Farm.IOT Microgrid • Smart Solar Photovoltaic & Microcontroller Station
      </footer>

    </div>
  );
};

export const FirebaseAuthPortal = MandatoryLoginGate;

