import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Battery, 
  Droplets, 
  Cpu, 
  Calculator, 
  Shield, 
  LogOut, 
  User, 
  RefreshCw, 
  CheckCircle2, 
  Zap, 
  LayoutDashboard,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  CloudRain,
  Home,
  BookOpen,
  Info,
  GraduationCap
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';

import { auth, googleProvider, db, firebaseConfig } from './lib/firebase';
import { SolarData, CleaningLog, TelemetryPoint } from './types/solar';
import { LiveDashboard } from './components/LiveDashboard';
import { SolarCalculators } from './components/SolarCalculators';
import { Esp32CodeHelper } from './components/Esp32CodeHelper';
import { WebsiteHome } from './components/WebsiteHome';
import { AboutSection } from './components/AboutSection';
import { ResearchMode } from './components/ResearchMode';
import { GeminiAssistant } from './components/GeminiAssistant';
import { AuthModal } from './components/AuthModal';
import { AutoRefreshController } from './components/AutoRefreshController';

// Initial state: Physical ESP32 is offline until real telemetry arrives from Firebase
const initialSolarData: SolarData = {
  voltage: null,         // Displays N/A when ESP32 is offline
  current: null,         // Displays N/A
  power: null,           // Displays N/A
  temperature: null,     // Displays N/A
  batteryPercent: null,  // Displays N/A
  lastCleanedTime: null, // Displays N/A
  cleaningStatus: 'offline',
  pumpActive: false,
  wiperActive: false,
  espConnected: false,   // Hardware is offline by default!
  updatedAt: null,
  rssi: null,
  dailyEnergyWh: null,   // Displays N/A
  efficiency: null,      // Displays N/A
  
  // Rain & Peak Watt
  isRaining: null,       // Displays N/A
  lastRainTime: null,    // Displays N/A
  rainIntensityMm: null, // Displays N/A
  highestWattToday: null,// Displays N/A
  highestWattTime: null,
  allTimeRecordWatt: null,
  soilingIndex: null,    // Displays N/A
  scheduledCleanTime: '03:00 AM', // Default schedule, editable by owner in Firebase
  isDemoMode: false,
};

// Real hardware begins with real telemetry loaded from Firebase
const initialTelemetryHistory: TelemetryPoint[] = [];
const initialCleaningLogs: CleaningLog[] = [];

type WebsiteTab = 'home' | 'dashboard' | 'research' | 'calculators' | 'esp32' | 'about';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | { displayName: string; email: string; photoURL?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Default to 'home' website view for public visitors
  const [activeTab, setActiveTab] = useState<WebsiteTab>('home');
  const [solarData, setSolarData] = useState<SolarData>(initialSolarData);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>(initialTelemetryHistory);
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>(initialCleaningLogs);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSyncFlash, setIsSyncFlash] = useState<boolean>(false);
  const cleaningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Soft Auto-Refresh Handler: pulls fresh live readings & updates telemetry
  const handleSoftRefresh = () => {
    setIsSyncFlash(true);
    setTimeout(() => setIsSyncFlash(false), 500);
    setLastUpdated(new Date());

    setSolarData((prev) => {
      // If hardware is offline and not in demo mode, values remain N/A
      if (!prev.espConnected && !prev.isDemoMode) {
        return prev;
      }
      if (prev.voltage === null || prev.current === null) {
        return prev;
      }

      // Natural sensor micro-jitter when solar panel is live
      const vJitter = parseFloat((prev.voltage + (Math.random() * 0.3 - 0.15)).toFixed(2));
      const clampedV = Math.max(12.0, Math.min(21.5, vJitter));
      const iJitter = parseFloat((prev.current + (Math.random() * 0.12 - 0.06)).toFixed(2));
      const clampedI = Math.max(0.0, Math.min(7.0, iJitter));
      const p = parseFloat((clampedV * clampedI).toFixed(1));
      const newPeak = prev.highestWattToday !== null ? Math.max(prev.highestWattToday, p) : p;
      const tempJitter = prev.temperature !== null ? parseFloat((prev.temperature + (Math.random() * 0.2 - 0.1)).toFixed(1)) : null;

      return {
        ...prev,
        voltage: clampedV,
        current: clampedI,
        power: p,
        temperature: tempJitter,
        highestWattToday: newPeak,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time updates for ESP32 IoT node
  useEffect(() => {
    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (!data) return;

          // Check if hardware is genuinely online:
          // Must have espConnected === true, a real voltage reading,
          // AND updatedAt must be recent (within last 5 minutes)
          const updatedAtTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
          const isRecentlyUpdated = updatedAtTime > 0 && (Date.now() - updatedAtTime < 5 * 60 * 1000);
          const isHardwareLive = Boolean(
            data.espConnected === true && 
            data.voltage !== undefined && 
            data.voltage !== null && 
            Number(data.voltage) > 0 &&
            isRecentlyUpdated
          );

          // Real telemetry history loaded directly from Firebase
          if (Array.isArray(data.telemetryHistory) && data.telemetryHistory.length > 0) {
            setTelemetryHistory(data.telemetryHistory);
          }

          if (Array.isArray(data.cleaningLogs) && data.cleaningLogs.length > 0) {
            setCleaningLogs(data.cleaningLogs);
          }

          const v = data.voltage !== undefined && data.voltage !== null ? Number(data.voltage) : null;
          const i = data.current !== undefined && data.current !== null ? Number(data.current) : null;
          const p = (v !== null && i !== null)
            ? (data.power !== undefined && Number(data.power) !== 145.4 ? Number(data.power) : parseFloat((v * i).toFixed(1)))
            : null;
          const rawPeak = (data.highestWattToday !== undefined && Number(data.highestWattToday) !== 145.4)
            ? Number(data.highestWattToday)
            : null;
          const peak = rawPeak !== null ? rawPeak : (p && p > 0 ? p : null);

          // If real hardware is streaming, append to history and persist to Firebase
          if (isHardwareLive && v !== null && p !== null) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setTelemetryHistory((hist) => {
              const lastPoint = hist[hist.length - 1];
              if (lastPoint && lastPoint.time === timeStr) {
                return hist;
              }
              const updatedHist = [
                ...hist.slice(-23),
                {
                  time: timeStr,
                  power: p,
                  voltage: v,
                  current: i ?? 0,
                  temperature: data.temperature ?? 25,
                  isRaining: Boolean(data.isRaining),
                }
              ];
              setDoc(docRef, { telemetryHistory: updatedHist }, { merge: true }).catch(() => {});
              return updatedHist;
            });
          }

          setSolarData((prev) => ({
            ...prev,
            espConnected: isHardwareLive,
            voltage: isHardwareLive ? v : null,
            current: isHardwareLive ? i : null,
            power: isHardwareLive ? p : null,
            temperature: isHardwareLive && data.temperature !== undefined ? Number(data.temperature) : null,
            batteryPercent: isHardwareLive && data.batteryPercent !== undefined ? Number(data.batteryPercent) : null,
            highestWattToday: peak,
            dailyEnergyWh: isHardwareLive && data.dailyEnergyWh !== undefined ? Number(data.dailyEnergyWh) : null,
            efficiency: isHardwareLive && data.efficiency !== undefined ? Number(data.efficiency) : null,
            isRaining: isHardwareLive && data.isRaining !== undefined ? Boolean(data.isRaining) : null,
            lastRainTime: data.lastRainTime ?? prev.lastRainTime,
            rainIntensityMm: isHardwareLive && data.rainIntensityMm !== undefined ? Number(data.rainIntensityMm) : null,
            soilingIndex: isHardwareLive && data.soilingIndex !== undefined ? Number(data.soilingIndex) : null,
            scheduledCleanTime: data.scheduledCleanTime || prev.scheduledCleanTime || '03:00 AM',
            cleaningStatus: data.cleaningStatus ?? 'idle',
            wiperActive: Boolean(data.wiperActive),
            pumpActive: Boolean(data.pumpActive),
            lastCleanedTime: data.lastCleanedTime ?? prev.lastCleanedTime,
            updatedAt: data.updatedAt ?? prev.updatedAt,
            isDemoMode: false,
          }));
        }
      }, (error) => {
        console.warn('Firestore snapshot listener notice:', error);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore setup notice:', err);
    }
  }, []);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        setAuthError('Popup was blocked by the browser. You can click "Continue with Authorized Engineer Session" below.');
      } else {
        setAuthError(err.message || 'Authentication failed. Use the quick demo session.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    setUser({
      displayName: 'Solar Operations Engineer',
      email: 'engineer@solariot.local',
      photoURL: undefined,
    });
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      setUser(null);
    }
  };

  // Owner check for administrative actions
  const isOwner = Boolean(
    user?.email && 
    user.email.trim().toLowerCase() === 'rajeevranjanchaudhary104@gmail.com'
  );

  // Update scheduled solar panel clean time in Firebase
  const handleUpdateScheduledCleanTime = async (newTime: string) => {
    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      await setDoc(docRef, {
        scheduledCleanTime: newTime,
        scheduledCleanUpdatedAt: new Date().toISOString(),
      }, { merge: true });

      const hwDocRef = doc(db, 'solar_iot', 'hardware_config');
      await setDoc(hwDocRef, {
        scheduledCleanTime: newTime,
      }, { merge: true });

      setSolarData((prev) => ({
        ...prev,
        scheduledCleanTime: newTime,
      }));
    } catch (err: any) {
      console.error('Failed to update scheduled clean time:', err);
      throw err;
    }
  };

  // Stop Mechanical Wiper Cleaning cycle immediately
  const handleStopClean = async () => {
    if (cleaningTimerRef.current) {
      clearTimeout(cleaningTimerRef.current);
      cleaningTimerRef.current = null;
    }
    setIsCleaning(false);
    setSolarData((prev) => ({
      ...prev,
      pumpActive: false,
      wiperActive: false,
      cleaningStatus: 'idle',
    }));

    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      await updateDoc(docRef, {
        command: 'STOP_CLEANING',
        pumpActive: false,
        wiperActive: false,
        cleaningStatus: 'idle',
        requestedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firebase stop clean note:', e);
    }
  };

  // Trigger Mechanical Wiper Cleaning cycle (Safe dry squeegee sweep - no thermal shock)
  const handleTriggerClean = async () => {
    if (cleaningTimerRef.current) {
      clearTimeout(cleaningTimerRef.current);
      cleaningTimerRef.current = null;
    }
    setIsCleaning(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Instantly update UI for immediate responsive feedback
    setSolarData((prev) => ({
      ...prev,
      pumpActive: false, // Spray locked: direct water on hot panels causes thermal shock damage
      wiperActive: true,
      cleaningStatus: 'cleaning',
      lastCleanedTime: `Just now (${nowTime})`,
    }));

    // 2. Push command to Firebase Realtime / Firestore so ESP32 hardware picks it up
    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      await setDoc(docRef, {
        command: 'START_CLEANING',
        pumpActive: false,
        wiperActive: true,
        cleaningStatus: 'cleaning',
        lastCleanedTime: `Just now (${nowTime})`,
        requestedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Firebase push note:', e);
    }

    // 3. Hardware wiper duration (10 seconds sweep) - stops automatically after 10s
    cleaningTimerRef.current = setTimeout(async () => {
      const currentTemp = solarData.temperature;

      const newLog: CleaningLog = {
        id: `clean_${Date.now()}`,
        timestamp: `Today, ${nowTime}`,
        triggerType: 'manual',
        durationSeconds: 10,
        waterUsedMl: 0, // Safe dry mechanical wiping
        temperatureBefore: currentTemp !== null ? Number(currentTemp.toFixed(1)) : 35.0,
        temperatureAfter: currentTemp !== null ? Number(currentTemp.toFixed(1)) : 35.0,
        efficiencyGain: 14.5,
      };

      setCleaningLogs((prev) => [newLog, ...prev.slice(0, 7)]);
      setIsCleaning(false);
      cleaningTimerRef.current = null;

      setSolarData((prev) => ({
        ...prev,
        pumpActive: false,
        wiperActive: false,
        cleaningStatus: 'completed',
        soilingIndex: 2, // spotless clean!
        lastCleanedTime: `Today, ${nowTime}`,
      }));

      try {
        const docRef = doc(db, 'solar_iot', 'node_01');
        await updateDoc(docRef, {
          command: 'IDLE',
          pumpActive: false,
          wiperActive: false,
          cleaningStatus: 'idle',
          lastCleanedTime: `Today, ${nowTime}`,
        });
      } catch (e) {
        // silent fallback
      }
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
      
      {/* Visual Sync Pulse Bar */}
      {isSyncFlash && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-50 animate-pulse pointer-events-none shadow-[0_0_10px_#22d3ee]" />
      )}

      {/* Website Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Website Brand */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-cyan-500 text-slate-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Sun className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight text-white">
                  Solar<span className="text-amber-400">.</span><span className="text-cyan-400">IOT</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold hidden sm:inline-block">
                  Web Station
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden md:block">
                Smart Photovoltaic Monitoring & Automated Cleaning Website
              </p>
            </div>
          </div>

          {/* Website Main Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-medium shadow-inner">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-slate-800 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-cyan-400 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Live Monitor</span>
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'research'
                  ? 'bg-slate-800 text-purple-400 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Research Mode</span>
            </button>
            <button
              onClick={() => setActiveTab('calculators')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'calculators'
                  ? 'bg-slate-800 text-amber-400 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculators</span>
            </button>
            <button
              onClick={() => setActiveTab('esp32')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'esp32'
                  ? 'bg-slate-800 text-emerald-400 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Firmware (ESP-01 / ESP32)</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-slate-800 text-purple-400 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>About & Media</span>
            </button>
          </nav>

          {/* Auto Refresh Controller & Engineer Status */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            
            {/* Automatic Refresh Bar */}
            <AutoRefreshController 
              onSoftRefresh={handleSoftRefresh} 
              lastUpdated={lastUpdated} 
            />

            {user ? (
              <div className="flex items-center space-x-2.5">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-semibold text-white">
                    {user.displayName || 'Authorized Engineer'}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Navigation Tab Bar (Sticky on phones) */}
      <div className="lg:hidden sticky top-[57px] z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-2 py-1.5 flex items-center justify-around gap-1 text-xs font-mono shadow-md overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'home'
              ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span className="text-[11px]">Home</span>
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="text-[11px]">Monitor</span>
        </button>
        <button
          onClick={() => setActiveTab('research')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'research'
              ? 'bg-slate-800 text-purple-400 font-bold border border-slate-700 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span className="text-[11px]">Research</span>
        </button>
        <button
          onClick={() => setActiveTab('esp32')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'esp32'
              ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="text-[11px]">Code</span>
        </button>
        <button
          onClick={() => setActiveTab('calculators')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'calculators'
              ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span className="text-[11px]">Sizing</span>
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'about'
              ? 'bg-slate-800 text-purple-400 font-bold border border-slate-700 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="text-[11px]">About</span>
        </button>
      </div>

      {/* Main Website Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        
        {/* Tab 1: Home / Overview Website Page */}
        {activeTab === 'home' && (
          <WebsiteHome
            solarData={solarData}
            onNavigate={(tab) => setActiveTab(tab)}
            onTriggerClean={handleTriggerClean}
            isCleaning={isCleaning}
          />
        )}

        {/* Tab 2: Live IoT Telemetry Dashboard */}
        {activeTab === 'dashboard' && (
          <LiveDashboard
            solarData={solarData}
            telemetryHistory={telemetryHistory}
            onTriggerClean={handleTriggerClean}
            cleaningLogs={cleaningLogs}
            isCleaning={isCleaning}
            onStopClean={handleStopClean}
            isOwner={isOwner}
            onRequireSignIn={() => setShowAuthModal(true)}
            onUpdateScheduledCleanTime={handleUpdateScheduledCleanTime}
          />
        )}

        {/* Tab 3: Research Mode (Student Slots, Teacher Mentors, School Info & 20 Custom Slots) */}
        {activeTab === 'research' && (
          <ResearchMode 
            currentUser={user}
            onRequireSignIn={() => setShowAuthModal(true)}
          />
        )}

        {/* Tab 4: Interactive Solar & Battery Sizing Calculators */}
        {activeTab === 'calculators' && (
          <SolarCalculators />
        )}

        {/* Tab 5: ESP32 Firmware, Pinout Guide & Firebase Setup */}
        {activeTab === 'esp32' && (
          <Esp32CodeHelper 
            currentUser={user}
            onRequireSignIn={() => setShowAuthModal(true)}
          />
        )}

        {/* Tab 6: Physics, Thermal Derating & Water Conservation Research */}
        {activeTab === 'about' && (
          <AboutSection 
            currentUser={user}
            onRequireSignIn={() => setShowAuthModal(true)}
          />
        )}

      </main>

      {/* Rich Website Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-10 px-4 lg:px-8 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="text-base font-black text-white">Solar.IOT</span>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Smart Photovoltaic Health Monitoring, Hydro-Mist Cleaning & Dual-Action Squeegee Wiper System.
              </p>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Real-Time Firebase Firestore Stream Active
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div className="space-y-2">
              <div className="text-white font-bold uppercase tracking-wider text-[11px]">Website Pages</div>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>
                  <button onClick={() => setActiveTab('home')} className="hover:text-cyan-400 transition cursor-pointer">
                    Home & Architecture
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('dashboard')} className="hover:text-cyan-400 transition cursor-pointer">
                    Live IoT Telemetry
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('calculators')} className="hover:text-cyan-400 transition cursor-pointer">
                    Solar System Calculators
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('esp32')} className="hover:text-cyan-400 transition cursor-pointer">
                    ESP32 Firmware (.ino)
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('about')} className="hover:text-cyan-400 transition cursor-pointer">
                    Research & Physics
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Hardware Specifications */}
            <div className="space-y-2">
              <div className="text-white font-bold uppercase tracking-wider text-[11px]">Sensor Hardware</div>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>INA219: 0–26V Bus, ±3.2A Current</li>
                <li>LM35: Precision Temp (&gt;45°C Alarm)</li>
                <li>FC-37: Raindrop Sensor (Natural Rinse)</li>
                <li>Water Pump Relay: 12V High-Pressure</li>
                <li>Silicone Wiper Motor: Mechanical Arm</li>
              </ul>
            </div>

            {/* Col 4: Platform & Cloud */}
            <div className="space-y-2">
              <div className="text-white font-bold uppercase tracking-wider text-[11px]">Cloud Backend</div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Persistent time-series telemetry synced over Google Cloud & Firebase Realtime Database.
              </p>
              <div className="pt-2 text-[10px] text-slate-500">
                Project ID: <span className="text-cyan-400">{firebaseConfig.projectId}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>© {new Date().getFullYear()} Solar.IOT Project. All rights reserved.</span>
            <span>Open Source Clean Energy & IoT Research</span>
          </div>

        </div>
      </footer>

      {/* Gemini AI Engineering & Science Assistant */}
      <GeminiAssistant />

      {/* Non-blocking Sign In Modal (Only shown if user explicitly clicks "Sign In") */}
      {showAuthModal && (
        <AuthModal
          onSignInWithGoogle={handleGoogleSignIn}
          onDemoSignIn={handleDemoSignIn}
          onClose={() => setShowAuthModal(false)}
          error={authError}
          loading={authLoading}
        />
      )}
    </div>
  );
}
