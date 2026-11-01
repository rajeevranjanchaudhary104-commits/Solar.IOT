import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  ShieldCheck, 
  Database, 
  Zap, 
  X, 
  HelpCircle, 
  Layers,
  ArrowDownToLine,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  Radio,
  FileCode
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'nav' | 'banner' | 'mobile' | 'button_only';
  userEmail?: string | null;
  onOpenArduinoTools?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'nav', 
  userEmail,
  onOpenArduinoTools
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'apk' | 'pwa' | 'instructions'>('apk');
  const [downloadStarted, setDownloadStarted] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const apkUrl = '/api/download/apk';
  const apkFileName = 'Farm_IOT_SmartStation_v2.4.apk';

  const handleDownloadApk = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = apkUrl;
    link.download = apkFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadStarted(false);
    }, 4000);
  };

  const handleCopyApkLink = () => {
    const fullUrl = `${window.location.origin}${apkUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePwaInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setShowModal(false);
        return;
      }
    }
    setActiveTab('pwa');
    setShowModal(true);
  };

  return (
    <>
      {/* 1. Navigation Bar Variant */}
      {variant === 'nav' && (
        <button
          onClick={() => {
            setActiveTab('apk');
            setShowModal(true);
          }}
          title="Download Android APK or Install Farm.IOT Mobile App"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 hover:from-emerald-500/30 hover:to-blue-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition cursor-pointer shadow-sm group select-none"
        >
          <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
          <span className="hidden md:inline font-mono">Download APK</span>
          <span className="md:hidden font-mono">APK</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
            v2.4
          </span>
        </button>
      )}

      {/* 2. Mobile Bar Variant */}
      {variant === 'mobile' && (
        <button
          onClick={() => {
            setActiveTab('apk');
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono cursor-pointer font-bold shadow-sm"
        >
          <ArrowDownToLine className="w-3 h-3 text-emerald-400" />
          <span>APK</span>
        </button>
      )}

      {/* 3. Button Only Variant */}
      {variant === 'button_only' && (
        <button
          onClick={() => {
            setActiveTab('apk');
            setShowModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Download Android APK (v2.4)</span>
        </button>
      )}

      {/* 4. Full Banner Variant (for Home Page / Live Dashboard) */}
      {variant === 'banner' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-cyan-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 font-bold">
                Android Package (.apk) Available
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">Farm.IOT Mobile Edition</span>
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-white">
              Download Farm.IOT APK for Android Phone
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Install the standalone Android application directly onto your smartphone. Includes live ESP32 tachometers, motorized squeegee wiper remote sweep, and 2-way Firebase synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setActiveTab('apk');
                setShowModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download APK</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('pwa');
                setShowModal(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>PWA Install</span>
            </button>
          </div>
        </div>
      )}

      {/* APK & App Download Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl p-5 sm:p-7 shadow-2xl space-y-5 my-6 text-left animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                    Farm.IOT Mobile Application
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      v2.4.0 Release
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans">
                    Choose your preferred install method: Direct Android APK or 1-Tap PWA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('apk')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 font-bold cursor-pointer ${
                  activeTab === 'apk'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Android APK (.apk)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pwa')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 font-bold cursor-pointer ${
                  activeTab === 'pwa'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>1-Tap PWA (Browser)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('instructions')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 font-bold cursor-pointer ${
                  activeTab === 'instructions'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>How to Install</span>
              </button>
            </div>

            {/* Tab 1: Android APK Download */}
            {activeTab === 'apk' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-zinc-900 border border-emerald-500/30 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Farm_IOT_SmartStation_v2.4.apk</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                          Universal ARM64 / x86
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Compatible with Android 7.0 to Android 15+. Includes full ESP32 telemetry listeners and remote wiper switch.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <button
                      onClick={handleDownloadApk}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 font-black text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloadStarted ? 'Downloading APK Package...' : 'Download Android APK Now'}</span>
                    </button>
                    <button
                      onClick={handleCopyApkLink}
                      className="py-3 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="Copy Direct APK Download Link"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Sideload Steps */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Quick Sideload Guide for Android</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal list-inside pl-1">
                    <li>Tap <strong>Download Android APK Now</strong> above to save the <code className="text-emerald-300 font-mono">.apk</code> file.</li>
                    <li>If Chrome warns <em>"File might be harmful"</em>, tap <strong>"Download anyway"</strong> (standard Android security notice for direct downloads).</li>
                    <li>Open your notification drawer or Downloads folder and tap the APK file.</li>
                    <li>Tap <strong>Install</strong> (if prompted, toggle <em>"Allow from this source"</em>).</li>
                    <li>Launch <strong>Farm.IOT</strong> from your home screen app drawer!</li>
                  </ol>
                </div>

                {/* Cloud & Hardware Reassurance */}
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 font-mono">
                  <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Connects 100% identically to your synced Firebase cloud and live ESP32 station.</span>
                </div>
              </div>
            )}

            {/* Tab 2: 1-Tap PWA (Browser Instant Install) */}
            {activeTab === 'pwa' && (
              <div className="space-y-4 animate-fadeIn">
                {isInstallable ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-zinc-900 border border-cyan-500/30 space-y-3">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span>1-Tap Instant WebAPK Installation</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Your browser supports instant native packaging. Clicking below adds Farm.IOT directly to your Android app drawer without any "unknown source" warnings.
                    </p>
                    <button
                      onClick={handlePwaInstall}
                      className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install App Now (1-Tap WebAPK)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-amber-400" />
                      <span>Browser Home Screen Installation</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {isIOS ? (
                        <>On iPhone / iPad: Tap the <strong>Share</strong> button (<Share className="w-3.5 h-3.5 inline text-cyan-400" />) at the bottom of Safari, scroll down and select <strong>"Add to Home Screen"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-cyan-400" />).</>
                      ) : (
                        <>On Android Chrome: Tap the three dots menu (<strong>⋮</strong>) in the top-right corner of Chrome, then tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</>
                      )}
                    </p>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-2 text-xs text-zinc-400 font-mono">
                  <div className="text-white font-bold flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Why install as an App?</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-[11px]">
                    <li>Full-screen display without browser address bars</li>
                    <li>Instant launch right from your phone's home screen</li>
                    <li>Persistent login session with Google / Owner privileges</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 3: Detailed Instructions & Arduino Hardware Link */}
            {activeTab === 'instructions' && (
              <div className="space-y-3.5 animate-fadeIn text-xs">
                <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  <div className="font-bold text-white flex items-center gap-1.5 font-mono text-[11px]">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Difference between APK and PWA:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800">
                      <div className="font-bold text-emerald-400 mb-0.5">Standalone .APK</div>
                      <p className="text-zinc-400">Direct Android package file that you can download, share via WhatsApp/Bluetooth, and install offline without Google Play.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800">
                      <div className="font-bold text-cyan-400 mb-0.5">1-Tap PWA</div>
                      <p className="text-zinc-400">Zero-warning installation directly through Chrome or Safari that automatically updates whenever new features are pushed.</p>
                    </div>
                  </div>
                </div>

                {onOpenArduinoTools && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-emerald-300 text-[11px] font-mono">Setting up Station Hardware?</div>
                      <div className="text-[11px] text-zinc-400">Need Arduino IDE, USB drivers (CH340/CP2102), and ESP32 code?</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        onOpenArduinoTools();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer shrink-0"
                    >
                      Arduino IDE & Tools →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
              <div className="text-[11px] text-zinc-500 font-mono">
                Package: <code className="text-zinc-400">com.solariot.station</code>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-mono transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
