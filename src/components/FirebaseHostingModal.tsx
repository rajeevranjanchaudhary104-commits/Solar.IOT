import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Server, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  Cpu, 
  FileCode, 
  Info, 
  CheckCircle2, 
  Zap,
  Globe,
  X,
  Radio,
  ArrowRight,
  Download,
  AlertTriangle,
  Link,
  FileArchive
} from 'lucide-react';
import { 
  hardwareProjectConfig, 
  getSecondaryFirebaseConfig, 
  saveSecondaryFirebaseConfig, 
  clearSecondaryFirebaseConfig,
  SecondaryFirebaseConfig 
} from '../lib/firebase';

interface FirebaseHostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  espConnected?: boolean;
}

export const FirebaseHostingModal: React.FC<FirebaseHostingModalProps> = ({
  isOpen,
  onClose,
  espConnected = true
}) => {
  const [secondaryProjectId, setSecondaryProjectId] = useState<string>('solariot-f49f5');
  const [customDomain, setCustomDomain] = useState<string>('www.farm-iot.com');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bundle' | 'domain' | 'guide' | 'cli' | 'configs' | 'status'>('bundle');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const existing = getSecondaryFirebaseConfig();
    if (existing?.projectId) {
      setSecondaryProjectId(existing.projectId);
    } else {
      setSecondaryProjectId('solariot-f49f5');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveSecondaryConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = secondaryProjectId.trim().toLowerCase();
    if (!cleanId) {
      clearSecondaryFirebaseConfig();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      return;
    }

    const cfg: SecondaryFirebaseConfig = {
      projectId: cleanId,
      authDomain: `${cleanId}.firebaseapp.com`,
      storageBucket: `${cleanId}.firebasestorage.app`
    };
    saveSecondaryFirebaseConfig(cfg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const targetProjectId = secondaryProjectId.trim() || 'YOUR_SECONDARY_PROJECT_ID';

  const cliCommands = {
    install: 'npm install -g firebase-tools',
    login: 'firebase login:add',
    list: 'firebase projects:list',
    deploy: `firebase deploy --only hosting --project ${targetProjectId}`,
    quickScriptUnix: `./scripts/deploy-firebase-hosting.sh ${secondaryProjectId.trim() ? targetProjectId : ''}`.trim(),
    quickScriptWin: `scripts\\deploy-firebase-hosting.bat ${secondaryProjectId.trim() ? targetProjectId : ''}`.trim()
  };

  const firebaseJsonContent = `{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}`;

  const firebasercContent = `{
  "projects": {
    "default": "${hardwareProjectConfig.projectId}",
    "secondary": "${targetProjectId}"
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Firebase Hosting & Deployment Hub</h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Dual-Project Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Host this web dashboard on your secondary Firebase account without breaking live hardware telemetry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual-Project Continuity Banner */}
        <div className="px-6 py-3 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-amber-950/30 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-cyan-300">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Hardware IoT Project:</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-cyan-200">{hardwareProjectConfig.projectId}</code>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              NodeMCU Live
            </span>
          </div>

          <div className="flex items-center gap-2 text-amber-300">
            <Globe className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Hosting Target:</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-amber-200">{targetProjectId}</code>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 gap-2 sm:gap-4 text-xs sm:text-sm font-medium overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('bundle')}
            className={`py-3 px-1 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bundle'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Download & 1-Click Deploy
          </button>
          <button
            onClick={() => setActiveTab('domain')}
            className={`py-3 px-1 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'domain'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            Custom Domain (.com / .in)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-1 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            3-Step Guide
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`py-3 px-1 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cli'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            CLI Deploy
          </button>
          <button
            onClick={() => setActiveTab('configs')}
            className={`py-3 px-1 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'configs'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Configs
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-1 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'status'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Dual-Project Routing
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Quick Config Form */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <form onSubmit={handleSaveSecondaryConfig} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter Your Secondary Firebase Project ID:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={secondaryProjectId}
                    onChange={(e) => setSecondaryProjectId(e.target.value)}
                    placeholder="e.g. farm-iot-production-98210"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg transition flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-900" />
                    Saved!
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Update Project ID
                  </>
                )}
              </button>
            </form>
            <p className="text-[11px] text-slate-400 mt-2">
              Found in your Firebase Console URL: <code className="text-amber-300 font-mono">console.firebase.google.com/project/&lt;project-id&gt;</code>. Typing here automatically customizes all deployment commands below.
            </p>
          </div>

          {/* TAB 0: DOWNLOAD & 1-CLICK DEPLOY */}
          {activeTab === 'bundle' && (
            <div className="space-y-5">
              {/* Hero Download Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider border border-emerald-500/30">
                        Pre-Built & Tested
                      </span>
                      <span className="text-xs text-slate-400">Target: <strong className="text-white font-mono">{targetProjectId}</strong></span>
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Farm.IOT Production Deployment Bundle
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                      Includes the fully compiled dashboard (<code className="text-emerald-300 font-mono">dist/</code>), Firebase configuration, and automated 1-click deploy scripts for Windows (<code className="text-emerald-300 font-mono">deploy.bat</code>) and Mac/Linux (<code className="text-emerald-300 font-mono">deploy.sh</code>).
                    </p>
                  </div>

                  <a
                    href="/api/download/deploy-bundle"
                    download="solariot_deploy_bundle.zip"
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center gap-2.5 transition shadow-lg shadow-emerald-500/20 shrink-0"
                  >
                    <Download className="w-5 h-5 text-slate-950" />
                    <span>Download Bundle (.ZIP)</span>
                    <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded text-slate-900 font-mono">725 KB</span>
                  </a>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
                    solariot_deploy_bundle.zip
                  </span>
                  <span>•</span>
                  <span>Pre-compiled static assets</span>
                  <span>•</span>
                  <span>Zero build tools required on your PC</span>
                </div>
              </div>

              {/* Step-by-Step Execution Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs mb-2.5">
                    1
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">Extract Folder</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Download the ZIP file above and extract all contents to any folder on your computer.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs mb-2.5">
                    2
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">Run Deploy Script</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2">
                    Double-click <code className="text-cyan-300 font-mono">deploy.bat</code> (Windows) or execute <code className="text-cyan-300 font-mono">bash deploy.sh</code> (Mac/Linux).
                  </p>
                  <p className="text-[11px] text-slate-500">
                    *Requires Node.js from <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-cyan-400 underline">nodejs.org</a>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs mb-2.5">
                    3
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">Sign In & Go Live</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    A browser window will open. Sign in to your secondary Google account (<strong className="text-amber-300">farmiotest</strong>) to publish your site worldwide in 15 seconds!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CUSTOM DOMAIN (.COM / .IN) SETUP */}
          {activeTab === 'domain' && (
            <div className="space-y-5">
              {/* Alert: Fixing ACME Challenge Error from Screenshot */}
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  Fixing ACME Challenge Error: &quot;60.205.16.3: Request failed&quot;
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  If your Firebase console shows a red error like <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded font-mono">ACME challenge failed: 60.205.16.3</code>, this occurs because your domain registrar still has an old server IP (<code className="text-amber-300 font-mono">60.205.16.3</code>) listed in your DNS records.
                </p>
                <p className="text-xs text-emerald-300 font-medium">
                  Fix: Delete the old <strong>A</strong> record pointing to <code className="text-amber-300 font-mono">60.205.16.3</code> in your domain manager, and replace it with the Firebase records below.
                </p>
              </div>

              {/* Domain Input & DNS Record Tables */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      Required DNS Records for Your Custom Domain
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Enter these records into your domain registrar (GoDaddy, Namecheap, Cloudflare, Google Domains):
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="e.g. www.farm-iot.com"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder-slate-500 w-44"
                    />
                  </div>
                </div>

                {/* Record 1: CNAME for www */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px]">RECORD 1</span>
                      CNAME Record (For www subdomain)
                    </span>
                    <button
                      onClick={() => handleCopy(`${targetProjectId}.web.app`, 'cnameVal')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedKey === 'cnameVal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Target
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-sans">Type</span>
                      <strong className="text-white">CNAME</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-sans">Name / Host</span>
                      <span className="text-cyan-300">www</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-sans">Value / Target</span>
                      <span className="text-amber-300 truncate block">{targetProjectId}.web.app</span>
                    </div>
                  </div>
                </div>

                {/* Record 2: Apex domain note */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px]">RECORD 2</span>
                      A Records (For apex root domain without www)
                    </span>
                    <span className="text-[11px] text-slate-400">Provided by Firebase Console</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    If you also want visitors typing <code className="text-white font-mono">farm-iot.com</code> or <code className="text-white font-mono">farm-iot.in</code> directly (without www) to reach your app, Firebase will give you two Google IP addresses (e.g. <code className="text-cyan-300 font-mono">199.36.158.100</code>). Add them as type <strong>A</strong> with Name <strong>@</strong>.
                  </p>
                </div>

                {/* Free Instant Alternative */}
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-emerald-300 block">Instant Free Domains (No DNS setup required)</span>
                    <span className="text-slate-400 text-[11px]">These URLs work immediately once you run the deploy script:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://${targetProjectId}.web.app`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 text-cyan-300 flex items-center gap-1.5 font-mono text-xs"
                    >
                      <span>{targetProjectId}.web.app</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 1: 3-STEP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm mb-3">
                      1
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">Add Secondary Account</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Log in to your secondary Google account in your terminal using the Firebase CLI.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleCopy(cliCommands.login, 'login')}
                      className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-amber-300 flex items-center justify-between transition"
                    >
                      <span className="truncate">{cliCommands.login}</span>
                      {copiedKey === 'login' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-sm mb-3">
                      2
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">Build Web Dashboard</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Compile fresh, production-ready static bundles into the <code className="text-cyan-300 font-mono">dist/</code> directory.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleCopy('npm run build', 'build')}
                      className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-cyan-300 flex items-center justify-between transition"
                    >
                      <span>npm run build</span>
                      {copiedKey === 'build' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm mb-3">
                      3
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">Deploy to Firebase</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Upload your app to Firebase Hosting with custom SSL and global CDN.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleCopy(cliCommands.deploy, 'deploy')}
                      className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-emerald-300 flex items-center justify-between transition"
                    >
                      <span className="truncate">{cliCommands.deploy}</span>
                      {copiedKey === 'deploy' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Automated Script Section */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">One-Command Automated Script</h4>
                  </div>
                  <span className="text-[11px] text-slate-400">Builds & Deploys in 1 click</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                    <span className="text-amber-400">{cliCommands.quickScriptUnix}</span>
                    <button
                      onClick={() => handleCopy(cliCommands.quickScriptUnix, 'scriptUnix')}
                      className="ml-2 p-1 text-slate-400 hover:text-white transition"
                      title="Copy Linux / Mac command"
                    >
                      {copiedKey === 'scriptUnix' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                    <span className="text-cyan-400">{cliCommands.quickScriptWin}</span>
                    <button
                      onClick={() => handleCopy(cliCommands.quickScriptWin, 'scriptWin')}
                      className="ml-2 p-1 text-slate-400 hover:text-white transition"
                      title="Copy Windows command"
                    >
                      {copiedKey === 'scriptWin' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CLI COMMANDS */}
          {activeTab === 'cli' && (
            <div className="space-y-4">
              <div className="space-y-3">
                
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>1. Install Firebase Tools (if not already installed)</span>
                    <button 
                      onClick={() => handleCopy(cliCommands.install, 'inst')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {copiedKey === 'inst' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                    {cliCommands.install}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>2. Add and Switch to your Secondary Google Account</span>
                    <button 
                      onClick={() => handleCopy(cliCommands.login, 'log')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {copiedKey === 'log' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                    {cliCommands.login}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>3. Verify Available Projects in Secondary Account</span>
                    <button 
                      onClick={() => handleCopy(cliCommands.list, 'lst')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {copiedKey === 'lst' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                    {cliCommands.list}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>4. Deploy Web Dashboard Directly to Secondary Account</span>
                    <button 
                      onClick={() => handleCopy(cliCommands.deploy, 'dep')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {copiedKey === 'dep' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                    {cliCommands.deploy}
                  </pre>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: CONFIG FILES */}
          {activeTab === 'configs' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    firebase.json (Configured in project root)
                  </span>
                  <button
                    onClick={() => handleCopy(firebaseJsonContent, 'fjson')}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-xs"
                  >
                    {copiedKey === 'fjson' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy firebase.json
                  </button>
                </div>
                <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-48">
                  {firebaseJsonContent}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    .firebaserc (Configured in project root)
                  </span>
                  <button
                    onClick={() => handleCopy(firebasercContent, 'frc')}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs"
                  >
                    {copiedKey === 'frc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy .firebaserc
                  </button>
                </div>
                <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                  {firebasercContent}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: DUAL-PROJECT ROUTING */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Dual-Project Isolation Guarantee
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your hardware sensors (INA219, LM35, Windmill RPM, Motorized Squeegee) continue sending telemetry to <code className="text-cyan-300 font-mono">red-access-fpthm</code> without any interruption.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                      Hardware Microgrid Telemetry
                    </div>
                    <div className="text-xs font-mono text-white mb-1">
                      Project: {hardwareProjectConfig.projectId}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Collection: <code className="text-cyan-200">solar_iot/node_01</code>
                    </div>
                    <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Direct REST PATCH active
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                      Web Hosting (Frontend)
                    </div>
                    <div className="text-xs font-mono text-white mb-1">
                      Target: {targetProjectId}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Domain: <code className="text-amber-200">{targetProjectId}.web.app</code>
                    </div>
                    <div className="mt-2 text-xs text-amber-300 flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5" /> Serves compiled static SPA
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Ready for deployment: <code className="text-slate-300 font-mono">npm run build</code> generates standard static files.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
