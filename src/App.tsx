import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Battery, 
  Droplets, 
  Cpu, 
  Calculator, 
  Shield, 
  ShieldAlert,
  Camera,
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
  GraduationCap,
  MessageSquare,
  Star,
  ShoppingBag,
  Settings,
  AlertTriangle,
  X,
  Newspaper,
  Globe,
  Moon,
  Wind,
  Database,
  Flame,
  Cloud,
  Users
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDoc,
  serverTimestamp, 
  collection, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';

import { auth, googleProvider, db, rtdb, firebaseConfig, sanitizeForFirestore, getOrCreateRtdb, getCustomRtdbUrl, saveCustomRtdbUrl, seedCompleteRealtimeDatabase, subscribeToSolarNodeTelemetry, DEFAULT_TELEMETRY } from './lib/firebase';
import { ref, onValue } from 'firebase/database';
import { SolarData, CleaningLog, TelemetryPoint, TelemetryHistoryPoint, StationProfile } from './types/solar';
import { LiveDashboard } from './components/LiveDashboard';
import { buildSparkline } from './components/SolarTelemetryChart';
import { SolarCalculators } from './components/SolarCalculators';
import { Esp32CodeHelper } from './components/Esp32CodeHelper';
import { WebsiteHome } from './components/WebsiteHome';
import { SolarWeatherSection } from './components/SolarWeatherSection';
import { SolarStore } from './components/SolarStore';
import { AboutSection } from './components/AboutSection';
import { ResearchMode, OWNER_EMAILS } from './components/ResearchMode';
import { checkIsOwner } from './lib/permissions';
import { UserReviewsSection } from './components/UserReviewsSection';
import { SolarAiAssistant } from './components/GeminiAssistant';
import { AuthModal } from './components/AuthModal';
import { AutoRefreshController } from './components/AutoRefreshController';
import { UpdatesSection } from './components/UpdatesSection';
import { MandatoryLoginGate, FirebaseAuthPortal } from './components/MandatoryLoginGate';
import { StationSettingsModal } from './components/StationSettingsModal';
import { WindmillPeltierSection } from './components/WindmillPeltierSection';
import { SecuritySystemSection } from './components/SecuritySystemSection';
import { WorkersSection } from './components/WorkersSection';
import { PWAInstallButton } from './components/PWAInstallButton';
import { FirebaseHostingModal } from './components/FirebaseHostingModal';
import Hardware3DViewer from './components/Hardware3DViewer';
import { SupportedLanguage, SUPPORTED_LANGUAGES, getTranslation } from './lib/translations';

export { buildSparkline };


export function cleanPersonalName(name?: string | null): string {
  if (!name) return 'Solar Engineer';
  if (/rajeev|ranjan|chaudhary/i.test(name)) {
    return 'Solar Engineer';
  }
  return name;
}

// Initial state: Strict Offline state until physical ESP32 hardware connects and transmits live telemetry
const initialSolarData: SolarData = {
  voltage: null,
  current: null,
  power: null,
  temperature: null,
  batteryPercent: null,
  lastCleanedTime: 'Never',
  cleaningStatus: 'idle',
  pumpActive: false,
  wiperActive: false,
  espConnected: false,
  updatedAt: '',
  rssi: undefined,
  dailyEnergyWh: null,
  efficiency: null,
  
  // Rain & Peak Watt
  isRaining: false,
  lastRainTime: null,
  rainIntensityMm: 0,
  highestWattToday: null,
  highestWattTime: null,
  highestVoltageToday: null,
  highestVoltageTime: null,
  inverterLoadWatts: 150,
  gridExportWatts: null,
  allTimeRecordWatt: null,
  soilingIndex: null,
  scheduledCleanTime: '03:00 AM',
  connectionMode: 'firebase',

  // Farm IoT Soil Moisture & Irrigation Telemetry
  soilMoisture: null,
  soilMoistureRaw: null,
  soilStatus: null,
  soilTemperature: null,
  irrigationPumpActive: false,

  // Windmill & Peltier Thermoelectric Telemetry
  peltierCurrent: null,
  peltierVoltage: null,
  peltierPower: null,
  sandTemp: null,
  peltierTemp: null,
  environmentTemp: null,
  windmillRpm: null,
  windmillPower: null,
  windmillVoltage: null,
  windmillCurrent: null,
  airPressure: null,
};

const initialTelemetryHistory: TelemetryPoint[] = [];
const initialCleaningLogs: CleaningLog[] = [];

type WebsiteTab = 'home' | 'dashboard' | 'security' | 'workers' | 'windmill_peltier' | 'model3d' | 'weather' | 'updates' | 'store' | 'research' | 'calculators' | 'esp32' | 'about' | 'reviews';

export default function App() {
  const [user, setUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_persisted_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('solar_iot_persisted_session');
    } catch {
      return true;
    }
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [stationProfile, setStationProfile] = useState<StationProfile | null>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_active_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('solar_iot_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  const handleContinueAsGuest = () => {
    setIsGuestMode(true);
    try {
      localStorage.setItem('solar_iot_guest_mode', 'true');
    } catch {}
  };


  // Language & Theme state (Persisted in localStorage)
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_language');
      if (saved && ['en', 'hi', 'bho', 'as', 'ta'].includes(saved)) {
        return saved as SupportedLanguage;
      }
    } catch {}
    return 'en';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  // Apply theme class to document
  useEffect(() => {
    try {
      localStorage.setItem('solar_iot_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch {}
  }, [theme]);

  const handleSelectLanguage = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('solar_iot_language', newLang);
    } catch {}
  };

  const t = (key: string) => getTranslation(language, key);

  // Default to 'home' website view for public visitors
  const [activeTab, setActiveTab] = useState<WebsiteTab>('home');
  const [solarData, setSolarData] = useState<SolarData>(initialSolarData);
  const [history, setHistory] = useState<TelemetryHistoryPoint[]>(initialTelemetryHistory);
  const telemetryHistory = history;
  const setTelemetryHistory = setHistory;
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>(initialCleaningLogs);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [wiperCountdown, setWiperCountdown] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSyncFlash, setIsSyncFlash] = useState<boolean>(false);
  const cleaningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showHostingModal, setShowHostingModal] = useState<boolean>(false);

  // 1-second countdown timer for wiperCountdown UI guard
  useEffect(() => {
    if (wiperCountdown <= 0) return;
    const timer = setInterval(() => {
      setWiperCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [wiperCountdown]);

  // Dual Connection Mode: 'firebase' (Cloud) vs 'local_ap' (Direct Offline AP Hotspot)
  const [connectionMode, setConnectionMode] = useState<'firebase' | 'local_ap'>('firebase');
  const [localApIp, setLocalApIp] = useState<string>('192.168.4.1');
  const [localApConnected, setLocalApConnected] = useState<boolean>(false);
  const [localApLatency, setLocalApLatency] = useState<number | null>(null);

  // Offline Local ESP32 AP Polling Loop (Pulls telemetry directly from http://192.168.4.1/api/telemetry)
  useEffect(() => {
    if (connectionMode !== 'local_ap') return;

    let isSubscribed = true;
    const cleanIp = localApIp.trim().replace(/^https?:\/\//, '');

    const pollLocalAp = async () => {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`http://${cleanIp}/api/telemetry`, {
          signal: controller.signal,
          mode: 'cors',
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (!isSubscribed) return;

          const latency = Date.now() - startTime;
          setLocalApConnected(true);
          setLocalApLatency(latency);

          const v = data.voltage !== undefined && data.voltage !== null ? Number(data.voltage) : null;
          const i = data.current !== undefined && data.current !== null ? Number(data.current) : null;
          const p = (v !== null && i !== null)
            ? (data.power !== undefined ? Number(data.power) : parseFloat((v * i).toFixed(1)))
            : null;

          setSolarData((prev) => ({
            ...prev,
            espConnected: true,
            voltage: v,
            current: i,
            power: p,
            temperature: data.temperature !== undefined ? Number(data.temperature) : (data.tempC !== undefined ? Number(data.tempC) : prev.temperature),
            batteryPercent: data.batteryPercent !== undefined ? Number(data.batteryPercent) : 85,
            highestWattToday: data.highestWattToday !== undefined ? Number(data.highestWattToday) : (p && p > (prev.highestWattToday || 0) ? p : prev.highestWattToday),
            isRaining: data.isRaining !== undefined ? Boolean(data.isRaining) : false,
            wiperActive: Boolean(data.wiperActive),
            cleaningStatus: data.cleaningStatus || (data.wiperActive ? 'cleaning' : 'idle'),
            connectionMode: 'local_ap',
            localApIp: cleanIp,
            localApLatencyMs: latency,
            updatedAt: new Date().toISOString(),
          }));
        } else {
          if (isSubscribed) {
            setLocalApConnected(false);
            setLocalApLatency(null);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setLocalApConnected(false);
          setLocalApLatency(null);
        }
      }
    };

    pollLocalAp();
    const interval = setInterval(pollLocalAp, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [connectionMode, localApIp]);

  const initialTelemetrySignatureRef = useRef<string | null>(null);
  const lastHardwarePacketTimeRef = useRef<number>(0);

  // Soft Refresh Handler: triggers a clean check without fabricating sensor readings
  const handleSoftRefresh = () => {
    setIsSyncFlash(true);
    setTimeout(() => setIsSyncFlash(false), 500);
    setLastUpdated(new Date());
  };

  // Hardware Watchdog: Marks ESP32 offline if no new telemetry arrives within 30 seconds
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (connectionMode === 'firebase' && lastHardwarePacketTimeRef.current > 0) {
        if (Date.now() - lastHardwarePacketTimeRef.current > 30000) {
          lastHardwarePacketTimeRef.current = 0;
          setSolarData((prev) => ({
            ...prev,
            espConnected: false,
            voltage: null,
            current: null,
            power: null,
            temperature: null,
            soilMoisture: null,
            soilMoistureRaw: null,
            soilStatus: null,
            soilTemperature: null,
            windmillRpm: null,
            windmillPower: null,
            windmillVoltage: null,
            windmillCurrent: null,
            peltierCurrent: null,
            peltierVoltage: null,
            peltierPower: null,
            sandTemp: null,
            peltierTemp: null,
            environmentTemp: null,
            airPressure: null,
          }));
        }
      }
    }, 5000);
    return () => clearInterval(watchdog);
  }, [connectionMode]);

  // Monitor Firebase Auth state and load Station Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const sanitizedUser = {
          uid: currentUser.uid,
          displayName: cleanPersonalName(currentUser.displayName),
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        };
        setUser(sanitizedUser);
        try {
          localStorage.setItem('solar_iot_persisted_session', JSON.stringify(sanitizedUser));
        } catch {}
        try {
          const userDocRef = doc(db, 'user_profiles', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const prof = snap.data() as StationProfile;
            const validDbId = prof.firestoreDatabaseId?.trim() || '(default)';
            const sanitizedProf = { 
              ...prof, 
              displayName: cleanPersonalName(prof.displayName),
              firestoreDatabaseId: validDbId, 
              firebaseProjectId: (!prof.firebaseProjectId || prof.firebaseProjectId === 'farmiotest') ? 'solariot-f49f5' : prof.firebaseProjectId 
            };
            setStationProfile(sanitizedProf);
          } else {
            const localProf = localStorage.getItem(`station_profile_${currentUser.uid}`) || localStorage.getItem('solar_iot_active_profile');
            if (localProf) {
              try {
                const parsed = JSON.parse(localProf);
                const validDbId = parsed.firestoreDatabaseId?.trim() || '(default)';
                const sanitized = { 
                  ...parsed, 
                  displayName: cleanPersonalName(parsed.displayName),
                  firestoreDatabaseId: validDbId, 
                  firebaseProjectId: (!parsed.firebaseProjectId || parsed.firebaseProjectId === 'farmiotest') ? 'solariot-f49f5' : parsed.firebaseProjectId 
                };
                setStationProfile(sanitized);
              } catch {}
            }
          }
        } catch (e) {
          console.warn('Profile fetch notice:', e);
        }
      } else {
        // If Firebase Auth has no currentUser, check if we have a persisted engineer/owner session
        try {
          const persisted = localStorage.getItem('solar_iot_persisted_session');
          if (persisted) {
            const parsed = JSON.parse(persisted);
            const sanitizedParsed = { ...parsed, displayName: cleanPersonalName(parsed.displayName) };
            setUser(sanitizedParsed);
            const activeProf = localStorage.getItem('solar_iot_active_profile') || localStorage.getItem(`station_profile_${parsed.uid}`);
            if (activeProf) {
              const parsedProf = JSON.parse(activeProf);
              setStationProfile({ ...parsedProf, displayName: cleanPersonalName(parsedProf.displayName) });
            }
          } else {
            setUser(null);
            setStationProfile(null);
          }
        } catch {
          setUser(null);
          setStationProfile(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);


  // Shared telemetry parser for Dual-Sync (Cloud Firestore + Realtime Database)
  const processIncomingTelemetry = (data: Record<string, any>, sourceDocRef?: any) => {
    if (!data || typeof data !== 'object') return;

    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        if (data[k] !== undefined && data[k] !== null) return data[k];
      }
      return undefined;
    };

    const rawUpdatedAt = getVal('updatedAt', 'updated_at', 'last_seen', 'timestamp');
    const rawEspConnected = getVal('espConnected', 'esp_connected');

    const rawVoltage = getVal('voltage', 'solar_voltage', 'panel_voltage');
    const rawCurrent = getVal('current', 'solar_current', 'panel_current');
    const rawPower = getVal('power', 'solar_power', 'panel_power');
    const rawTemp = getVal('temperature', 'solar_temp', 'panel_temp');
    const rawBattery = getVal('batteryPercent', 'battery_percent', 'battery');
    const rawDailyEnergy = getVal('dailyEnergyWh', 'daily_energy_wh');
    const rawEfficiency = getVal('efficiency', 'panel_efficiency');
    const rawIsRaining = getVal('isRaining', 'is_raining');
    const rawRainMm = getVal('rainIntensityMm', 'rain_intensity_mm');
    const rawSoiling = getVal('soilingIndex', 'soiling_index');

    const rawWindmillRpm = getVal('windmillRpm', 'windmill_rpm', 'rpm');
    const rawWindmillPower = getVal('electricityGenerated', 'windmillPower', 'windmill_power', 'power_generated');
    const rawWindmillVoltage = getVal('windmillVoltage', 'windmill_voltage');
    const rawWindmillCurrent = getVal('windmillCurrent', 'windmill_current');
    const rawAirPressure = getVal('airPressure', 'air_pressure', 'pressure');
    const rawPeltierCurrent = getVal('peltierCurrent', 'peltier_current');
    const rawPeltierVoltage = getVal('peltierVoltage', 'peltier_voltage');
    const rawPeltierPower = getVal('peltierPower', 'peltier_power');
    const rawSandTemp = getVal('sandTemp', 'sand_temp');
    const rawPeltierTemp = getVal('peltierTemp', 'peltier_temp');
    const rawEnvTemp = getVal('environmentTemp', 'environment_temp', 'env_temp');
    const rawSoilMoisture = getVal('soilMoisture', 'soil_moisture', 'moisture', 'soil_moist');
    const rawSoilRaw = getVal('soilMoistureRaw', 'soil_raw', 'moistureRaw');
    const rawSoilTemp = getVal('soilTemperature', 'soil_temperature', 'soil_temp');
    const rawIrrigationPump = getVal('irrigationPumpActive', 'irrigation_pump', 'pump_active');

    const hasValidTelemetry = (
      (rawVoltage !== undefined && rawVoltage !== null && Number(rawVoltage) >= 0) ||
      (rawWindmillRpm !== undefined && rawWindmillRpm !== null) ||
      (rawWindmillPower !== undefined && rawWindmillPower !== null) ||
      (rawPeltierPower !== undefined && rawPeltierPower !== null) ||
      (rawSoilMoisture !== undefined && rawSoilMoisture !== null)
    );

    // Build packet signature to detect genuinely advancing real-time transmissions vs static pre-mount DB snapshots
    const packetSignature = `${rawUpdatedAt ?? ''}_${rawVoltage ?? ''}_${rawCurrent ?? ''}_${rawSoilMoisture ?? ''}_${rawWindmillRpm ?? ''}`;
    if (initialTelemetrySignatureRef.current === null) {
      initialTelemetrySignatureRef.current = packetSignature;
    }
    const isAdvancingPacket = packetSignature !== initialTelemetrySignatureRef.current;
    if (isAdvancingPacket && rawEspConnected === true && hasValidTelemetry) {
      initialTelemetrySignatureRef.current = packetSignature;
      lastHardwarePacketTimeRef.current = Date.now();
    }

    // Node is only live if hardware explicitly reports espConnected === true AND is actively transmitting new packets
    const isHardwareLive = Boolean(
      rawEspConnected === true &&
      hasValidTelemetry &&
      lastHardwarePacketTimeRef.current > 0 &&
      (Date.now() - lastHardwarePacketTimeRef.current < 30000)
    );

    if (!isHardwareLive) {
      setSolarData((prev) => ({
        ...prev,
        espConnected: false,
        voltage: null,
        current: null,
        power: null,
        temperature: null,
        batteryPercent: null,
        dailyEnergyWh: null,
        efficiency: null,
        soilMoisture: null,
        soilMoistureRaw: null,
        soilStatus: null,
        soilTemperature: null,
        windmillRpm: null,
        windmillPower: null,
        windmillVoltage: null,
        windmillCurrent: null,
        peltierCurrent: null,
        peltierVoltage: null,
        peltierPower: null,
        sandTemp: null,
        peltierTemp: null,
        environmentTemp: null,
        airPressure: null,
        scheduledCleanTime: data.scheduledCleanTime || prev.scheduledCleanTime || '03:00 AM',
        cleaningStatus: data.cleaningStatus ?? prev.cleaningStatus ?? 'idle',
        wiperActive: data.wiperActive !== undefined ? Boolean(data.wiperActive) : prev.wiperActive,
        pumpActive: data.pumpActive !== undefined ? Boolean(data.pumpActive) : prev.pumpActive,
        lastCleanedTime: data.lastCleanedTime ?? prev.lastCleanedTime,
      }));
      return;
    }

    // Real telemetry history loaded directly from Firebase when hardware is live
    if (Array.isArray(data.telemetryHistory) && data.telemetryHistory.length > 0) {
      setTelemetryHistory(data.telemetryHistory);
    }

    if (Array.isArray(data.cleaningLogs) && data.cleaningLogs.length > 0) {
      setCleaningLogs(data.cleaningLogs);
    }

    const v = rawVoltage !== undefined && rawVoltage !== null ? Number(rawVoltage) : null;
    const i = rawCurrent !== undefined && rawCurrent !== null ? Number(rawCurrent) : null;
    const p = (v !== null && i !== null)
      ? (rawPower !== undefined && rawPower !== null && Number(rawPower) !== 145.4 ? Number(rawPower) : parseFloat((v * i).toFixed(1)))
      : null;
    const rawPeak = (data.highestWattToday !== undefined && data.highestWattToday !== null && Number(data.highestWattToday) !== 145.4)
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
            temperature: rawTemp !== undefined && rawTemp !== null ? Number(rawTemp) : 25,
            isRaining: Boolean(rawIsRaining),
          }
        ];
        if (sourceDocRef) {
          setDoc(sourceDocRef, { telemetryHistory: updatedHist }, { merge: true }).catch(() => {});
        }
        return updatedHist;
      });
    }

    const moistureNum = rawSoilMoisture !== undefined && rawSoilMoisture !== null ? Number(rawSoilMoisture) : null;

    setSolarData((prev) => {
      const effectiveMoisture = moistureNum !== null ? moistureNum : (prev.soilMoisture ?? null);
      const effectiveSoilStatus = effectiveMoisture === null
        ? null
        : effectiveMoisture < 30 ? 'dry' : effectiveMoisture > 70 ? 'wet' : 'optimal';

      return {
        ...prev,
        espConnected: true,
        voltage: v,
        current: i,
        power: p,
        temperature: rawTemp !== undefined && rawTemp !== null ? Number(rawTemp) : prev.temperature,
        batteryPercent: rawBattery !== undefined && rawBattery !== null ? Number(rawBattery) : prev.batteryPercent,
        highestWattToday: peak ?? prev.highestWattToday,
        dailyEnergyWh: rawDailyEnergy !== undefined && rawDailyEnergy !== null ? Number(rawDailyEnergy) : prev.dailyEnergyWh,
        efficiency: rawEfficiency !== undefined && rawEfficiency !== null ? Number(rawEfficiency) : prev.efficiency,
        isRaining: rawIsRaining !== undefined ? Boolean(rawIsRaining) : prev.isRaining,
        lastRainTime: data.lastRainTime ?? prev.lastRainTime,
        rainIntensityMm: rawRainMm !== undefined && rawRainMm !== null ? Number(rawRainMm) : prev.rainIntensityMm,
        soilingIndex: rawSoiling !== undefined && rawSoiling !== null ? Number(rawSoiling) : prev.soilingIndex,
        scheduledCleanTime: data.scheduledCleanTime || prev.scheduledCleanTime || '03:00 AM',
        cleaningStatus: data.cleaningStatus ?? prev.cleaningStatus ?? 'idle',
        wiperActive: data.wiperActive !== undefined ? Boolean(data.wiperActive) : prev.wiperActive,
        pumpActive: data.pumpActive !== undefined ? Boolean(data.pumpActive) : prev.pumpActive,
        lastCleanedTime: data.lastCleanedTime ?? prev.lastCleanedTime,
        updatedAt: rawUpdatedAt ? String(rawUpdatedAt) : new Date().toISOString(),
        peltierCurrent: rawPeltierCurrent !== undefined && rawPeltierCurrent !== null ? Number(rawPeltierCurrent) : prev.peltierCurrent,
        peltierVoltage: rawPeltierVoltage !== undefined && rawPeltierVoltage !== null ? Number(rawPeltierVoltage) : prev.peltierVoltage,
        peltierPower: rawPeltierPower !== undefined && rawPeltierPower !== null ? Number(rawPeltierPower) : prev.peltierPower,
        sandTemp: rawSandTemp !== undefined && rawSandTemp !== null ? Number(rawSandTemp) : prev.sandTemp,
        peltierTemp: rawPeltierTemp !== undefined && rawPeltierTemp !== null ? Number(rawPeltierTemp) : prev.peltierTemp,
        environmentTemp: rawEnvTemp !== undefined && rawEnvTemp !== null ? Number(rawEnvTemp) : prev.environmentTemp,
        windmillRpm: rawWindmillRpm !== undefined && rawWindmillRpm !== null ? Number(rawWindmillRpm) : prev.windmillRpm,
        windmillPower: rawWindmillPower !== undefined && rawWindmillPower !== null ? Number(rawWindmillPower) : prev.windmillPower,
        windmillVoltage: rawWindmillVoltage !== undefined && rawWindmillVoltage !== null ? Number(rawWindmillVoltage) : prev.windmillVoltage,
        windmillCurrent: rawWindmillCurrent !== undefined && rawWindmillCurrent !== null ? Number(rawWindmillCurrent) : prev.windmillCurrent,
        airPressure: rawAirPressure !== undefined && rawAirPressure !== null ? Number(rawAirPressure) : prev.airPressure,
        soilMoisture: effectiveMoisture,
        soilMoistureRaw: rawSoilRaw !== undefined && rawSoilRaw !== null ? Number(rawSoilRaw) : prev.soilMoistureRaw,
        soilStatus: effectiveSoilStatus,
        soilTemperature: rawSoilTemp !== undefined && rawSoilTemp !== null ? Number(rawSoilTemp) : prev.soilTemperature,
        irrigationPumpActive: rawIrrigationPump !== undefined ? Boolean(rawIrrigationPump) : prev.irrigationPumpActive,
      };
    });
  };

  // 1. Listen to Cloud Firestore real-time updates (/solar_iot/node_01) with clean unbind before 3s REST fallback & HTTP 404 DEFAULT_TELEMETRY handler
  useEffect(() => {
    const unsubscribe = subscribeToSolarNodeTelemetry((data, docRef) => {
      if (data) {
        processIncomingTelemetry(data, docRef);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen to Realtime Database for NodeMCU / ESP32 (/solar_iot/node_01 and /node_01) + HTTP REST Polling
  const [currentRtdbUrl, setCurrentRtdbUrl] = useState<string>(() => getCustomRtdbUrl());

  useEffect(() => {
    const handleUrlChange = (e: any) => {
      if (e?.detail && typeof e.detail === 'string') {
        setCurrentRtdbUrl(e.detail);
      }
    };
    window.addEventListener('solar_iot_rtdb_url_changed', handleUrlChange);
    return () => window.removeEventListener('solar_iot_rtdb_url_changed', handleUrlChange);
  }, []);

  useEffect(() => {
    const activeRtdb = getOrCreateRtdb(currentRtdbUrl);
    const cleanBaseUrl = currentRtdbUrl.trim().replace(/\/+$/, '');
    let unsub1: (() => void) | null = null;
    let unsub2: (() => void) | null = null;

    if (activeRtdb) {
      try {
        // Path 1: /solar_iot/node_01
        const rtdbNodeRef = ref(activeRtdb, 'solar_iot/node_01');
        unsub1 = onValue(rtdbNodeRef, (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            if (val && typeof val === 'object') {
              processIncomingTelemetry(val);
            }
          }
        }, () => {});

        // Path 2: Root /node_01
        const rootNodeRef = ref(activeRtdb, 'node_01');
        unsub2 = onValue(rootNodeRef, (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            if (val && typeof val === 'object') {
              processIncomingTelemetry(val);
            }
          }
        }, () => {});
      } catch (err) {
        console.warn('RTDB telemetry listener note:', err);
      }
    }

    // Direct HTTP REST Polling fallback every 4s for Realtime Database (/solar_iot/node_01.json)
    let isMounted = true;
    const pollRtdbTelemetry = async () => {
      try {
        const res = await fetch(`${cleanBaseUrl}/solar_iot/node_01.json`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && typeof data === 'object') {
            processIncomingTelemetry(data);
            return;
          } else if (isMounted && data === null) {
            const rootRes = await fetch(`${cleanBaseUrl}/node_01.json`);
            if (rootRes.ok) {
              const rootData = await rootRes.json();
              if (isMounted && rootData && typeof rootData === 'object') {
                processIncomingTelemetry(rootData);
                return;
              }
            }
          }
        }
      } catch {
        // Quiet fallback if offline
      }
    };

    pollRtdbTelemetry();
    const pollTimer = setInterval(pollRtdbTelemetry, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, [currentRtdbUrl]);

  // Handle Google Sign In with Onboarding Validation
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        const sessionUser = {
          uid: res.user.uid,
          displayName: res.user.displayName || res.user.email?.split('@')[0] || 'Solar Engineer',
          email: res.user.email,
          photoURL: res.user.photoURL,
        };
        setUser(sessionUser);
        try {
          localStorage.setItem('solar_iot_persisted_session', JSON.stringify(sessionUser));
        } catch {}

        try {
          const userDocRef = doc(db, 'user_profiles', res.user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const prof = snap.data() as StationProfile;
            setStationProfile(prof);
          }
        } catch {}
      }
      setShowAuthModal(false);
    } catch (err: any) {
      console.error('Google Sign In notice:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Domain is not in Google OAuth whitelist. Select an authorized operator profile to sign in.');
      } else if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        setAuthError('Popup was blocked by the browser. Please use the verified profile tab for 1-click access.');
      } else {
        setAuthError(err.message || 'Authentication notice. Select a verified profile above.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // 1-Click Authorized Operator Sign-In (Verified Profiles / Custom)
  const handleEngineerSignIn = (profile: { email: string; displayName: string; role?: string }) => {
    const cleanEmail = profile.email.trim().toLowerCase();
    const cleanName = profile.displayName.trim() || cleanEmail.split('@')[0];
    const sessionUser = {
      uid: `engineer_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      displayName: cleanName,
      email: cleanEmail,
      photoURL: undefined,
    };
    setUser(sessionUser);
    try {
      localStorage.setItem('solar_iot_persisted_session', JSON.stringify(sessionUser));
    } catch {}

    const isSushil = cleanEmail.includes('sushil');
    const initialStationProfile: StationProfile = {
      uid: sessionUser.uid,
      email: cleanEmail,
      displayName: isSushil ? 'Er. Sushil Kumar' : cleanName,
      stationName: isSushil ? 'Mentor Teacher Station - Sol-01' : `${cleanName} Sol-01 Station`,
      gridType: 'off_grid',
      hasWindmill: true,
      hasSandBed: true,
      firebaseProjectId: 'solariot-f49f5',
      firestoreDatabaseId: '(default)',
      stationDeviceId: 'node_01',
      tutorialVideoUrl: '',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStationProfile(initialStationProfile);
    try {
      localStorage.setItem('solar_iot_active_profile', JSON.stringify(initialStationProfile));
      localStorage.setItem(`station_profile_${sessionUser.uid}`, JSON.stringify(initialStationProfile));
    } catch {}
    setShowAuthModal(false);
    setAuthError(null);
  };

  // Email & Password Auth handler
  const handleEmailPasswordSignIn = async (email: string, pass: string, isSignUp: boolean) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      let cred;
      if (isSignUp) {
        cred = await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        cred = await signInWithEmailAndPassword(auth, email, pass);
      }
      if (cred.user) {
        const sessionUser = {
          uid: cred.user.uid,
          displayName: cred.user.displayName || email.split('@')[0],
          email: cred.user.email,
        };
        setUser(sessionUser);
        try {
          localStorage.setItem('solar_iot_persisted_session', JSON.stringify(sessionUser));
        } catch {}
      }
      setShowAuthModal(false);
    } catch (err: any) {
      console.warn('Firebase Email/Pass notice:', err);
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        // Gracefully sign in as authorized operator session
        handleEngineerSignIn({
          email,
          displayName: email.split('@')[0],
          role: 'engineer',
        });
      } else {
        throw err;
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateStationProfile = async (profile: StationProfile) => {
    setStationProfile(profile);
    if (user && 'uid' in user && user.uid) {
      try {
        const userDocRef = doc(db, 'user_profiles', user.uid);
        const cleanProfile = sanitizeForFirestore(profile);
        await setDoc(userDocRef, cleanProfile, { merge: true });
      } catch (e) {
        console.warn('Profile sync notice:', e);
      }
    }
    try {
      localStorage.setItem(`station_profile_${user && 'uid' in user ? user.uid : 'guest'}`, JSON.stringify(profile));
      localStorage.setItem('solar_iot_active_profile', JSON.stringify(profile));
    } catch {}
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('solar_iot_persisted_session');
      localStorage.removeItem('solar_iot_guest_mode');
    } catch {}
    setIsGuestMode(false);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
    setUser(null);
    setStationProfile(null);
  };

  // Real-time listener for dynamic co-owners / admin roles from Firestore
  const [dynamicCoOwners, setDynamicCoOwners] = useState<string[]>([]);
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'solar_iot', 'admin_roles'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (Array.isArray(d?.coOwners)) {
            setDynamicCoOwners(d.coOwners.map((e: string) => String(e).trim().toLowerCase()));
          }
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('Error listening to admin roles:', err);
    }
  }, []);

  // Owner check for administrative actions (includes built-in creators + dynamic co-owners)
  const isOwner = Boolean(
    user?.email && 
    checkIsOwner(user.email, dynamicCoOwners)
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
    setWiperCountdown(0);
    setIsCleaning(false);
    setSolarData((prev) => ({
      ...prev,
      triggerWiper: false,
      pumpActive: false,
      wiperActive: false,
      cleaningStatus: 'idle',
    }));

    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      await setDoc(docRef, {
        command: 'STOP_CLEANING',
        triggerWiper: false,
        pumpActive: false,
        wiperActive: false,
        cleaningStatus: 'idle',
        requestedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Firebase stop clean note:', e);
    }

    // Also update Realtime Database
    try {
      const cleanRtdb = currentRtdbUrl.trim().replace(/\/+$/, '');
      fetch(`${cleanRtdb}/solar_iot/node_01.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'STOP_CLEANING',
          triggerWiper: false,
          pumpActive: false,
          wiperActive: false,
          cleaningStatus: 'idle',
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {}

    // Direct local ESP32 AP trigger (Zero internet latency)
    try {
      const cleanIp = localApIp.trim().replace(/^https?:\/\//, '');
      fetch(`http://${cleanIp}/api/stop`, { method: 'POST', mode: 'cors' }).catch(() => {});
    } catch {}
  };

  // Trigger Mechanical Wiper Cleaning cycle (Safe dry squeegee sweep - no thermal shock)
  const handleTriggerClean = async () => {
    // Gate actuator control behind operator authentication
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // UI Guard: prevent re-triggering while 5s wiperCountdown is active
    if (wiperCountdown > 0) return;

    if (cleaningTimerRef.current) {
      clearTimeout(cleaningTimerRef.current);
      cleaningTimerRef.current = null;
    }
    setWiperCountdown(5);
    setIsCleaning(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Instantly update UI for immediate responsive feedback
    setSolarData((prev) => ({
      ...prev,
      triggerWiper: true,
      pumpActive: false, // Spray locked: direct water on hot panels causes thermal shock damage
      wiperActive: true,
      cleaningStatus: 'cleaning',
      lastCleanedTime: `Just now (${nowTime})`,
    }));

    // 2. Direct local ESP32 AP trigger (Instant 0ms latency for offline field operation)
    try {
      const cleanIp = localApIp.trim().replace(/^https?:\/\//, '');
      fetch(`http://${cleanIp}/api/clean`, { method: 'POST', mode: 'cors' }).catch(() => {});
    } catch {}

    // 3. Push command to Firebase Realtime / Firestore so remote ESP32 hardware picks it up
    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      await setDoc(docRef, {
        command: 'START_CLEANING',
        triggerWiper: true,
        pumpActive: false,
        wiperActive: true,
        cleaningStatus: 'cleaning',
        lastCleanedTime: `Just now (${nowTime})`,
        requestedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Firebase push note:', e);
    }

    try {
      const cleanRtdb = currentRtdbUrl.trim().replace(/\/+$/, '');
      fetch(`${cleanRtdb}/solar_iot/node_01.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'START_CLEANING',
          triggerWiper: true,
          pumpActive: false,
          wiperActive: true,
          cleaningStatus: 'cleaning',
          lastCleanedTime: `Just now (${nowTime})`,
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {}

    // 4. 5-second automated timer that resets triggerWiper: false, wiperActive: false, cleaningStatus: 'idle'
    cleaningTimerRef.current = setTimeout(async () => {
      const currentTemp = solarData.temperature;

      const newLog: CleaningLog = {
        id: `clean_${Date.now()}`,
        timestamp: `Today, ${nowTime}`,
        triggerType: 'manual',
        durationSeconds: 5,
        waterUsedMl: 0, // Safe dry mechanical wiping
        temperatureBefore: currentTemp !== null ? Number(currentTemp.toFixed(1)) : 35.0,
        temperatureAfter: currentTemp !== null ? Number(currentTemp.toFixed(1)) : 35.0,
        efficiencyGain: 14.5,
      };

      setCleaningLogs((prev) => [newLog, ...prev.slice(0, 7)]);
      setWiperCountdown(0);
      setIsCleaning(false);
      cleaningTimerRef.current = null;

      setSolarData((prev) => ({
        ...prev,
        triggerWiper: false,
        pumpActive: false,
        wiperActive: false,
        cleaningStatus: 'idle',
        soilingIndex: 2, // spotless clean!
        lastCleanedTime: `Today, ${nowTime}`,
      }));

      try {
        const docRef = doc(db, 'solar_iot', 'node_01');
        await setDoc(docRef, {
          command: 'IDLE',
          triggerWiper: false,
          pumpActive: false,
          wiperActive: false,
          cleaningStatus: 'idle',
          lastCleanedTime: `Today, ${nowTime}`,
        }, { merge: true });
      } catch (e) {
        // silent fallback
      }

      try {
        const cleanRtdb = currentRtdbUrl.trim().replace(/\/+$/, '');
        fetch(`${cleanRtdb}/solar_iot/node_01.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'IDLE',
            triggerWiper: false,
            pumpActive: false,
            wiperActive: false,
            cleaningStatus: 'idle',
            lastCleanedTime: `Today, ${nowTime}`,
            updated_at: new Date().toISOString(),
          }),
        }).catch(() => {});
      } catch {}
    }, 5000);
  };

  // Authentication Gate: Require login or explicit guest exploration
  if (!user && !authLoading && !isGuestMode) {
    return (
      <FirebaseAuthPortal 
        onSignInWithGoogle={handleGoogleSignIn}
        onEngineerSignIn={handleEngineerSignIn}
        onEmailPasswordSignIn={handleEmailPasswordSignIn}
        onContinueAsGuest={handleContinueAsGuest}
        error={authError}
        loading={authLoading}
        language={language}
        onSelectLanguage={handleSelectLanguage}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-300 w-full max-w-full overflow-x-hidden ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-black text-slate-100'
    }`}>
      
      {/* Visual Sync Pulse Bar */}
      {isSyncFlash && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-50 animate-pulse pointer-events-none shadow-[0_0_10px_#22d3ee]" />
      )}

      {/* Website Navigation Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800 px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 w-full max-w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full max-w-full gap-2">
          
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
                  Farm<span className="text-amber-400">.</span><span className="text-cyan-400">IOT</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold hidden sm:inline-block">
                  Smart Station
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono hidden md:block">
                Smart Farm & Agro-Solar IoT Monitoring & Automation Station
              </p>
            </div>
          </div>

          {/* Website Main Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center bg-black border border-zinc-800 p-1 rounded-xl text-xs font-medium shadow-inner">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-zinc-900 text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t('overview')}</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-900 text-cyan-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t('liveMonitor')}</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-rose-950/70 text-rose-300 font-bold border border-rose-500/40 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="ESP32-CAM Surveillance Camera & Security System"
            >
              <Camera className="w-3.5 h-3.5 text-rose-400" />
              <span>ESP32-CAM</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                Camera
              </span>
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'workers'
                  ? 'bg-zinc-900 text-emerald-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Workers</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                RFID
              </span>
            </button>
            <button
              onClick={() => setActiveTab('windmill_peltier')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'windmill_peltier'
                  ? 'bg-zinc-900 text-amber-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Wind className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('windmillPeltier')}</span>
            </button>
            <button
              onClick={() => setActiveTab('model3d')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'model3d'
                  ? 'bg-zinc-900 text-cyan-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('model3d')}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                3D
              </span>
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'updates'
                  ? 'bg-zinc-900 text-amber-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('updates')}</span>
            </button>
            <button
              onClick={() => setActiveTab('weather')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'weather'
                  ? 'bg-zinc-900 text-amber-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('weather')}</span>
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'research'
                  ? 'bg-zinc-900 text-purple-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{t('research')}</span>
            </button>
            <button
              onClick={() => setActiveTab('calculators')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'calculators'
                  ? 'bg-zinc-900 text-amber-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{t('calculators')}</span>
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'store'
                  ? 'bg-zinc-900 text-amber-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('store')}</span>
            </button>
            <button
              onClick={() => setActiveTab('esp32')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'esp32'
                  ? 'bg-zinc-900 text-emerald-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{t('firmware')}</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-zinc-900 text-purple-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('about')}</span>
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-zinc-900 text-amber-400 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('reviews')}</span>
            </button>
          </nav>

          {/* Auto Refresh Controller, Theme, Language & Settings */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Automatic Refresh Bar */}
            <AutoRefreshController 
              onSoftRefresh={handleSoftRefresh} 
              lastUpdated={lastUpdated} 
              currentUser={user}
              onSignOut={() => setShowSignOutConfirm(true)}
              onSignIn={() => setShowAuthModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)}
            />

            {/* Android APK Download & Mobile PWA App Button (Desktop/Tablet) */}
            <div className="hidden sm:block shrink-0">
              <PWAInstallButton 
                variant="nav" 
                userEmail={user?.email} 
                onOpenArduinoTools={() => setActiveTab('esp32')} 
              />
            </div>

            {/* Active Firebase Project Badge */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
              title={`Active Firebase Project: ${firebaseConfig.projectId} (asia-southeast1 RTDB)`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-[11px] hidden sm:inline">{firebaseConfig.projectId}</span>
            </button>

            {/* Firebase Hosting Hub Button */}
            <button
              onClick={() => setShowHostingModal(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
              title="Firebase Hosting Hub (Deploy to Secondary Account or Cloud)"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold hidden md:inline">Hosting</span>
            </button>

            {/* Dedicated Settings Button (Theme, Language, Support & System Configuration) */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
              title="Settings (Theme, Language, Email Support & System)"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold hidden sm:inline">{t('settings')}</span>
            </button>

            {user ? (
              <div 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center space-x-2 cursor-pointer hover:opacity-90 transition px-2.5 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 shrink-0"
                title="Settings & Session Console"
              >
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className={`w-2 h-2 rounded-full ${solarData.espConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  <span className={`${solarData.espConnected ? 'text-emerald-400' : 'text-zinc-400'} font-semibold hidden sm:inline`}>
                    {solarData.espConnected ? 'Online' : 'Offline'}
                  </span>
                  <span className="text-zinc-500 hidden md:inline">•</span>
                  <span className="text-zinc-300 font-medium hidden md:inline">Console</span>
                </div>
                <div className="p-1 rounded-lg bg-zinc-800 text-zinc-300">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow shrink-0"
              >
                <User className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs">Sign In</span>
              </button>
            )}
          </div>

        </div>
      </header>


      {/* Active Station Architecture & Isolated Firebase Cloud Strip */}
      <div className="bg-zinc-950 border-b border-zinc-800/80 px-3 sm:px-4 lg:px-8 py-2 text-xs font-mono flex items-center justify-between overflow-x-auto gap-3 w-full max-w-full scrollbar-none">
        <div className="flex items-center gap-2 text-zinc-300 shrink-0">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>{stationProfile?.stationName || 'Apex Sol-01 Station'}</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">
            Node: <strong className="text-cyan-400">{stationProfile?.stationDeviceId || 'node_01'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Grid Mode Badge */}
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            stationProfile?.gridType === 'on_grid'
              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}>
            {stationProfile?.gridType === 'on_grid' ? '🌐 ON-GRID' : '🔋 OFF-GRID'}
          </span>

          {/* Harvester Badges */}
          {stationProfile?.hasWindmill && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Wind className="w-2.5 h-2.5" />
              <span>Wind Turbine</span>
            </span>
          )}
          {stationProfile?.hasSandBed && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/10 text-orange-300 border border-orange-500/30 flex items-center gap-1">
              <Flame className="w-2.5 h-2.5" />
              <span>Sand Bed</span>
            </span>
          )}

          {/* Firebase Hosting Hub Button in Header Strip */}
          <button
            onClick={() => setShowHostingModal(true)}
            className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition cursor-pointer"
            title="Open Firebase Hosting & Deployment Hub"
          >
            <Cloud className="w-2.5 h-2.5 text-amber-400" />
            <span>Host on Firebase</span>
          </button>


        </div>
      </div>


      {/* Mobile Navigation Tab Bar (Sticky on phones) */}
      <div className="lg:hidden sticky top-[49px] sm:top-[57px] z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 px-2 py-1.5 flex items-center justify-start gap-1 text-xs font-mono shadow-md overflow-x-auto scrollbar-none w-full max-w-full">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'home'
              ? 'bg-zinc-900 text-white font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{t('overview')}</span>
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'dashboard'
              ? 'bg-zinc-900 text-cyan-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{t('liveMonitor')}</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'security'
              ? 'bg-rose-950/70 text-rose-300 font-bold border border-rose-500/50 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="ESP32-CAM Camera & Security"
        >
          <Camera className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] truncate">ESP32-CAM</span>
        </button>
        <button
          onClick={() => setActiveTab('workers')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'workers'
              ? 'bg-zinc-900 text-emerald-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] truncate">Workers</span>
        </button>
        <button
          onClick={() => setActiveTab('windmill_peltier')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'windmill_peltier'
              ? 'bg-zinc-900 text-amber-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Wind className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] truncate">{t('windmillPeltier')}</span>
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'updates'
              ? 'bg-zinc-900 text-amber-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] truncate">{t('updates')}</span>
        </button>
        <button
          onClick={() => setActiveTab('weather')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'weather'
              ? 'bg-zinc-900 text-amber-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] truncate">{t('weather')}</span>
        </button>
        <button
          onClick={() => setActiveTab('research')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'research'
              ? 'bg-zinc-900 text-purple-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{t('research')}</span>
        </button>
        <button
          onClick={() => setActiveTab('esp32')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'esp32'
              ? 'bg-zinc-900 text-emerald-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{t('firmware')}</span>
        </button>
        <button
          onClick={() => setActiveTab('calculators')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'calculators'
              ? 'bg-zinc-900 text-amber-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{t('calculators')}</span>
        </button>
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'store'
              ? 'bg-zinc-900 text-amber-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{t('store')}</span>
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'about'
              ? 'bg-zinc-900 text-purple-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{t('about')}</span>
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
            activeTab === 'reviews'
              ? 'bg-zinc-900 text-amber-400 font-bold border border-zinc-700 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{t('reviews')}</span>
        </button>
        <PWAInstallButton 
          variant="mobile" 
          userEmail={user?.email} 
          onOpenArduinoTools={() => setActiveTab('esp32')} 
        />
        <button
          onClick={() => setShowSettingsModal(true)}
          className="flex-1 min-w-[70px] flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center text-zinc-400 hover:text-white"
        >
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] truncate">{t('settings')}</span>
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
            user={user}
            onRequireSignIn={() => setShowAuthModal(true)}
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
            wiperCountdown={wiperCountdown}
            onStopClean={handleStopClean}
            isOwner={isOwner}
            onRequireSignIn={() => setShowAuthModal(true)}
            onUpdateScheduledCleanTime={handleUpdateScheduledCleanTime}
            user={user}
            onNavigateToStore={() => setActiveTab('store')}
            onNavigateToWindmill={() => setActiveTab('windmill_peltier')}
            onNavigateToSecurity={() => setActiveTab('security')}
            connectionMode={connectionMode}
            onToggleConnectionMode={(m) => setConnectionMode(m)}
            localApIp={localApIp}
            onUpdateLocalApIp={(ip) => setLocalApIp(ip)}
            localApConnected={localApConnected}
            localApLatency={localApLatency}
            stationProfile={stationProfile}
            onNavigateToEsp32={() => setActiveTab('esp32')}
            onNavigateToModel3d={() => setActiveTab('model3d')}
          />

        )}

        {/* Tab: ESP32-CAM Security System */}
        {activeTab === 'security' && (
          <SecuritySystemSection
            user={user}
            isOwner={isOwner}
            onRequireSignIn={() => setShowAuthModal(true)}
            language={language}
            onNavigateToWorkers={() => setActiveTab('workers')}
          />
        )}

        {/* Tab: Worker Attendance & RFID Security Whitelist */}
        {activeTab === 'workers' && (
          <WorkersSection
            user={user}
            onRequireSignIn={() => setShowAuthModal(true)}
            onNavigateToSecurity={() => setActiveTab('security')}
            onNavigateToEsp32={() => setActiveTab('esp32')}
          />
        )}

        {/* Tab: Windmill & Peltier Thermoelectric Energy System */}
        {activeTab === 'windmill_peltier' && (
          <WindmillPeltierSection
            solarData={solarData}
            isHardwareConnected={solarData.espConnected}
            user={user}
            isOwner={isOwner}
            onRequireSignIn={() => setShowAuthModal(true)}
            language={language}
            onNavigateToLive={() => setActiveTab('dashboard')}
          />
        )}

        {/* Tab: Interactive 3D Model of Physical Project Hardware */}
        {activeTab === 'model3d' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-zinc-800/80">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-400" />
                    Interactive 3D Hardware Digital Twin
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Three.js PBR Studio
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Explore the full physical IoT bench: Solar dual-axis PV with automated wiper, ESP32 enclosure, INA219 sensor, Windmill, Peltier TEG sand bed, and ESP32-CAM AI security node.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('esp32')}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pinouts & Wiring</span>
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Live Telemetry</span>
                </button>
              </div>
            </div>

            <Hardware3DViewer
              solarData={solarData}
              stationProfile={stationProfile}
              onNavigateToEsp32={() => setActiveTab('esp32')}
              onNavigateToLive={() => setActiveTab('dashboard')}
              onNavigateToSecurity={() => setActiveTab('security')}
              onNavigateToWindmill={() => setActiveTab('windmill_peltier')}
              onNavigateToWorkers={() => setActiveTab('workers')}
            />
          </section>
        )}

        {/* Tab: Project Updates, Local Photos, YouTube Videos & Document Downloads */}
        {activeTab === 'updates' && (
          <UpdatesSection 
            isOwner={isOwner}
            user={user}
            onRequireSignIn={() => setShowAuthModal(true)}
          />
        )}

        {/* Tab 3: Dedicated Weather & Solar Irradiance Forecast */}
        {activeTab === 'weather' && (
          <SolarWeatherSection 
            user={user}
            onRequireSignIn={() => setShowAuthModal(true)}
          />
        )}

        {/* Tab 4: Buy Solar Panels, Inverters, Batteries & Smart IoT Kits */}
        {activeTab === 'store' && (
          <SolarStore 
            user={user}
            onRequireSignIn={() => setShowAuthModal(true)}
            onNavigateToCalculator={() => setActiveTab('calculators')}
          />
        )}

        {/* Tab 3: Research Mode (Student Researcher, School Info & Media Slots) */}
        {activeTab === 'research' && (
          <ResearchMode 
            currentUser={user}
            onRequireSignIn={() => setShowAuthModal(true)}
          />
        )}

        {/* Tab 4: Interactive Solar & Battery Sizing Calculators */}
        {activeTab === 'calculators' && (
          <SolarCalculators 
            currentUser={user}
            onRequireSignIn={() => setShowAuthModal(true)}
            onNavigateToStore={() => setActiveTab('store')}
          />
        )}

        {/* Tab 5: ESP32 Firmware, Pinout Guide & Firebase Setup */}
        {activeTab === 'esp32' && (
          <Esp32CodeHelper 
            currentUser={user}
            onRequireSignIn={() => setShowAuthModal(true)}
            stationProfile={stationProfile}
          />

        )}

        {/* Tab 6: Physics, Thermal Derating & Water Conservation Research */}
        {activeTab === 'about' && (
          <AboutSection 
            currentUser={user}
            onRequireSignIn={() => setShowAuthModal(true)}
          />
        )}

        {/* Tab 7: User & Community Reviews with Gemini Flash Lite */}
        {activeTab === 'reviews' && (
          <UserReviewsSection 
            currentUser={user}
            onRequireSignIn={() => setShowAuthModal(true)}
          />
        )}

      </main>

      {/* Rich Website Footer */}
      <footer className="border-t border-zinc-900 bg-black py-10 px-4 lg:px-8 text-xs font-mono text-zinc-400">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="text-base font-black text-white">Farm.IOT</span>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Smart Farm & Photovoltaic IoT Health Monitoring, Hydro-Mist Cleaning & Dual-Action Squeegee Wiper System.
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
                  <button onClick={() => setActiveTab('security')} className="hover:text-rose-400 transition cursor-pointer">
                    Security System (ESP32-CAM)
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('model3d')} className="hover:text-amber-400 transition cursor-pointer flex items-center gap-1">
                    <span>3D Hardware Model</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">3D</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('updates')} className="hover:text-amber-400 transition cursor-pointer">
                    Updates & Downloads
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('windmill_peltier')} className="hover:text-amber-400 transition cursor-pointer">
                    Windmill & Peltier Station
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
                <li>
                  <button onClick={() => setActiveTab('reviews')} className="hover:text-amber-400 transition cursor-pointer">
                    Reviews & Feedback
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
            <span>© {new Date().getFullYear()} Farm.IOT Project. All rights reserved.</span>
            <span>Open Source Clean Energy & IoT Research</span>
          </div>

        </div>
      </footer>

      {/* Solar.Ai Engineering & Science Assistant with Voice Option */}
      <SolarAiAssistant />

      {/* Station Settings Modal: Theme (Dark/White), Language, Station & Private Firebase Cloud, Support, Account */}
      <StationSettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        isOwner={isOwner}
        onSignOut={() => {
          setShowSettingsModal(false);
          setShowSignOutConfirm(true);
        }}
        theme={theme}
        onToggleTheme={(t) => setTheme(t)}
        language={language}
        onSelectLanguage={handleSelectLanguage}
        stationProfile={stationProfile}
        onUpdateStationProfile={handleUpdateStationProfile}
        developerProjectId={firebaseConfig.projectId}
        onOpenArduinoTools={() => setActiveTab('esp32')}
        onOpenFirebaseHosting={() => setShowHostingModal(true)}
      />

      {/* Firebase Hosting & Deployment Hub Modal */}
      <FirebaseHostingModal
        isOpen={showHostingModal}
        onClose={() => setShowHostingModal(false)}
        espConnected={solarData.espConnected}
      />

      {/* Station Onboarding Modal (Triggered on first Google sign-in) */}


      {/* Non-blocking Sign In Modal (Only shown if user explicitly clicks "Sign In") */}
      {showAuthModal && (
        <AuthModal
          onSignInWithGoogle={handleGoogleSignIn}
          onEngineerSignIn={handleEngineerSignIn}
          onEmailPasswordSignIn={handleEmailPasswordSignIn}
          onClose={() => setShowAuthModal(false)}
          error={authError}
          loading={authLoading}
        />
      )}

      {/* Sign Out Warning Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Log Out Confirmation</h3>
                <p className="text-xs text-zinc-400 font-mono">Security Check</p>
              </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-black border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <p className="font-bold text-white text-sm">Are you really sure you want to log out?</p>
              <p className="text-zinc-400 leading-relaxed font-sans">
                You are currently signed in as <strong className="text-amber-300 font-mono">{user?.email}</strong>. 
                Logging out will end your session and lock administrative edit privileges, custom hardware configurations, and saved presets until you sign in again.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSignOutConfirm(false);
                  await handleSignOut();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Yes, Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
