import { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept transient Firestore offline reconnect warnings so they do not crash the preview runtime
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('@firebase/firestore') ||
    msg.includes('code=unavailable') ||
    msg.includes('client is offline')
  ) {
    console.warn('[Firestore Connection Handler]:', ...args);
    return;
  }
  originalConsoleError(...args);
};

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason?.message || String(reason || '');
  if (
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('client is offline') ||
    msg.includes('unavailable') ||
    msg.includes('Failed to fetch')
  ) {
    // Suppress unhandled network rejections from blanking the screen
    event.preventDefault();
    console.warn('[Network Handler]: Suppressed transient fetch/reconnection rejection:', msg);
  }
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RootErrorBoundary] Caught uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-black">
              ⚠️
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Application Refresh Required</h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The application encountered a transient error while initializing. You can reload or reset the session cache.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="text-left bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Reload App
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-700 transition cursor-pointer"
              >
                Reset Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('Target root element #root was not found in document');
}
