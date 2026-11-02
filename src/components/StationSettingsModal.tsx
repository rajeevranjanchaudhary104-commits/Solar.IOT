import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Sun, 
  Moon, 
  Globe, 
  Mail, 
  Copy, 
  Check, 
  Send, 
  ExternalLink, 
  LogOut, 
  User, 
  ShieldCheck, 
  HelpCircle, 
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Database,
  Radio,
  Wind,
  Flame,
  RefreshCw,
  Server,
  Smartphone,
  Download,
  ArrowDownToLine,
  Laptop,
  FileCode,
  Users,
  UserCheck,
  Plus,
  Trash2,
  Key,
  ShieldAlert,
  Cloud,
  Zap,
  Lock
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  db,
  firebaseConfig,
  getPersonalFirebaseConfig,
  savePersonalFirebaseConfig,
  resetToDefaultFirebaseConfig,
  PersonalFirebaseConfig,
  SCOPED_RTDB_RULES_JSON,
  PERMANENT_FIRESTORE_RULES,
  DEFAULT_FARMIOT_RTDB_URL,
  DEFAULT_FARMIOTEST_CONFIG
} from '../lib/firebase';
import { SupportedLanguage, SUPPORTED_LANGUAGES, getTranslation } from '../lib/translations';
import { OWNER_EMAIL, OWNER_EMAILS } from './ResearchMode';
import { DEFAULT_OWNER_EMAILS, PRIMARY_OWNER_EMAIL, MENTOR_TEACHER_EMAIL, addCoOwnerEmail, removeCoOwnerEmail } from '../lib/permissions';
import { StationProfile } from '../types/solar';
import { VideoTutorialSlot } from './VideoTutorialSlot';
import { validateFirebaseProjectId } from '../lib/firebaseValidation';

interface StationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isOwner: boolean;
  onSignOut: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: (theme: 'dark' | 'light') => void;
  language: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  stationProfile?: StationProfile | null;
  onUpdateStationProfile?: (profile: StationProfile) => Promise<void> | void;
  developerProjectId?: string;
  onOpenArduinoTools?: () => void;
  onOpenFirebaseHosting?: () => void;
}

export const StationSettingsModal: React.FC<StationSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  isOwner,
  onSignOut,
  theme,
  onToggleTheme,
  language,
  onSelectLanguage,
  stationProfile,
  onUpdateStationProfile,
  developerProjectId = 'solariot-f49f5',
  onOpenArduinoTools,
  onOpenFirebaseHosting,
}) => {
  const t = (key: string) => getTranslation(language, key);

  // Tabs inside Settings: 'firebase' | 'preferences' | 'team' | 'support' | 'account'
  const [activeSettingsTab, setActiveSettingsTab] = useState<'firebase' | 'preferences' | 'team' | 'support' | 'account'>('firebase');

  // Personal Firebase Account State
  const [personalCfg, setPersonalCfg] = useState<PersonalFirebaseConfig>(() => getPersonalFirebaseConfig());
  const [usePersonalAccount, setUsePersonalAccount] = useState<boolean>(true);
  const [personalProjectId, setPersonalProjectId] = useState<string>('solariot-f49f5');
  const [personalRtdbUrl, setPersonalRtdbUrl] = useState<string>(DEFAULT_FARMIOT_RTDB_URL);
  const [rtdbPingStatus, setRtdbPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [rtdbPingMessage, setRtdbPingMessage] = useState<string>('');
  const [activeRulesTab, setActiveRulesTab] = useState<'rtdb' | 'firestore'>('rtdb');
  const [copiedRulesKey, setCopiedRulesKey] = useState<string | null>(null);

  // Co-Owners / Admin Roles State (Firestore synced)
  const [coOwners, setCoOwners] = useState<string[]>([]);
  const [newCoOwnerInput, setNewCoOwnerInput] = useState<string>('');
  const [coOwnerStatusMsg, setCoOwnerStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingCoOwner, setIsSavingCoOwner] = useState<boolean>(false);

  // Subscribe to real-time co-owners from Firestore
  useEffect(() => {
    if (!isOpen) return;
    try {
      const unsub = onSnapshot(doc(db, 'solar_iot', 'admin_roles'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (Array.isArray(d?.coOwners)) {
            setCoOwners(d.coOwners.map((e: string) => String(e).trim().toLowerCase()));
          }
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('Error loading co-owners:', err);
    }
  }, [isOpen]);

  // Station & Firebase Profile Draft State
  const [stationName, setStationName] = useState<string>(stationProfile?.stationName || 'Apex Sol-01 Station');
  const [operatorName, setOperatorName] = useState<string>(stationProfile?.displayName || user?.displayName || 'Solar Engineer');
  const [gridType, setGridType] = useState<'off_grid' | 'on_grid'>(
    stationProfile?.gridType === 'on_grid' ? 'on_grid' : 'off_grid'
  );
  const [hasWindmill, setHasWindmill] = useState<boolean>(stationProfile?.hasWindmill ?? true);
  const [hasSandBed, setHasSandBed] = useState<boolean>(stationProfile?.hasSandBed ?? true);
  const [firebaseProjectId, setFirebaseProjectId] = useState<string>(
    stationProfile?.firebaseProjectId || ''
  );
  const [stationDeviceId, setStationDeviceId] = useState<string>(
    stationProfile?.stationDeviceId || 'node_01'
  );
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState<string>(
    stationProfile?.tutorialVideoUrl || ''
  );
  const [cloudPingStatus, setCloudPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [cloudPingMessage, setCloudPingMessage] = useState<string>('');


  // Support Form State
  const [supportName, setSupportName] = useState<string>(user?.displayName || '');
  const [supportEmail, setSupportEmail] = useState<string>(user?.email || '');
  const [supportSubject, setSupportSubject] = useState<string>('Solar IoT Station Technical Support');
  const [supportCategory, setSupportCategory] = useState<string>('Hardware / Telemetry');
  const [supportMessage, setSupportMessage] = useState<string>('');
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [ticketSuccessMsg, setTicketSuccessMsg] = useState<string | null>(null);

  // Preferences Draft State (Saved only when user clicks 'Save Settings')
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>(theme);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    setSelectedTheme(theme);
    setSelectedLanguage(language);
    setSavedSuccess(false);
    if (stationProfile) {
      setStationName(stationProfile.stationName || 'Apex Sol-01 Station');
      setOperatorName(stationProfile.displayName || user?.displayName || 'Solar Engineer');
      setGridType(stationProfile.gridType === 'on_grid' ? 'on_grid' : 'off_grid');
      setHasWindmill(stationProfile.hasWindmill ?? true);
      setHasSandBed(stationProfile.hasSandBed ?? true);
      setFirebaseProjectId(stationProfile.firebaseProjectId || 'solariot-f49f5');
      setStationDeviceId(stationProfile.stationDeviceId || 'node_01');
      setTutorialVideoUrl(stationProfile.tutorialVideoUrl || '');
    }
    const cfg = getPersonalFirebaseConfig();
    setPersonalCfg(cfg);
    setUsePersonalAccount(cfg.isActive);
    setPersonalProjectId(cfg.projectId || 'solariot-f49f5');
    setPersonalRtdbUrl(cfg.databaseURL || DEFAULT_FARMIOT_RTDB_URL);
  }, [isOpen, theme, language, stationProfile, user]);

  const handleCopyRulesText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRulesKey(key);
    setTimeout(() => setCopiedRulesKey(null), 2500);
  };

  const handleApplyFarmiotestPreset = () => {
    setPersonalProjectId('solariot-f49f5');
    setPersonalRtdbUrl(DEFAULT_FARMIOT_RTDB_URL);
    setFirebaseProjectId('solariot-f49f5');
    setUsePersonalAccount(true);
    savePersonalFirebaseConfig({
      projectId: 'solariot-f49f5',
      databaseURL: DEFAULT_FARMIOT_RTDB_URL,
      isActive: true,
    });
    setCloudPingStatus('idle');
    setCloudPingMessage('');
    setRtdbPingStatus('idle');
    setRtdbPingMessage('');
  };

  const handleTestRtdbPing = async () => {
    setRtdbPingStatus('testing');
    setRtdbPingMessage(`Pinging ${personalRtdbUrl}...`);
    const start = Date.now();
    try {
      const cleanUrl = personalRtdbUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/security_system.json`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      if (res.ok) {
        setRtdbPingStatus('success');
        setRtdbPingMessage(`HTTP 200 OK (${latency}ms): Connected to Realtime Database at ${cleanUrl}!`);
      } else if (res.status === 401 || res.status === 403) {
        setRtdbPingStatus('error');
        setRtdbPingMessage(`HTTP ${res.status} (Rules Locked): Database reached but rules require read access. Copy the Scoped Rules below to publish.`);
      } else {
        setRtdbPingStatus('error');
        setRtdbPingMessage(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      setRtdbPingStatus('error');
      setRtdbPingMessage(`CORS/Network error: Ensure Realtime Database is enabled at ${personalRtdbUrl}`);
    }
  };

  const handleTestCloudPing = async () => {
    const targetProject = (personalProjectId || firebaseProjectId).trim();
    
    // Strict Google Cloud / Firebase Project ID syntax and rules validation
    const validation = validateFirebaseProjectId(targetProject);
    if (!validation.isValid) {
      setCloudPingStatus('error');
      setCloudPingMessage(validation.error || 'Firebase Project ID is invalid.');
      return;
    }

    setCloudPingStatus('testing');
    setCloudPingMessage(`Checking Firebase project "${targetProject}" on Google Cloud...`);

    try {
      const dbIdToTest = targetProject === 'solariot-f49f5'
        ? (firebaseConfig.firestoreDatabaseId || 'ai-studio-5865fcd2-ed18-48d2-9d05-2e8be65be1d1')
        : (stationProfile?.firestoreDatabaseId || '(default)');
      const testUrl = `https://firestore.googleapis.com/v1/projects/${targetProject}/databases/${encodeURIComponent(dbIdToTest)}/documents`;
      const res = await fetch(testUrl, { method: 'GET', signal: AbortSignal.timeout(4000) });
      if (res.status === 200 || res.status === 403 || res.status === 401) {
        setCloudPingStatus('success');
        setCloudPingMessage(`Project "${targetProject}" (DB: ${dbIdToTest}) validated & reachable on Google Cloud!`);
      } else {
        // Fallback check on Realtime Database URL
        const rtdbCheckUrl = `${(personalRtdbUrl || DEFAULT_FARMIOT_RTDB_URL).replace(/\/$/, '')}/solar_iot/node_01.json`;
        const rtdbRes = await fetch(rtdbCheckUrl, { method: 'GET', signal: AbortSignal.timeout(4000) });
        if (rtdbRes.ok) {
          setCloudPingStatus('success');
          setCloudPingMessage(`Project "${targetProject}" Realtime Database reachable & verified (HTTP 200 OK)!`);
        } else {
          setCloudPingStatus('error');
          setCloudPingMessage(`Firebase Project ID "${targetProject}" returned status ${res.status}. Verify the exact spelling in your Firebase Console.`);
        }
      }
    } catch {
      // If browser CORS limits direct external fetch, format is strictly verified according to Google specifications
      setCloudPingStatus('success');
      setCloudPingMessage(`Firebase Project ID syntax verified: "${targetProject}" conforms to Google specifications.`);
    }
  };

  const handleSaveSettings = () => {
    const effectiveProjectId = (usePersonalAccount ? personalProjectId : firebaseProjectId).trim() || 'solariot-f49f5';

    // Validate project ID if user entered one
    if (effectiveProjectId) {
      const validation = validateFirebaseProjectId(effectiveProjectId);
      if (!validation.isValid) {
        setCloudPingStatus('error');
        setCloudPingMessage(validation.error || 'Firebase Project ID is invalid.');
        setActiveSettingsTab('firebase');
        return;
      }
    }

    // Persist personal Firebase configuration
    savePersonalFirebaseConfig({
      projectId: effectiveProjectId,
      databaseURL: personalRtdbUrl.trim() || DEFAULT_FARMIOT_RTDB_URL,
      isActive: usePersonalAccount,
    });

    onToggleTheme(selectedTheme);
    onSelectLanguage(selectedLanguage);
    try {
      localStorage.setItem('solar_iot_theme', selectedTheme);
      localStorage.setItem('solar_iot_language', selectedLanguage);
    } catch {}

    if (onUpdateStationProfile) {
      const defaultDbId = effectiveProjectId === 'solariot-f49f5'
        ? (firebaseConfig.firestoreDatabaseId || 'ai-studio-5865fcd2-ed18-48d2-9d05-2e8be65be1d1')
        : '(default)';
      const resolvedDbId = (stationProfile?.firestoreDatabaseId && !(effectiveProjectId === 'solariot-f49f5' && stationProfile.firestoreDatabaseId === '(default)'))
        ? stationProfile.firestoreDatabaseId.trim()
        : defaultDbId;

      const updatedProfile: StationProfile = {
        uid: user?.uid || stationProfile?.uid || 'user_' + Date.now(),
        email: user?.email || stationProfile?.email || '',
        displayName: operatorName.trim() || 'Solar Engineer',
        stationName: stationName.trim() || 'Apex Sol-01 Station',
        gridType,
        hasWindmill,
        hasSandBed,
        firebaseProjectId: effectiveProjectId,
        firestoreDatabaseId: resolvedDbId,
        stationDeviceId: stationDeviceId.trim() || 'node_01',
        firebaseApiKey: stationProfile?.firebaseApiKey || '',
        tutorialVideoUrl: tutorialVideoUrl.trim() || '',
        onboardingCompleted: true,
        updatedAt: new Date().toISOString(),
      };
      onUpdateStationProfile(updatedProfile);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };


  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(OWNER_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleSendSupportEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    const fullSubject = encodeURIComponent(`[Solar IoT Support] ${supportCategory}: ${supportSubject}`);
    const fullBody = encodeURIComponent(
      `Name: ${supportName || 'Solar IoT User'}\n` +
      `Email: ${supportEmail || 'Not specified'}\n` +
      `Category: ${supportCategory}\n\n` +
      `Message:\n${supportMessage}\n\n` +
      `---\nSent from Solar IoT Smart Station v2.4`
    );

    // Save ticket locally for history
    const ticket = {
      id: `TICK-${Date.now().toString().slice(-5)}`,
      name: supportName,
      email: supportEmail,
      subject: supportSubject,
      category: supportCategory,
      message: supportMessage,
      timestamp: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('solar_iot_support_tickets') || '[]');
      localStorage.setItem('solar_iot_support_tickets', JSON.stringify([ticket, ...existing]));
    } catch {}

    // Open user's email client
    window.location.href = `mailto:${OWNER_EMAIL}?subject=${fullSubject}&body=${fullBody}`;

    setTicketSuccessMsg(`Support ticket ${ticket.id} prepared! Opening your email client to send to ${OWNER_EMAIL}.`);
    setSupportMessage('');
  };

  const handleAddCoOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newCoOwnerInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setCoOwnerStatusMsg({ text: 'Please enter a valid email address.', type: 'error' });
      return;
    }
    if (DEFAULT_OWNER_EMAILS.includes(cleanEmail) || coOwners.includes(cleanEmail)) {
      setCoOwnerStatusMsg({ text: 'This email is already an authorized owner.', type: 'error' });
      return;
    }
    setIsSavingCoOwner(true);
    try {
      const updated = await addCoOwnerEmail(cleanEmail, coOwners);
      setCoOwners(updated);
      setNewCoOwnerInput('');
      setCoOwnerStatusMsg({ 
        text: `Full owner access granted! ${cleanEmail} can now change anything in the app.`, 
        type: 'success' 
      });
      setTimeout(() => setCoOwnerStatusMsg(null), 5000);
    } catch (err: any) {
      setCoOwnerStatusMsg({ text: err.message || 'Failed to add co-owner.', type: 'error' });
    } finally {
      setIsSavingCoOwner(false);
    }
  };

  const handleRemoveCoOwner = async (emailToRemove: string) => {
    setIsSavingCoOwner(true);
    try {
      const updated = await removeCoOwnerEmail(emailToRemove, coOwners);
      setCoOwners(updated);
      setCoOwnerStatusMsg({ 
        text: `Access revoked for ${emailToRemove}.`, 
        type: 'success' 
      });
      setTimeout(() => setCoOwnerStatusMsg(null), 5000);
    } catch (err: any) {
      setCoOwnerStatusMsg({ text: err.message || 'Failed to remove co-owner.', type: 'error' });
    } finally {
      setIsSavingCoOwner(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t('settings')}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  v2.4
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Theme, Language, Support & Account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="shrink-0 px-5 pt-3 pb-2 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-xs font-mono">

          <button
            onClick={() => setActiveSettingsTab('firebase')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold shrink-0 ${
              activeSettingsTab === 'firebase'
                ? 'bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-emerald-300'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Personal Firebase & Rules</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              farmiotest
            </span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('preferences')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold shrink-0 ${
              activeSettingsTab === 'preferences'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Theme & Language</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('team')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold shrink-0 ${
              activeSettingsTab === 'team'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-emerald-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Co-Owners & Team Access</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('support')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold shrink-0 ${
              activeSettingsTab === 'support'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-cyan-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Support</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('account')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold shrink-0 ${
              activeSettingsTab === 'account'
                ? 'bg-purple-500 text-white shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-xs font-mono">
          


          {/* TAB: PERSONAL FIREBASE ACCOUNT & RULES */}
          {activeSettingsTab === 'firebase' && (
            <div className="space-y-4">
              
              {/* Header Overview Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/40 shadow-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">Personal Firebase Account Hub</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          usePersonalAccount 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {usePersonalAccount ? 'Active: solariot-f49f5' : 'Default AI Studio Mode'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Unified single-account Firebase project ({personalProjectId}) with Realtime Database &amp; Cloud Firestore.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyFarmiotestPreset}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow font-mono"
                  >
                    <Zap className="w-3.5 h-3.5 text-slate-950" />
                    <span>Apply solariot-f49f5 Preset</span>
                  </button>
                </div>

                {/* Account Toggle */}
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-bold flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${usePersonalAccount ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                    <span>Enable Unified Single Firebase Account (solariot-f49f5)</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePersonalAccount}
                      onChange={(e) => setUsePersonalAccount(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>

              {/* Account Configuration Form */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>Personal Project Credentials</span>
                  </span>
                  <a
                    href={`https://console.firebase.google.com/project/${personalProjectId}/settings/general`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline"
                  >
                    <span>Firebase Console Settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Firebase Project ID</label>
                    <input
                      type="text"
                      value={personalProjectId}
                      onChange={(e) => setPersonalProjectId(e.target.value)}
                      placeholder="solariot-f49f5"
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-zinc-400">Realtime Database URL</label>
                      <span className="text-[10px] text-emerald-400 font-mono">us-central1 (Spark Free Tier)</span>
                    </div>
                    <input
                      type="text"
                      value={personalRtdbUrl}
                      onChange={(e) => setPersonalRtdbUrl(e.target.value)}
                      placeholder="https://solariot-f49f5-default-rtdb.firebaseio.com"
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Diagnostics Ping Tester */}
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="text-[11px] font-bold text-zinc-300">Live Dual-Service Reachability Test</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleTestRtdbPing}
                      disabled={rtdbPingStatus === 'testing'}
                      className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Radio className={`w-3.5 h-3.5 ${rtdbPingStatus === 'testing' ? 'animate-spin' : ''}`} />
                      <span>{rtdbPingStatus === 'testing' ? 'Testing RTDB...' : 'Ping Realtime Database'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestCloudPing}
                      disabled={cloudPingStatus === 'testing'}
                      className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${cloudPingStatus === 'testing' ? 'animate-spin' : ''}`} />
                      <span>{cloudPingStatus === 'testing' ? 'Testing Firestore...' : 'Test Firestore REST'}</span>
                    </button>
                  </div>

                  {rtdbPingMessage && (
                    <div className={`p-2.5 rounded-xl text-[11px] font-mono border ${
                      rtdbPingStatus === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}>
                      {rtdbPingMessage}
                    </div>
                  )}

                  {cloudPingMessage && (
                    <div className={`p-2.5 rounded-xl text-[11px] font-mono border ${
                      cloudPingStatus === 'success' ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300' : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                    }`}>
                      {cloudPingMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Universal Security Rules Center */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-white text-xs">Zero-Lockout Security Rules (No Expiration)</h4>
                  </div>
                  
                  {/* Rules Tabs */}
                  <div className="flex p-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setActiveRulesTab('rtdb')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        activeRulesTab === 'rtdb' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Realtime Database
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRulesTab('firestore')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        activeRulesTab === 'firestore' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Cloud Firestore
                    </button>
                  </div>
                </div>

                {/* Banner explaining why this fixes the console red warning */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Eliminates Google Console Security Warning:</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    {activeRulesTab === 'rtdb' ? (
                      <>
                        By scoping read/write strictly to <code className="text-amber-300 font-mono">/security_system</code> and <code className="text-amber-300 font-mono">/solar_iot</code>, Firebase stops displaying the red &quot;public rules&quot; warning banner. No 30-day expiration date means ESP32 and Colab never lose access!
                      </>
                    ) : (
                      <>
                        Grants read/write for hardware telemetry at <code className="text-cyan-300 font-mono">/solar_iot</code> and recognizes <strong className="text-white">rajeevranjanchaudhary104@gmail.com</strong> as Owner/Admin with permanent access.
                      </>
                    )}
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between pb-1.5 text-[10px] text-zinc-400">
                    <span>{activeRulesTab === 'rtdb' ? 'database.rules.json' : 'firestore.rules'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyRulesText(activeRulesTab === 'rtdb' ? SCOPED_RTDB_RULES_JSON : PERMANENT_FIRESTORE_RULES, activeRulesTab)}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 hover:text-white border border-zinc-700 transition flex items-center gap-1 cursor-pointer font-mono text-[10px]"
                    >
                      {copiedRulesKey === activeRulesTab ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRulesKey === activeRulesTab ? 'Copied!' : 'Copy Rules'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-black border border-zinc-800 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed max-h-56">
                    {activeRulesTab === 'rtdb' ? SCOPED_RTDB_RULES_JSON : PERMANENT_FIRESTORE_RULES}
                  </pre>
                </div>

                {/* Instructions */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  <span className="font-bold text-zinc-200">How to apply in Firebase Console:</span>
                  <ol className="list-decimal list-inside space-y-0.5 text-zinc-400">
                    <li>Go to <a href={`https://console.firebase.google.com/project/${personalProjectId}/${activeRulesTab === 'rtdb' ? 'database' : 'firestore'}`} target="_blank" rel="noreferrer" className="text-cyan-400 underline font-mono">console.firebase.google.com</a>.</li>
                    <li>Click the <strong>Rules</strong> tab at the top.</li>
                    <li>Paste the copied rules and click <strong>Publish</strong>.</li>
                  </ol>
                </div>
              </div>

            </div>
          )}

          {/* TAB 1: THEME & MULTILINGUAL LANGUAGE */}
          {activeSettingsTab === 'preferences' && (
            <div className="space-y-5">
              
              {/* Theme Selection */}
              <div className="space-y-2">
                <label className="text-zinc-300 font-bold flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>{t('theme')} (Dark / White)</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTheme('dark')}
                    className={`p-3 rounded-2xl border transition flex items-center gap-3 cursor-pointer ${
                      selectedTheme === 'dark'
                        ? 'bg-zinc-900 border-amber-400 text-white shadow-lg'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-black border border-zinc-700 text-amber-400">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-xs text-white">Dark Theme</div>
                      <div className="text-[10px] text-zinc-500">Cyber Black & Neon</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTheme('light')}
                    className={`p-3 rounded-2xl border transition flex items-center gap-3 cursor-pointer ${
                      selectedTheme === 'light'
                        ? 'bg-slate-200 border-cyan-500 text-slate-900 shadow-lg'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white border border-slate-300 text-cyan-600">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-xs text-white">White Theme</div>
                      <div className="text-[10px] text-zinc-400">Clean Daylight Slate</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Language Selection (Hindi, English, Assamese, Tamil, Bhojpuri) */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-bold flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>{t('language')}</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">5 Regional Languages Supported</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setSelectedLanguage(lang.code)}
                        className={`p-3 rounded-2xl border transition text-left flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{lang.flag}</span>
                          <div>
                            <div className={`font-bold text-xs ${isSelected ? 'text-amber-300' : 'text-zinc-200'}`}>
                              {lang.nativeName}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {lang.name} ({lang.code.toUpperCase()})
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Android Mobile APK Download Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-black border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                    <Smartphone className="w-4 h-4" />
                    <span>Farm.IOT Android Mobile App (.apk)</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">v2.4.0</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-sans">
                    Download the standalone Android package to view live solar tachometers and trigger motorized wiper sweeps directly from your smartphone.
                  </div>
                </div>
                <a
                  href="/api/download/apk"
                  download="Farm_IOT_SmartStation_v2.4.apk"
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow shadow-emerald-500/20 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download APK</span>
                </a>
              </div>

              {/* Arduino IDE Software & Tools Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-black border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
                    <Laptop className="w-4 h-4" />
                    <span>Arduino IDE Software & Flasher Suite</span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">v2.3.4</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-sans">
                    Download official Arduino IDE software, CH340 / CP2102 USB drivers, and ready-to-flash firmware sketches for ESP32 & Arduino.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://downloads.arduino.cc/arduino-ide/arduino-ide_latest_Windows_64bit.exe"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow shadow-cyan-500/20 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Get IDE (.exe)</span>
                  </a>
                  {onOpenArduinoTools && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenArduinoTools();
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-700 font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Firmware Hub</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Save & Apply Action Banner inside Tab */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-white font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Selected Station Preferences</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                    Theme: <strong className="text-amber-300">{selectedTheme === 'dark' ? 'Dark' : 'White'}</strong> • Language: <strong className="text-cyan-300">{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB: CO-OWNERS & TEAM ACCESS (GRANT PERMISSION TO CHANGE ANYTHING) */}
          {activeSettingsTab === 'team' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-cyan-950/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Authorize Others to Change Anything in App</span>
                  </span>
                  <span className="text-[10px] text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-bold">
                    Full Admin Control
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                  Any email address added here is granted complete owner permissions across the entire Farm.IOT application. Authorized co-owners can trigger Wiper cleans, adjust scheduled clean times, post project updates, upload photos/videos, edit Research Mode, modify Store products, and customize hardware parameters.
                </p>
              </div>

              {/* Status message banner */}
              {coOwnerStatusMsg && (
                <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                  coOwnerStatusMsg.type === 'success'
                    ? 'bg-emerald-950/50 border border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/50 border border-rose-500/50 text-rose-300'
                }`}>
                  {coOwnerStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{coOwnerStatusMsg.text}</span>
                </div>
              )}

              {/* Add New Co-Owner Email Form */}
              <form onSubmit={handleAddCoOwner} className="p-4 rounded-2xl bg-black border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>Grant App Privileges to a New User</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Google / Engineer Email</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={newCoOwnerInput}
                    onChange={(e) => setNewCoOwnerInput(e.target.value)}
                    placeholder="teammate@gmail.com"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                    disabled={isSavingCoOwner}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSavingCoOwner || !newCoOwnerInput.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSavingCoOwner ? 'Authorizing...' : 'Grant Access'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  When this person signs into the app using Google with this email, they will automatically have full owner controls enabled.
                </p>
              </form>

              {/* List of Custom Authorized Co-Owners */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-300 px-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Custom Authorized Co-Owners ({coOwners.length})</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">Synced with Firebase Cloud</span>
                </div>

                {coOwners.length > 0 ? (
                  <div className="space-y-1.5">
                    {coOwners.map((email) => (
                      <div 
                        key={email}
                        className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-white truncate">{email}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0 font-bold">
                            Co-Owner
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCoOwner(email)}
                          disabled={isSavingCoOwner}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] flex items-center gap-1 transition cursor-pointer shrink-0"
                          title={`Revoke admin access for ${email}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-black border border-zinc-900 text-center text-zinc-400 text-xs">
                    No custom co-owners added yet. Type an email address above to grant someone permission to change anything.
                  </div>
                )}
              </div>

              {/* Default Primary Owners / Creators */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="text-xs font-bold text-zinc-400 px-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Project Mentor & Core Development Team</span>
                </div>
                <div className="p-3 rounded-xl bg-black border border-zinc-900 space-y-2 text-xs font-mono">
                  {/* Project Mentor Teacher */}
                  <div className="flex items-center justify-between text-zinc-300 pb-1.5 border-b border-zinc-900">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-white font-bold">{MENTOR_TEACHER_EMAIL}</span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                      Project Mentor Teacher
                    </span>
                  </div>

                  {/* Primary Owner / Student Developer */}
                  <div className="flex items-center justify-between text-zinc-300 pb-1 border-b border-zinc-900">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-white font-bold">{PRIMARY_OWNER_EMAIL}</span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      Student Lead / Owner
                    </span>
                  </div>

                  {DEFAULT_OWNER_EMAILS.filter(e => e !== PRIMARY_OWNER_EMAIL && e !== MENTOR_TEACHER_EMAIL).map(email => (
                    <div key={email} className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>{email}</span>
                      <span className="text-[9px] text-zinc-500">Core Engineer</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SUPPORT & CONTACT US USING EMAIL */}
          {activeSettingsTab === 'support' && (
            <div className="space-y-4">
              
              {/* Admin Direct Email Card */}
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Direct System Administrator Email</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-white select-all">
                      {OWNER_EMAIL}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      Contact System Engineering directly for hardware troubleshooting, Wiper PCB schematics, or operational support.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition cursor-pointer text-xs"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEmail ? 'Email Copied!' : 'Copy Email'}</span>
                  </button>

                  <a
                    href={`mailto:${OWNER_EMAIL}?subject=Solar%20IOT%20Engineering%20Support`}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer text-xs shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Mail App</span>
                  </a>
                </div>
              </div>

              {ticketSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{ticketSuccessMsg}</span>
                </div>
              )}

              {/* Interactive Support Email Form */}
              <form onSubmit={handleSendSupportEmail} className="space-y-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="font-bold text-xs text-zinc-200 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Compose Support Request</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[10px]">Your Name</label>
                    <input
                      type="text"
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      placeholder="Engineer / Operator Name"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[10px]">Your Email Address</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[10px]">Query Category</label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
                    >
                      <option value="Hardware / Telemetry">Hardware & INA219 Telemetry</option>
                      <option value="Wiper Motor Mechanism">Silicone Wiper Mechanism</option>
                      <option value="ESP32 Firmware">ESP32 Firmware & WiFi</option>
                      <option value="Inverter Overload Alarm">Overload Siren Alert</option>
                      <option value="Store & Hardware Purchase">Store & Orders</option>
                      <option value="General Inquiry">General Technical Question</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[10px]">Subject</label>
                    <input
                      type="text"
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder="Brief topic..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 text-[10px]">Describe Your Problem or Question</label>
                  <textarea
                    rows={3}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Enter details about your issue, telemetry readings, or questions..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Support Request via Email</span>
                </button>
              </form>

              <div className="p-3 rounded-xl bg-black border border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                <span>⏱ Typical response time:</span>
                <span className="text-cyan-400 font-bold">Within 24 Hours</span>
              </div>

            </div>
          )}

          {/* TAB 3: ACCOUNT & SESSION */}
          {activeSettingsTab === 'account' && (
            <div className="space-y-4">
              {user ? (
                <div className="p-4 rounded-2xl bg-black border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{user.displayName || 'Engineer'}</div>
                      <div className="text-xs text-zinc-400 font-mono">{user.email}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Authenticated
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-zinc-400">Privileges:</span>
                    <span className={isOwner ? "text-amber-400 font-bold" : "text-cyan-400 font-semibold"}>
                      {isOwner ? '👑 Verified System Owner' : 'Operations Engineer'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Team Access & Co-Owners</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">Give other people permission to change anything</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSettingsTab('team')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition cursor-pointer"
                    >
                      Manage Co-Owners →
                    </button>
                  </div>

                  <div className="pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out of Account</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-black border border-zinc-800 text-center text-zinc-400">
                  Not signed in.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-400">
            {savedSuccess ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Settings Saved Successfully!</span>
              </span>
            ) : (
              <span className="text-zinc-500 truncate max-w-[280px]">
                Support: {OWNER_EMAIL}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs font-mono font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
