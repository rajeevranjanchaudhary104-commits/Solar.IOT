import React, { useState } from 'react';
import { 
  Sun, 
  LogIn, 
  X, 
  KeyRound, 
  Mail, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

interface AuthModalProps {
  onSignInWithGoogle: () => void;
  onEngineerSignIn?: (profile: { email: string; displayName: string; role?: string }) => void;
  onEmailPasswordSignIn?: (email: string, pass: string, isSignUp: boolean) => Promise<void>;
  onClose?: () => void;
  error?: string | null;
  loading?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSignInWithGoogle,
  onEngineerSignIn,
  onEmailPasswordSignIn,
  onClose,
  error,
  loading = false,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [usePasswordless, setUsePasswordless] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEmailPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
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
        if (onEngineerSignIn) {
          onEngineerSignIn({
            email: clean,
            displayName: customNameInput.trim() || clean.split('@')[0],
            role: 'engineer',
          });
        }
      } else {
        await onEmailPasswordSignIn(clean, passwordInput, isSignUp);
      }
      if (onClose) onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Authentication error');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-400 mb-1 shadow-inner">
            <Sun className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Farm<span className="text-amber-400">.</span><span className="text-cyan-400">IOT</span> Access
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Sign in with your Google account or email
            </p>
          </div>

          {displayError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Primary Action: Google Sign In */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={onSignInWithGoogle}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg transition flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50 font-mono"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>{loading ? 'Connecting Google...' : 'Sign In with Google Account'}</span>
            </button>

            <div className="relative my-3 text-center">
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
                className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                <span>Use Email & Password</span>
              </button>
            ) : (
              <form onSubmit={handleEmailPassSubmit} className="space-y-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-left animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                  <span className="text-[11px] font-mono font-bold text-zinc-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>{usePasswordless ? 'Direct Email Access' : (isSignUp ? 'Create Account' : 'Email Sign In')}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUsePasswordless(!usePasswordless)}
                    className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                  >
                    {usePasswordless ? 'With Password' : 'No Password?'}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-400">Email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="youremail@gmail.com"
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-black border border-zinc-700 text-white placeholder-zinc-500 text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {!usePasswordless && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400">Password</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-3 py-1.5 rounded-lg bg-black border border-zinc-700 text-white placeholder-zinc-500 text-xs font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                {isSignUp && !usePasswordless && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400">Name</label>
                    <input
                      type="text"
                      value={customNameInput}
                      onChange={(e) => setCustomNameInput(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-3 py-1.5 rounded-lg bg-black border border-zinc-700 text-white placeholder-zinc-500 text-xs font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="w-full py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs font-mono transition shadow cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50 mt-1"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{usePasswordless ? 'Continue' : (isSignUp ? 'Create' : 'Sign In')}</span>
                    </>
                  )}
                </button>

                {!usePasswordless && (
                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-[10px] font-mono text-zinc-400 hover:text-amber-300 transition cursor-pointer"
                    >
                      {isSignUp ? 'Have an account? Sign In' : 'Need an account? Create one'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
