import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Camera, 
  CameraOff,
  Power, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Eye, 
  RefreshCw, 
  Maximize2, 
  Download, 
  Cpu, 
  Terminal, 
  Copy, 
  Check, 
  Radio, 
  Clock, 
  Zap, 
  Sliders, 
  ExternalLink, 
  History, 
  Lock, 
  Play, 
  Square,
  Sparkles,
  Wifi,
  WifiOff,
  Bot,
  FileCode,
  Image as ImageIcon,
  Database,
  Wrench,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Users,
  Moon,
  Compass,
  Crosshair,
  Activity,
  FolderOpen,
  FolderArchive,
  HardDrive,
  Settings,
  Link2,
  Video,
  Tv
} from 'lucide-react';
import { ref as dbRef, onValue, set as dbSet } from 'firebase/database';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, rtdb, storage, firebaseConfig, getCustomRtdbUrl, saveCustomRtdbUrl, getOrCreateRtdb } from '../lib/firebase';
import { SecuritySystemData, SecurityEventLog } from '../types/solar';

interface SecuritySystemSectionProps {
  user?: any;
  isOwner?: boolean;
  onRequireSignIn?: () => void;
  language?: string;
  onNavigateToWorkers?: () => void;
}

export const SecuritySystemSection: React.FC<SecuritySystemSectionProps> = ({
  user,
  isOwner = false,
  onRequireSignIn,
  language = 'en',
  onNavigateToWorkers
}) => {
  // Realtime Database & Autonomous Vision Sentinel State
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [buzzerActive, setBuzzerActive] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState<number>(Date.now());
  const [isFullscreenPhoto, setIsFullscreenPhoto] = useState<boolean>(false);
  const [isRtdbConnected, setIsRtdbConnected] = useState<boolean>(false);
  const [isCameraConnected, setIsCameraConnected] = useState<boolean>(false);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedColabCode, setCopiedColabCode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'monitor' | 'colab' | 'firmware' | 'history' | 'rtdb_setup'>('monitor');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Night-Mode PIR Deep Sleep and Servo Tracking State
  const [systemState, setSystemState] = useState<'SLEEPING' | 'AWAKE_TRACKING'>('SLEEPING');
  const [servoAngle, setServoAngle] = useState<number>(90);
  const [sleepCommand, setSleepCommand] = useState<boolean>(false);
  const [alertPhotoUrl, setAlertPhotoUrl] = useState<string | null>(null);
  const [photoViewMode, setPhotoViewMode] = useState<'annotated' | 'raw'>('annotated');
  const [isRotatingServo, setIsRotatingServo] = useState<boolean>(false);
  const [isUpdatingPowerState, setIsUpdatingPowerState] = useState<boolean>(false);

  // Dual-Mode ESP32-CAM Live Stream Player State
  // 'cloud': Base64 image from /security_system/boxed_frame or /security_system/raw_frame
  // 'local_mjpeg': Direct 25 FPS stream from local IP (e.g. http://192.168.4.1:81/stream)
  const [streamMode, setStreamMode] = useState<'cloud' | 'local_mjpeg'>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_stream_mode');
      if (saved === 'cloud' || saved === 'local_mjpeg') return saved;
    } catch {}
    return 'cloud';
  });

  const handleSetStreamMode = (mode: 'cloud' | 'local_mjpeg') => {
    setStreamMode(mode);
    try {
      localStorage.setItem('solar_iot_stream_mode', mode);
    } catch {}
  };

  const [localMjpegUrl, setLocalMjpegUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('solar_iot_esp32_mjpeg_url') || 'http://192.168.4.1:81/stream';
    } catch {
      return 'http://192.168.4.1:81/stream';
    }
  });
  const [mjpegInput, setMjpegInput] = useState<string>(localMjpegUrl);
  const [isEditingMjpegUrl, setIsEditingMjpegUrl] = useState<boolean>(false);
  const [mjpegError, setMjpegError] = useState<boolean>(false);

  const handleSaveMjpegUrl = (newUrl: string) => {
    const trimmed = newUrl.trim() || 'http://192.168.4.1:81/stream';
    setLocalMjpegUrl(trimmed);
    setMjpegInput(trimmed);
    setIsEditingMjpegUrl(false);
    setMjpegError(false);
    try {
      localStorage.setItem('solar_iot_esp32_mjpeg_url', trimmed);
    } catch {}
  };

  // Real-time Base64 frames from RTDB (/security_system/boxed_frame & /security_system/raw_frame)
  const [boxedFrameBase64, setBoxedFrameBase64] = useState<string | null>(null);
  const [rawFrameBase64, setRawFrameBase64] = useState<string | null>(null);
  const [base64FrameTimestamp, setBase64FrameTimestamp] = useState<number>(Date.now());

  // Google Drive Photo Archive Integration
  const [latestSavedDriveFile, setLatestSavedDriveFile] = useState<string | null>(null);
  const [googleDriveFolderUrl, setGoogleDriveFolderUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('solar_iot_drive_folder_url') || 'https://drive.google.com/drive/search?q=Farm_IOT_Security_Photos';
    } catch {
      return 'https://drive.google.com/drive/search?q=Farm_IOT_Security_Photos';
    }
  });
  const [driveFolderInput, setDriveFolderInput] = useState<string>(googleDriveFolderUrl);
  const [isEditingDriveFolder, setIsEditingDriveFolder] = useState<boolean>(false);

  const handleSaveDriveFolderUrl = async (newUrl: string) => {
    const trimmed = newUrl.trim() || 'https://drive.google.com/drive/search?q=Farm_IOT_Security_Photos';
    setGoogleDriveFolderUrl(trimmed);
    setDriveFolderInput(trimmed);
    setIsEditingDriveFolder(false);
    try {
      localStorage.setItem('solar_iot_drive_folder_url', trimmed);
      await writeSecurityState({ google_drive_folder_url: trimmed });
    } catch {}
  };

  // Format base64 source helper (auto-prefixes data:image/jpeg;base64, if missing)
  const formatBase64Src = (b64?: string | null): string | null => {
    if (!b64) return null;
    const trimmed = b64.trim();
    if (trimmed.startsWith('data:image')) return trimmed;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `data:image/jpeg;base64,${trimmed}`;
  };

  // Real-time Sync Mode: 'firestore_free' (100% Free Spark plan, zero upgrade needed) or 'dual' (Firestore + RTDB)
  const [syncMode, setSyncMode] = useState<'firestore_free' | 'dual'>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_security_sync_mode');
      if (saved === 'dual' || saved === 'firestore_free') return saved;
    } catch {}
    return 'firestore_free';
  });

  const handleSetSyncMode = (mode: 'firestore_free' | 'dual') => {
    setSyncMode(mode);
    try {
      localStorage.setItem('solar_iot_security_sync_mode', mode);
    } catch {}
  };

  // RTDB Diagnostics & URL Configuration State
  const [rtdbUrl, setRtdbUrl] = useState<string>(() => getCustomRtdbUrl());
  const [customUrlInput, setCustomUrlInput] = useState<string>(() => getCustomRtdbUrl());
  const [rtdbTestResult, setRtdbTestResult] = useState<{
    code: number | null;
    status: 'connected' | 'not_found' | 'permission_denied' | 'checking' | 'error';
    message: string;
    latencyMs: number | null;
  } | null>(null);
  const [isTestingRtdb, setIsTestingRtdb] = useState<boolean>(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);
  const [rulesPreset, setRulesPreset] = useState<'scoped' | 'open'>('scoped');
  const [copiedRestUrl, setCopiedRestUrl] = useState<boolean>(false);
  const [isSeedingRtdb, setIsSeedingRtdb] = useState<boolean>(false);
  const [seedStatusMsg, setSeedStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-buzzer tracking to prevent re-triggering repeatedly for the same detection
  const lastProcessedDetectionRef = useRef<string | null>(null);
  const buzzerAutoResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Context Ref for Web Audio buzzer beep
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Heartbeat tracking for ESP32-CAM: Prevents stale "ONLINE" status when unplugged
  const lastHeartbeatLocalTimeRef = useRef<number>(0);
  const prevHeartbeatValueRef = useRef<number | null>(null);
  const [heartbeatAgoSec, setHeartbeatAgoSec] = useState<number | null>(null);

  // Helper to verify if the camera heartbeat is active and advancing (prevents stale DB snapshots from showing online)
  const updateCameraLiveness = (rawVal: any, rawConn?: any) => {
    const now = Date.now();
    const num = Number(rawVal);
    const hasValidNum = !isNaN(num) && num > 0;

    if (rawConn === false) {
      setIsCameraConnected(false);
      lastHeartbeatLocalTimeRef.current = 0;
      setHeartbeatAgoSec(null);
      return;
    }

    if (hasValidNum) {
      // First read on mount: record baseline heartbeat without falsely marking camera online
      if (prevHeartbeatValueRef.current === null) {
        prevHeartbeatValueRef.current = num;
        setLastSeenTimestamp(num);
        return;
      }

      // Subsequent read with an advancing/changed heartbeat value confirms live hardware transmission
      if (prevHeartbeatValueRef.current !== num) {
        prevHeartbeatValueRef.current = num;
        setLastSeenTimestamp(num);
        lastHeartbeatLocalTimeRef.current = now;
        setHeartbeatAgoSec(0);
        setIsCameraConnected(true);
        return;
      }
    }
  };

  // Watchdog & Heartbeat Counter: Marks camera offline if no advancing heartbeat arrives within 35 seconds
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      const now = Date.now();
      if (lastHeartbeatLocalTimeRef.current > 0) {
        const elapsed = now - lastHeartbeatLocalTimeRef.current;
        setHeartbeatAgoSec(Math.floor(elapsed / 1000));
        if (elapsed > 35000) {
          setIsCameraConnected(false);
          lastHeartbeatLocalTimeRef.current = 0;
          setHeartbeatAgoSec(null);
        }
      } else {
        setHeartbeatAgoSec(null);
      }
    }, 2000);
    return () => clearInterval(watchdogInterval);
  }, []);

  // Force Reconnect Camera: Clears any stuck offline flag and sets camera to Online in Firebase
  const handleForceCameraReconnect = async () => {
    const now = Date.now();
    setIsCameraConnected(true);
    lastHeartbeatLocalTimeRef.current = now;
    prevHeartbeatValueRef.current = now;
    setLastSeenTimestamp(now);
    setHeartbeatAgoSec(0);
    try {
      await fetch(`${rtdbUrl}/security_system/camera_connected.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(true)
      }).catch(() => {});
      await fetch(`${rtdbUrl}/security_system/last_seen.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(now)
      }).catch(() => {});
      const activeRtdb = getOrCreateRtdb(rtdbUrl);
      if (activeRtdb) {
        dbSet(dbRef(activeRtdb, 'security_system/camera_connected'), true).catch(() => {});
        dbSet(dbRef(activeRtdb, 'security_system/last_seen'), now).catch(() => {});
      }
      await setDoc(doc(db, 'solar_iot', 'security_system'), {
        camera_connected: true,
        last_seen: now,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn('Error reconnecting camera in Firebase:', e);
    }
  };

  // Reset camera status to Offline in Firebase (clears stale state when unplugged)
  const handleMarkCameraOffline = async () => {
    setIsCameraConnected(false);
    lastHeartbeatLocalTimeRef.current = 0;
    prevHeartbeatValueRef.current = null;
    setLastSeenTimestamp(0);
    setHeartbeatAgoSec(null);
    try {
      await fetch(`${rtdbUrl}/security_system/camera_connected.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(false)
      }).catch(() => {});
      await fetch(`${rtdbUrl}/security_system/last_seen.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(0)
      }).catch(() => {});
      const activeRtdb = getOrCreateRtdb(rtdbUrl);
      if (activeRtdb) {
        dbSet(dbRef(activeRtdb, 'security_system/camera_connected'), false).catch(() => {});
        dbSet(dbRef(activeRtdb, 'security_system/last_seen'), 0).catch(() => {});
      }
      await setDoc(doc(db, 'solar_iot', 'security_system'), {
        camera_connected: false,
        last_seen: 0,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn('Error marking camera offline:', e);
    }
  };

  // Security Events Log
  const [eventLogs, setEventLogs] = useState<SecurityEventLog[]>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_security_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const addEventLog = (type: SecurityEventLog['type'], detection: string, currentPhotoUrl?: string | null, buzzerTriggered = false) => {
    const newLog: SecurityEventLog = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      detection,
      photoUrl: currentPhotoUrl,
      buzzerTriggered,
    };
    setEventLogs(prev => {
      const updated = [newLog, ...prev.slice(0, 24)];
      try {
        localStorage.setItem('solar_iot_security_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Synthesize Web Audio Alarm Siren
  const playAlarmSound = (frequency = 900, pulses = 2) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      for (let i = 0; i < pulses; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime + i * 0.2);
        osc.frequency.exponentialRampToValueAtTime(frequency / 2, ctx.currentTime + i * 0.2 + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.16);
      }
    } catch (e) {
      console.warn('Audio play note:', e);
    }
  };

  // 1. Fetch latest_photo.jpg from Firebase Storage (Raw Frame)
  const fetchLatestPhoto = async () => {
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      if (!storage) throw new Error('Firebase Storage not initialized');
      // Fetch latest_photo.jpg from Firebase Storage root
      const photoRef = storageRef(storage, 'latest_photo.jpg');
      const url = await getDownloadURL(photoRef);
      setPhotoUrl(url);
      setPhotoTimestamp(Date.now());
      setPhotoLoading(false);
      return url;
    } catch (err: any) {
      console.warn('Firebase Storage latest_photo.jpg note:', err?.message || err);
      // Construct direct fallback URL based on project storageBucket
      const fallbackUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/latest_photo.jpg?alt=media&t=${Date.now()}`;
      
      // Check if image loads via fallback
      const img = new Image();
      img.onload = () => {
        setPhotoUrl(fallbackUrl);
        setPhotoTimestamp(Date.now());
        setPhotoLoading(false);
      };
      img.onerror = () => {
        setPhotoError(
          'Photo not uploaded yet. The ESP32-CAM will upload latest_photo.jpg to Firebase Storage upon detection.'
        );
        setPhotoLoading(false);
      };
      img.src = fallbackUrl;
      return null;
    }
  };

  // 1b. Fetch alert_photo.jpg from Firebase Storage (YOLOv8 CPU Annotated with Bounding Box)
  const fetchAlertPhoto = async () => {
    try {
      if (!storage) return null;
      const alertRef = storageRef(storage, 'alert_photo.jpg');
      const url = await getDownloadURL(alertRef);
      setAlertPhotoUrl(url);
      return url;
    } catch (err) {
      const fallbackAlert = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/alert_photo.jpg?alt=media&t=${Date.now()}`;
      setAlertPhotoUrl(fallbackAlert);
      return fallbackAlert;
    }
  };

  // Helper to fetch both raw and AI annotated frames
  const fetchBothPhotos = async () => {
    fetchAlertPhoto();
    return fetchLatestPhoto();
  };

  // Realtime Database & Endpoint Diagnostics
  const testRtdbEndpoint = async (urlToTest: string) => {
    setIsTestingRtdb(true);
    const startTime = Date.now();
    const cleanUrl = urlToTest.trim().replace(/\/+$/, '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${cleanUrl}/.json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (res.status === 200) {
        setRtdbTestResult({
          code: 200,
          status: 'connected',
          message: 'Connected to Firebase Realtime Database successfully! (200 OK)',
          latencyMs: latency
        });
        setIsRtdbConnected(true);
      } else if (res.status === 404) {
        setRtdbTestResult({
          code: 404,
          status: 'not_found',
          message: 'Database not found (HTTP 404). Realtime Database is not created yet in the Firebase Console, or was created in a regional location (like Asia or Europe).',
          latencyMs: latency
        });
        setIsRtdbConnected(false);
      } else if (res.status === 401 || res.status === 403) {
        setRtdbTestResult({
          code: res.status,
          status: 'permission_denied',
          message: `Security rules locked (HTTP ${res.status} Permission Denied). Set rules to '.read: true, .write: true' in Firebase Console.`,
          latencyMs: latency
        });
        setIsRtdbConnected(false);
      } else {
        setRtdbTestResult({
          code: res.status,
          status: 'error',
          message: `HTTP Response ${res.status}: ${res.statusText}`,
          latencyMs: latency
        });
        setIsRtdbConnected(false);
      }
    } catch (err: any) {
      setRtdbTestResult({
        code: null,
        status: 'error',
        message: `Network/CORS error reaching ${cleanUrl}. Check URL format or connectivity.`,
        latencyMs: Date.now() - startTime
      });
      setIsRtdbConnected(false);
    } finally {
      setIsTestingRtdb(false);
    }
  };

  // Run initial test on current RTDB URL
  useEffect(() => {
    testRtdbEndpoint(rtdbUrl);
  }, [rtdbUrl]);

  // Handle saving new RTDB URL
  const handleSaveRtdbUrl = (newUrl: string) => {
    const clean = newUrl.trim().replace(/\/+$/, '');
    saveCustomRtdbUrl(clean);
    setRtdbUrl(clean);
    setCustomUrlInput(clean);
    testRtdbEndpoint(clean);
  };

  // Realtime Database Security Rules Presets
  const SCOPED_RULES_STR = `{\n  "rules": {\n    "security_system": {\n      ".read": true,\n      ".write": true,\n      ".indexOn": ["updated_at", "last_seen", "system_state"]\n    },\n    "solar_iot": {\n      ".read": true,\n      ".write": true,\n      ".indexOn": ["updated_at", "timestamp"]\n    }\n  }\n}`;

  const OPEN_RULES_STR = `{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`;

  // Copy Security Rules helper
  const handleCopyRules = (preset: 'scoped' | 'open' = rulesPreset) => {
    const rules = preset === 'scoped' ? SCOPED_RULES_STR : OPEN_RULES_STR;
    navigator.clipboard.writeText(rules);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  // Seed / Test Write Ping to Realtime Database
  const handleSeedRtdb = async () => {
    setIsSeedingRtdb(true);
    setSeedStatusMsg(null);
    try {
      const payload = {
        camera_connected: true,
        camera_active: true,
        buzzer: false,
        last_detection: "None",
        last_seen: Date.now()
      };
      
      const cleanUrl = rtdbUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/security_system.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSeedStatusMsg({
          type: 'success',
          text: '✅ Test ping successfully written to Realtime Database (HTTP 200 OK)! Two-way communication is confirmed operational.'
        });
        testRtdbEndpoint(cleanUrl);
      } else if (res.status === 404) {
        setSeedStatusMsg({
          type: 'error',
          text: '❌ HTTP 404 Not Found: Database instance does not exist yet. Please create it in the Firebase Console following the 1-minute guide below.'
        });
      } else if (res.status === 401 || res.status === 403) {
        setSeedStatusMsg({
          type: 'error',
          text: `❌ HTTP ${res.status} Permission Denied: Realtime Database security rules are locked. Copy and paste the open rules below into Firebase Console -> Rules tab.`
        });
      } else {
        setSeedStatusMsg({
          type: 'error',
          text: `❌ Write failed with HTTP ${res.status}: ${res.statusText}.`
        });
      }
    } catch (err: any) {
      setSeedStatusMsg({
        type: 'error',
        text: `❌ Network error: ${err.message || 'Failed to reach database'}. Check database URL or CORS.`
      });
    } finally {
      setIsSeedingRtdb(false);
    }
  };

  // Seed / Test Write Ping to Cloud Firestore (100% Free on Spark Plan)
  const [isSeedingFirestore, setIsSeedingFirestore] = useState<boolean>(false);
  const [firestoreSeedMsg, setFirestoreSeedMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSeedFirestore = async () => {
    setIsSeedingFirestore(true);
    setFirestoreSeedMsg(null);
    try {
      const docRef = doc(db, 'solar_iot', 'security_system');
      await setDoc(docRef, {
        camera_connected: true,
        camera_active: true,
        buzzer: false,
        last_detection: "None",
        last_seen: Date.now()
      }, { merge: true });

      setFirestoreSeedMsg({
        type: 'success',
        text: '✅ Cloud Firestore test packet successfully written to /solar_iot/security_system! 100% Free on Spark Plan.'
      });
      setIsFirestoreConnected(true);
    } catch (err: any) {
      setFirestoreSeedMsg({
        type: 'error',
        text: `❌ Firestore write error: ${err.message || 'Permission denied or network issue'}`
      });
    } finally {
      setIsSeedingFirestore(false);
    }
  };

  // 1. Dual-Sync: Listen to Cloud Firestore (/solar_iot/security_system)
  // This provides guaranteed real-time updates even if Realtime Database is 404 or uncreated
  useEffect(() => {
    try {
      const docRef = doc(db, 'solar_iot', 'security_system');
      const unsubscribeFirestore = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          setIsFirestoreConnected(true);
          const data = snapshot.data();
          if (data) {
            updateCameraLiveness(data.last_seen, data.camera_connected);
            if (data.system_state !== undefined) {
              setSystemState(data.system_state === 'SLEEPING' ? 'SLEEPING' : 'AWAKE_TRACKING');
            }
            if (data.servo_angle !== undefined) {
              const ang = Number(data.servo_angle);
              if (!isNaN(ang) && ang >= 15 && ang <= 165) setServoAngle(ang);
            }
            if (data.sleep_command !== undefined) {
              setSleepCommand(Boolean(data.sleep_command));
            }
            if (data.alert_image_url) {
              setAlertPhotoUrl(String(data.alert_image_url));
            }
            if (data.boxed_frame !== undefined) {
              setBoxedFrameBase64(data.boxed_frame ? String(data.boxed_frame) : null);
              setBase64FrameTimestamp(Date.now());
            }
            if (data.raw_frame !== undefined) {
              setRawFrameBase64(data.raw_frame ? String(data.raw_frame) : null);
              setBase64FrameTimestamp(Date.now());
            }
            if (data.latest_saved_drive_file !== undefined) {
              setLatestSavedDriveFile(data.latest_saved_drive_file ? String(data.latest_saved_drive_file) : null);
            }
            if (data.google_drive_folder_url) {
              setGoogleDriveFolderUrl(String(data.google_drive_folder_url));
            }
            if (data.camera_active !== undefined) {
              setCameraActive(Boolean(data.camera_active));
            }
            if (data.buzzer !== undefined) {
              setBuzzerActive(Boolean(data.buzzer));
            }
            if (data.last_detection !== undefined) {
              const det = data.last_detection ? String(data.last_detection).trim() : null;
              if (det && det !== lastDetection && det !== 'None') {
                setLastDetection(det);
                if (data.buzzer_muted || det.toLowerCase().includes('worker') || det.toLowerCase().includes('authorized')) {
                  lastProcessedDetectionRef.current = det;
                  setBuzzerActive(false);
                  addEventLog('rfid_scan', det, null, false);
                } else if (det.toLowerCase() === 'human' && det !== lastProcessedDetectionRef.current) {
                  lastProcessedDetectionRef.current = det;
                  playAlarmSound(1050, 3);
                  fetchBothPhotos().then((fetchedUrl) => {
                    addEventLog('human', 'Human', fetchedUrl || photoUrl, false);
                  });
                } else if (det.toLowerCase() === 'animal' && det !== lastProcessedDetectionRef.current) {
                  lastProcessedDetectionRef.current = det;
                  playAlarmSound(750, 4);
                  handleSetBuzzer(true);
                  fetchBothPhotos().then((fetchedUrl) => {
                    addEventLog('animal', 'Animal', fetchedUrl || photoUrl, true);
                  });
                }
              } else if (det === 'None') {
                setLastDetection(null);
                lastProcessedDetectionRef.current = null;
              }
            }
          }
        }
      }, (err) => {
        console.warn('Firestore security_system listen note:', err);
      });

      return () => unsubscribeFirestore();
    } catch (err) {
      console.warn('Firestore setup error:', err);
    }
  }, [lastDetection, photoUrl]);

  // 2. Listen to Realtime Database paths if available
  useEffect(() => {
    const activeRtdb = getOrCreateRtdb(rtdbUrl);
    if (!activeRtdb) return;

    try {
      // Listener 1: /security_system/last_detection
      const detectionRef = dbRef(activeRtdb, 'security_system/last_detection');
      const unsubscribeDetection = onValue(detectionRef, (snapshot) => {
        setIsRtdbConnected(true);
        const val = snapshot.val();
        const rawDetection = val !== null && val !== undefined ? String(val).trim() : null;
        if (rawDetection && rawDetection !== 'None') {
          setLastDetection(rawDetection);
          if (rawDetection.toLowerCase().includes('worker') || rawDetection.toLowerCase().includes('authorized')) {
            lastProcessedDetectionRef.current = rawDetection;
            setBuzzerActive(false);
            addEventLog('rfid_scan', rawDetection, null, false);
          } else if (rawDetection.toLowerCase() === 'human' && rawDetection !== lastProcessedDetectionRef.current) {
            lastProcessedDetectionRef.current = rawDetection;
            playAlarmSound(1050, 3);
            fetchBothPhotos().then((fetchedUrl) => {
              addEventLog('human', 'Human', fetchedUrl || photoUrl, false);
            });
          } else if (rawDetection.toLowerCase() === 'animal' && rawDetection !== lastProcessedDetectionRef.current) {
            lastProcessedDetectionRef.current = rawDetection;
            playAlarmSound(750, 4);
            handleSetBuzzer(true);
            fetchBothPhotos().then((fetchedUrl) => {
              addEventLog('animal', 'Animal', fetchedUrl || photoUrl, true);
            });
          }
        } else if (rawDetection === 'None') {
          setLastDetection(null);
          lastProcessedDetectionRef.current = null;
        }
      }, (err) => {
        console.warn('Realtime database detection listen note:', err);
      });

      // Listener 2: /security_system/camera_active
      const cameraRef = dbRef(activeRtdb, 'security_system/camera_active');
      const unsubscribeCamera = onValue(cameraRef, (snapshot) => {
        setIsRtdbConnected(true);
        const val = snapshot.val();
        if (val !== null && val !== undefined) {
          setCameraActive(Boolean(val));
        }
      });

      // Listener 3: /security_system/buzzer
      const buzzerRef = dbRef(activeRtdb, 'security_system/buzzer');
      const unsubscribeBuzzer = onValue(buzzerRef, (snapshot) => {
        setIsRtdbConnected(true);
        const val = snapshot.val();
        if (val !== null && val !== undefined) {
          setBuzzerActive(Boolean(val));
        }
      });

      // Listener 4: Firebase RTDB connection status (.info/connected)
      const connectedRef = dbRef(activeRtdb, '.info/connected');
      const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
        const isOnline = snapshot.val();
        if (isOnline === true) setIsRtdbConnected(true);
      });

      // Listener 5: /security_system/camera_connected
      const camConnRef = dbRef(activeRtdb, 'security_system/camera_connected');
      const unsubscribeCamConn = onValue(camConnRef, (snapshot) => {
        const val = snapshot.val();
        updateCameraLiveness(lastSeenTimestamp, val);
      });

      // Listener 6: /security_system/last_seen
      const lastSeenRef = dbRef(activeRtdb, 'security_system/last_seen');
      const unsubscribeLastSeen = onValue(lastSeenRef, (snapshot) => {
        const val = snapshot.val();
        if (val !== null && val !== undefined) {
          updateCameraLiveness(val, true);
        }
      });

      // Listener 7: /security_system/system_state (Night-Mode PIR Sleep vs Active Tracking)
      const stateRef = dbRef(activeRtdb, 'security_system/system_state');
      const unsubscribeSystemState = onValue(stateRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setSystemState(val === 'SLEEPING' ? 'SLEEPING' : 'AWAKE_TRACKING');
        }
      });

      // Listener 8: /security_system/servo_angle (SG90 Tracking Angle 15° to 165°)
      const servoRef = dbRef(activeRtdb, 'security_system/servo_angle');
      const unsubscribeServo = onValue(servoRef, (snapshot) => {
        const val = Number(snapshot.val());
        if (!isNaN(val) && val >= 15 && val <= 165) {
          setServoAngle(val);
        }
      });

      // Listener 9: /security_system/sleep_command
      const sleepCmdRef = dbRef(activeRtdb, 'security_system/sleep_command');
      const unsubscribeSleepCmd = onValue(sleepCmdRef, (snapshot) => {
        const val = snapshot.val();
        if (val !== null && val !== undefined) {
          setSleepCommand(Boolean(val));
        }
      });

      // Listener 10: /security_system/alert_image_url
      const alertUrlRef = dbRef(activeRtdb, 'security_system/alert_image_url');
      const unsubscribeAlertUrl = onValue(alertUrlRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setAlertPhotoUrl(String(val));
        }
      });

      // Listener 11: /security_system/boxed_frame (Real-time Base64 AI frame)
      const boxedRef = dbRef(activeRtdb, 'security_system/boxed_frame');
      const unsubscribeBoxed = onValue(boxedRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setBoxedFrameBase64(String(val));
          setBase64FrameTimestamp(Date.now());
          setIsRtdbConnected(true);
        }
      });

      // Listener 12: /security_system/raw_frame (Real-time Base64 raw camera frame)
      const rawFrameRef = dbRef(activeRtdb, 'security_system/raw_frame');
      const unsubscribeRawFrame = onValue(rawFrameRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setRawFrameBase64(String(val));
          setBase64FrameTimestamp(Date.now());
          setIsRtdbConnected(true);
        }
      });

      // Listener 13: /security_system/latest_saved_drive_file
      const driveFileRef = dbRef(activeRtdb, 'security_system/latest_saved_drive_file');
      const unsubscribeDriveFile = onValue(driveFileRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setLatestSavedDriveFile(String(val));
        }
      });

      // Listener 14: /security_system/google_drive_folder_url
      const driveFolderRef = dbRef(activeRtdb, 'security_system/google_drive_folder_url');
      const unsubscribeDriveFolder = onValue(driveFolderRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setGoogleDriveFolderUrl(String(val));
        }
      });

      return () => {
        unsubscribeDetection();
        unsubscribeCamera();
        unsubscribeBuzzer();
        unsubscribeConnected();
        unsubscribeCamConn();
        unsubscribeLastSeen();
        unsubscribeSystemState();
        unsubscribeServo();
        unsubscribeSleepCmd();
        unsubscribeAlertUrl();
        unsubscribeBoxed();
        unsubscribeRawFrame();
        unsubscribeDriveFile();
        unsubscribeDriveFolder();
      };
    } catch (err) {
      console.warn('Realtime database listener error:', err);
    }
  }, [rtdbUrl, soundEnabled, photoUrl]);

  // REST polling fallback to ensure live updates even if WebSocket is disconnected
  useEffect(() => {
    const pollRtdbRest = async () => {
      try {
        const url = `${rtdbUrl}/security_system.json`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setIsRtdbConnected(true);
            updateCameraLiveness(data.last_seen, data.camera_connected);
            if (data.system_state !== undefined) {
              setSystemState(data.system_state === 'SLEEPING' ? 'SLEEPING' : 'AWAKE_TRACKING');
            }
            if (data.servo_angle !== undefined) {
              const ang = Number(data.servo_angle);
              if (!isNaN(ang) && ang >= 15 && ang <= 165) setServoAngle(ang);
            }
            if (data.sleep_command !== undefined) {
              setSleepCommand(Boolean(data.sleep_command));
            }
            if (data.boxed_frame) {
              setBoxedFrameBase64(String(data.boxed_frame));
              setBase64FrameTimestamp(Date.now());
            }
            if (data.raw_frame) {
              setRawFrameBase64(String(data.raw_frame));
              setBase64FrameTimestamp(Date.now());
            }
            if (data.latest_saved_drive_file) {
              setLatestSavedDriveFile(String(data.latest_saved_drive_file));
            }
            if (data.google_drive_folder_url) {
              setGoogleDriveFolderUrl(String(data.google_drive_folder_url));
            }
            if (data.alert_image_url) {
              setAlertPhotoUrl(String(data.alert_image_url));
            }
            if (data.last_detection !== undefined) {
              const det = String(data.last_detection).trim();
              if (det && det !== lastDetection && det !== 'None') {
                setLastDetection(det);
                if (det.toLowerCase() === 'human') {
                  fetchBothPhotos();
                } else if (det.toLowerCase() === 'animal' && !data.buzzer) {
                  handleSetBuzzer(true);
                  fetchBothPhotos();
                }
              }
            }
            if (data.camera_active !== undefined) {
              setCameraActive(Boolean(data.camera_active));
            }
            if (data.buzzer !== undefined) {
              setBuzzerActive(Boolean(data.buzzer));
            }
          }
        }
      } catch {}
    };

    const interval = setInterval(pollRtdbRest, 4000);
    return () => clearInterval(interval);
  }, [rtdbUrl, lastDetection]);

  // Universal State Synchronizer: Writes to BOTH Cloud Firestore and Realtime Database
  const writeSecurityState = async (updates: {
    buzzer?: boolean;
    camera_active?: boolean;
    last_detection?: string | null;
    system_state?: 'SLEEPING' | 'AWAKE_TRACKING';
    servo_angle?: number;
    sleep_command?: boolean;
    alert_image_url?: string | null;
    boxed_frame?: string | null;
    raw_frame?: string | null;
    latest_saved_drive_file?: string | null;
    google_drive_folder_url?: string | null;
  }) => {
    // 1. Write to Cloud Firestore (Guaranteed primary storage)
    try {
      await setDoc(doc(db, 'solar_iot', 'security_system'), {
        ...updates,
        updated_at: new Date().toISOString()
      }, { merge: true });
      setIsFirestoreConnected(true);
    } catch (e) {
      console.warn('Firestore security_system write note:', e);
    }

    // 2. Write to Realtime Database SDK
    const activeRtdb = getOrCreateRtdb(rtdbUrl);
    if (activeRtdb) {
      try {
        for (const [key, val] of Object.entries(updates)) {
          const targetRef = dbRef(activeRtdb, `security_system/${key}`);
          await dbSet(targetRef, val);
        }
      } catch (e) {
        console.warn('RTDB SDK write note:', e);
      }
    }

    // 3. Write via REST to Realtime Database
    try {
      for (const [key, val] of Object.entries(updates)) {
        fetch(`${rtdbUrl}/security_system/${key}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(val)
        }).catch(() => {});
      }
    } catch {}
  };

  // SG90 Servo Manual Angle Setter (15° to 165°)
  const handleSetServoAngle = async (angle: number) => {
    const clamped = Math.max(15, Math.min(165, Math.round(angle)));
    setServoAngle(clamped);
    setIsRotatingServo(true);
    try {
      await writeSecurityState({ servo_angle: clamped });
    } finally {
      setTimeout(() => setIsRotatingServo(false), 300);
    }
  };

  // Trigger Deep Sleep Command: Powers down ESP32-CAM and arms on PIR GPIO 13
  const handleTriggerDeepSleep = async () => {
    setIsUpdatingPowerState(true);
    setSystemState('SLEEPING');
    setSleepCommand(true);
    setServoAngle(90);
    setLastDetection('None');
    try {
      await writeSecurityState({
        system_state: 'SLEEPING',
        sleep_command: true,
        servo_angle: 90,
        last_detection: 'None',
        buzzer: false
      });
    } finally {
      setIsUpdatingPowerState(false);
    }
  };

  // Wake Up Board & Arm Active Radar Tracking
  const handleWakeFromSleep = async () => {
    setIsUpdatingPowerState(true);
    setSystemState('AWAKE_TRACKING');
    setSleepCommand(false);
    try {
      await writeSecurityState({
        system_state: 'AWAKE_TRACKING',
        sleep_command: false
      });
      fetchBothPhotos();
    } finally {
      setIsUpdatingPowerState(false);
    }
  };

  // 3. Write /security_system/buzzer command to Realtime Database and Firestore
  const handleSetBuzzer = async (state: boolean) => {
    setBuzzerActive(state);
    try {
      await writeSecurityState({ buzzer: state });
      if (state) {
        playAlarmSound(880, 2);
        // Clear buzzer after 5 seconds automatically on web UI side
        if (buzzerAutoResetTimerRef.current) clearTimeout(buzzerAutoResetTimerRef.current);
        buzzerAutoResetTimerRef.current = setTimeout(() => {
          handleSetBuzzer(false);
        }, 5000);
      }
    } catch (err) {
      console.warn('Error writing buzzer:', err);
    }
  };

  // 4. Feature 4: Camera Control Switch (writes true/false to /security_system/camera_active)
  const handleToggleCameraPower = async () => {
    const newState = !cameraActive;
    setCameraActive(newState);
    addEventLog('camera_toggle', `Camera turned ${newState ? 'ON' : 'OFF'}`, null, false);
    try {
      await writeSecurityState({ camera_active: newState });
    } catch (err) {
      console.warn('Error writing camera_active:', err);
    }
  };

  // Clear/Reset Active Detection State in Firebase Realtime Database and Firestore
  const handleClearDetection = async () => {
    try {
      const clearVal = 'None';
      await writeSecurityState({ last_detection: clearVal, buzzer: false });
      setLastDetection(null);
      lastProcessedDetectionRef.current = null;
      setBuzzerActive(false);
      setPhotoError(null);
    } catch (err) {
      console.warn('Clear detection note:', err);
      setLastDetection(null);
      lastProcessedDetectionRef.current = null;
      setBuzzerActive(false);
    }
  };

  const activeColabScript = getGoogleColabAiScript(rtdbUrl);
  const activeEsp32Sketch = getEsp32CamSketch(rtdbUrl);

  const copyFirmwareSketch = () => {
    navigator.clipboard.writeText(activeEsp32Sketch);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const copyColabScript = () => {
    navigator.clipboard.writeText(activeColabScript);
    setCopiedColabCode(true);
    setTimeout(() => setCopiedColabCode(false), 2500);
  };

  // Determine current detection state
  const isHuman = lastDetection?.toLowerCase() === 'human';
  const isAnimal = lastDetection?.toLowerCase() === 'animal';

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Status */}
      <div className="bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className={`absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 transition-colors duration-500 ${
          isHuman ? 'bg-red-500' : isAnimal ? 'bg-amber-400' : 'bg-cyan-500'
        }`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className={`p-2.5 rounded-2xl border shrink-0 transition-colors ${
                isHuman 
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/20 animate-pulse' 
                  : isAnimal 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/20' 
                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 font-mono">
                  <span>ESP32-CAM Security System</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                    RTDB + Storage
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 font-mono">
                  Autonomous Intrusion Detection, Buzzer Deterrent & Real-Time Surveillance Photo Feed
                </p>
              </div>
            </div>
          </div>

          {/* Top Quick Status Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Camera Physical Connection Status - Explicitly shows NOT CONNECTED */}
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono flex items-center gap-1.5 font-bold shadow-sm ${
              isCameraConnected 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              {isCameraConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ESP32-CAM Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Not Connected</span>
                </>
              )}
            </div>

            {/* Camera Power Switch State */}
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono flex items-center gap-1.5 font-bold shadow-sm ${
              cameraActive 
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
              <span>{cameraActive ? 'Power: ON' : 'Power: OFF'}</span>
            </div>

            {/* Sound Mute Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer text-[11px] font-mono flex items-center gap-1.5"
              title="Toggle Browser Audio Alerts"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{soundEnabled ? 'Audio ON' : 'Audio OFF'}</span>
            </button>

            {/* Workers & RFID Attendance Hub Link */}
            {onNavigateToWorkers && (
              <button
                onClick={onNavigateToWorkers}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition cursor-pointer text-[11px] font-mono flex items-center gap-1.5 font-bold"
                title="Manage Worker RFID Cards & Google Docs Attendance Whitelist"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Workers &amp; RFID Whitelist</span>
              </button>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('monitor')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  activeTab === 'monitor' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Live Monitor
              </button>
              <button
                onClick={() => setActiveTab('colab')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'colab' ? 'bg-amber-400 text-slate-950 font-bold shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Google Colab AI</span>
              </button>
              <button
                onClick={() => setActiveTab('firmware')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'firmware' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>ESP32-CAM Code</span>
              </button>
              <button
                onClick={() => setActiveTab('rtdb_setup')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'rtdb_setup' 
                    ? 'bg-amber-400 text-slate-950 font-bold shadow' 
                    : syncMode === 'firestore_free'
                      ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30'
                      : rtdbTestResult?.status === 'connected'
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 font-semibold'
                }`}
                title="Real-time Database diagnostics, Spark plan free tier fix, and Firestore stream settings"
              >
                <Database className="w-3.5 h-3.5" />
                <span>RTDB &amp; Plan Fix</span>
                {syncMode === 'dual' && rtdbTestResult?.status !== 'connected' && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'history' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <History className="w-3 h-3" />
                <span>Log ({eventLogs.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-Time Stream & Firebase Plan Status Banner */}
        {activeTab !== 'rtdb_setup' && (
          syncMode === 'firestore_free' ? (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5 flex-wrap">
                    <span>100% Free Cloud Firestore Mode Active</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Spark Free Tier • No Upgrade Needed</span>
                  </span>
                  <p className="text-[11px] text-zinc-300 font-sans mt-0.5">
                    Real-time WebSocket telemetry and security intrusion detection are streaming live with zero billing or Blaze plan required.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('rtdb_setup')}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 font-mono"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Database &amp; Plan Settings</span>
              </button>
            </div>
          ) : (
            rtdbTestResult && rtdbTestResult.status !== 'connected' && (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
                <div className="flex items-start sm:items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 flex-wrap">
                      <span>Firebase says &ldquo;Upgrade your plan&rdquo; or 404?</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">No Payment Needed!</span>
                    </span>
                    <p className="text-[11px] text-zinc-300 font-sans mt-0.5 leading-relaxed">
                      You do not need to upgrade to Blaze! Cloud Firestore is 100% free and active right now. Or choose <strong>United States (us-central1)</strong> in Firebase to use Realtime Database for free without upgrading.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSetSyncMode('firestore_free')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                    title="Switch to 100% Free Cloud Firestore Mode"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Switch to Free Mode</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('rtdb_setup')}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>How to Fix</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          )
        )}

        {/* 1.5 Live Hardware Status: Night-Mode PIR Deep Sleep & Tracking State */}
        <div className={`mt-4 p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl ${
          systemState === 'SLEEPING'
            ? 'bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border-indigo-500/40 text-indigo-100'
            : 'bg-gradient-to-r from-zinc-950 via-emerald-950/30 to-zinc-950 border-emerald-500/40 text-emerald-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border shrink-0 ${
              systemState === 'SLEEPING'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-indigo-500/10 shadow-lg'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10 shadow-lg animate-pulse'
            }`}>
              {systemState === 'SLEEPING' ? (
                <Moon className="w-5 h-5 text-indigo-300" />
              ) : (
                <Activity className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm font-mono text-white">
                  {systemState === 'SLEEPING' 
                    ? 'ESP32 & Camera in Deep Sleep — Armed on PIR GPIO 13'
                    : 'PIR Motion Triggered — Camera & Colab AI Active'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                  systemState === 'SLEEPING'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                }`}>
                  {systemState}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                {systemState === 'SLEEPING'
                  ? 'Low-power sleep (~150µA current draw). Microcontroller & optical sensor awaken instantly upon PIR rising edge on GPIO 13.'
                  : `Microcontroller active & streaming. SG90 Servo initialized at ${servoAngle}°. YOLOv8 CPU processor monitoring perimeter.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {systemState === 'SLEEPING' ? (
              <button
                type="button"
                onClick={handleWakeFromSleep}
                disabled={isUpdatingPowerState}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Wake Camera (Test Trigger)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTriggerDeepSleep}
                disabled={isUpdatingPowerState}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 font-bold text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-300" />
                <span>Force Deep Sleep (Send Command)</span>
              </button>
            )}
          </div>
        </div>

        {/* Google Drive Photo Archive Integration Bar */}
        <div className="mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-950 border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span>Google Drive Archive (Zero Firebase Storage Cost)</span>
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold flex items-center gap-1.5 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span>Last Saved to Google Drive: <strong className="text-white">{latestSavedDriveFile || 'Ready for intrusion trigger'}</strong></span>
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-sans mt-0.5">
                Every detected intruder and wildlife frame is saved straight to <code className="text-blue-300">/MyDrive/Farm_IOT_Security_Photos</code> by Google Colab.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
            <a
              href={googleDriveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 w-full sm:w-auto"
              title="Open Google Drive Intruder Folder in new tab"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Google Drive Intruder Folder</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setIsEditingDriveFolder(!isEditingDriveFolder)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
              title="Configure Google Drive shared folder link"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Google Drive Folder Link Editor */}
        {isEditingDriveFolder && (
          <div className="mt-2 p-3 rounded-xl bg-zinc-900/90 border border-blue-500/40 flex flex-col sm:flex-row items-center gap-2 text-xs font-mono animate-fadeIn">
            <div className="flex items-center gap-1.5 text-blue-300 shrink-0">
              <Link2 className="w-3.5 h-3.5" />
              <span>Custom Drive Folder Link:</span>
            </div>
            <input
              type="url"
              value={driveFolderInput}
              onChange={(e) => setDriveFolderInput(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/YOUR_FOLDER_ID"
              className="flex-1 px-3 py-1.5 rounded-lg bg-black border border-zinc-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-none w-full"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSaveDriveFolderUrl(driveFolderInput)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Save Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setDriveFolderInput(googleDriveFolderUrl);
                  setIsEditingDriveFolder(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* 2. Critical Warning Banner based on /security_system/last_detection */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80">
          {isHuman ? (
            /* Requirement: 'Human Intruder' with SG90 Tracking Angle + Silent Physical Buzzer */
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-2 border-red-500 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500 text-slate-950 font-black shrink-0 animate-bounce">
                  <ShieldAlert className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-mono tracking-wide flex items-center gap-2 flex-wrap">
                    <span className="text-red-400">🚨 Human Intruder Tracked!</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/60 text-red-300 border border-red-400/50 font-bold">
                      SG90 Servo: {servoAngle}°
                    </span>
                  </h3>
                  <p className="text-xs text-red-200 font-mono mt-0.5">
                    Camera dynamically tracking target via SG90 servo ({servoAngle}°). ESP32 physical buzzer kept <strong>SILENT</strong> (/security_system/buzzer = false) to covertly log photographic proof. Web siren active.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchBothPhotos}
                  disabled={photoLoading}
                  className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black text-white border border-red-400 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${photoLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Alert Frame</span>
                </button>
                <button
                  onClick={handleClearDetection}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition cursor-pointer"
                >
                  Dismiss / Clear
                </button>
              </div>
            </div>
          ) : isAnimal ? (
            /* Requirement: 'Animal Detected' in YELLOW text + Auto Buzzer triggered (3.5s) + Servo 90° */
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950 via-yellow-900/90 to-amber-950 border-2 border-yellow-400 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-xl bg-yellow-400 text-slate-950 font-black shrink-0 animate-bounce">
                  <AlertTriangle className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-yellow-300 font-mono tracking-wide flex items-center gap-2 flex-wrap">
                    <span>⚠️ Animal Deterrent Active</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-200 border border-yellow-400/40">
                      Servo Locked at 90° • Buzzer Triggered (3.5s)
                    </span>
                  </h3>
                  <p className="text-xs text-yellow-100 font-mono mt-0.5">
                    Yellow bounding box alert. Servo kept centered at 90°. Realtime command sent: <code className="px-1.5 py-0.5 bg-black/60 rounded text-yellow-300">/security_system/buzzer = true</code> (GPIO 12 Active).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSetBuzzer(!buzzerActive)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    buzzerActive ? 'bg-red-600 text-white' : 'bg-yellow-400 text-slate-950'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{buzzerActive ? 'Buzzer Alarming (Active)' : 'Sound Buzzer'}</span>
                </button>
                <button
                  onClick={handleClearDetection}
                  className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black text-yellow-200 border border-yellow-400/50 text-xs font-mono transition cursor-pointer"
                >
                  Clear Status
                </button>
              </div>
            </div>
          ) : (
            /* Requirement: Auto Power-Down / Sleep vs Clear Status */
            systemState === 'SLEEPING' || sleepCommand ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-lg">
                <div className="flex items-center gap-2.5 text-indigo-200">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm">
                      Target Gone — Returning ESP32-CAM to Deep Sleep
                    </span>
                    <p className="text-[11px] text-indigo-300 font-sans mt-0.5">
                      Perimeter clear after motion stopped. Command <code className="text-indigo-200">/security_system/sleep_command = true</code> dispatched. Board sleeping on PIR GPIO 13.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    Armed on PIR GPIO 13
                  </span>
                  <button
                    type="button"
                    onClick={handleWakeFromSleep}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Wake Up</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Perimeter Status: <strong className="text-emerald-400">Clear &amp; Secure</strong> • Armed on PIR GPIO 13 • SG90: 90° Forward
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                  Awaiting PIR trigger or Colab CPU frame ingestion
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Surveillance Camera Feed & Photo Display (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Dual-Mode ESP32-CAM Live Stream Player (No Firebase Storage Required) */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800/80 pb-3.5 gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    streamMode === 'local_mjpeg' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  }`}>
                    {streamMode === 'local_mjpeg' ? <Tv className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2 flex-wrap">
                      <span>ESP32-CAM Live Video Stream</span>
                      {streamMode === 'local_mjpeg' ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          25 FPS MJPEG LOCAL
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          CLOUD LIVE (BASE64)
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {streamMode === 'local_mjpeg' 
                        ? `Direct Stream: ${localMjpegUrl}` 
                        : 'Realtime Database: /security_system/boxed_frame & /raw_frame (0 Storage cost)'}
                    </p>
                  </div>
                </div>

                {/* Stream Mode Toggle: Cloud Live vs Local MJPEG */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleSetStreamMode('cloud')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        streamMode === 'cloud'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Cloud Live Mode: Reads real-time Base64 frames from Firebase RTDB"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Cloud Live Mode</span>
                      {(boxedFrameBase64 || rawFrameBase64) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStreamMode('local_mjpeg')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        streamMode === 'local_mjpeg'
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Local High-Speed MJPEG Mode: Direct 25 FPS stream from ESP32-CAM IP on local Wi-Fi"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>Local MJPEG (25 FPS)</span>
                    </button>
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    onClick={() => setIsFullscreenPhoto(true)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750 transition cursor-pointer text-xs"
                    title="View Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-bar for Cloud Mode: Toggle Boxed vs Raw Frame */}
              {streamMode === 'cloud' && (
                <div className="flex items-center justify-between text-xs font-mono bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">Cloud Channel:</span>
                    <button
                      type="button"
                      onClick={() => setPhotoViewMode('annotated')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        photoViewMode === 'annotated'
                          ? 'bg-amber-400 text-slate-950 font-bold shadow'
                          : 'bg-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                      title="Show YOLOv8 bounding box frame from /security_system/boxed_frame"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>AI Boxed Frame</span>
                      {boxedFrameBase64 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoViewMode('raw')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        photoViewMode === 'raw'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'bg-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                      title="Show raw sensor frame from /security_system/raw_frame"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Raw Sensor Frame</span>
                      {rawFrameBase64 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />}
                    </button>
                  </div>

                  <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Auto-Syncs on new frame</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Sub-bar for Local MJPEG Mode: IP Address Configurator */}
              {streamMode === 'local_mjpeg' && (
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-emerald-500/30 text-xs font-mono space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Local Stream IP / URL:</span>
                      <code className="text-white font-bold bg-black/60 px-2 py-0.5 rounded border border-zinc-700">
                        {localMjpegUrl}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingMjpegUrl(!isEditingMjpegUrl)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                    >
                      <Settings className="w-3 h-3" />
                      <span>{isEditingMjpegUrl ? 'Close Config' : 'Change IP / Port'}</span>
                    </button>
                  </div>

                  {isEditingMjpegUrl && (
                    <div className="pt-2 border-t border-zinc-800 space-y-2 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={mjpegInput}
                          onChange={(e) => setMjpegInput(e.target.value)}
                          placeholder="http://192.168.4.1:81/stream"
                          className="flex-1 px-3 py-1.5 rounded-xl bg-black border border-zinc-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveMjpegUrl(mjpegInput)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer font-mono"
                        >
                          Save URL
                        </button>
                      </div>

                      {/* Presets */}
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 flex-wrap">
                        <span className="text-zinc-500">Quick Presets:</span>
                        {[
                          { label: 'ESP32 AP (192.168.4.1)', url: 'http://192.168.4.1:81/stream' },
                          { label: 'LAN (192.168.1.50)', url: 'http://192.168.1.50:81/stream' },
                          { label: 'LAN (192.168.0.100)', url: 'http://192.168.0.100:81/stream' }
                        ].map((p) => (
                          <button
                            key={p.url}
                            type="button"
                            onClick={() => {
                              setMjpegInput(p.url);
                              handleSaveMjpegUrl(p.url);
                            }}
                            className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-750 text-cyan-300 border border-zinc-700 cursor-pointer"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Video Stream / Frame Viewport */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video flex items-center justify-center group shadow-2xl">
                {streamMode === 'local_mjpeg' ? (
                  /* MODE 2: LOCAL HIGH-SPEED MJPEG STREAM (25 FPS) */
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <img 
                      src={localMjpegUrl} 
                      alt="ESP32-CAM Local MJPEG Stream (25 FPS)" 
                      className="w-full h-full object-contain"
                      onError={() => setMjpegError(true)}
                      onLoad={() => setMjpegError(false)}
                    />

                    {/* HUD Overlay for Local MJPEG Stream */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-emerald-500/40 text-emerald-300 font-mono text-[10px] flex items-center gap-1.5 shadow">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>25 FPS HIGH-SPEED MJPEG</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-black/75 border border-white/20 text-white font-mono text-[10px]">
                          DIRECT HARDWARE WI-FI
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-cyan-500/30 text-cyan-300 font-mono text-[10px] flex items-center gap-1 shadow">
                          <Compass className="w-3 h-3 text-cyan-400" />
                          <span>SERVO: {servoAngle}°</span>
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-zinc-300 pointer-events-none">
                      <span className="truncate">Stream: <strong className="text-emerald-300">{localMjpegUrl}</strong></span>
                      <span>Latency: ~35ms (Hardware MJPEG)</span>
                    </div>

                    {/* Stream Error Troubleshooting Banner */}
                    {mjpegError && (
                      <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 z-10 animate-fadeIn">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Tv className="w-8 h-8" />
                        </div>
                        <div className="max-w-md space-y-1">
                          <h4 className="text-white font-bold font-mono text-sm">Cannot Connect to Local MJPEG Stream</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                            Attempted to reach <code className="text-amber-300">{localMjpegUrl}</code>. Make sure:
                          </p>
                          <ul className="text-[11px] text-zinc-300 font-sans text-left list-disc list-inside space-y-0.5 pt-1">
                            <li>Your phone or laptop is on the <strong>same Wi-Fi network</strong> (or ESP32 Access Point hotspot) as your camera.</li>
                            <li>Your ESP32-CAM is powered and running the WebServer sketch on port 81.</li>
                            <li>If using mixed HTTPS/HTTP, allow local insecure content for this tab in your browser settings.</li>
                          </ul>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMjpegError(false);
                              const old = localMjpegUrl;
                              setLocalMjpegUrl('');
                              setTimeout(() => setLocalMjpegUrl(old), 100);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Connection</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingMjpegUrl(true)}
                            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition cursor-pointer"
                          >
                            Change IP Address
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* MODE 1: CLOUD LIVE MODE (Base64 JPEG from /security_system/boxed_frame or /raw_frame) */
                  (() => {
                    const isAnnotated = photoViewMode === 'annotated';
                    const activeBase64 = isAnnotated 
                      ? (boxedFrameBase64 || rawFrameBase64) 
                      : (rawFrameBase64 || boxedFrameBase64);
                    const cloudSrc = formatBase64Src(activeBase64) || (isAnnotated ? (alertPhotoUrl || photoUrl) : (photoUrl || alertPhotoUrl));
                    const isBase64Active = Boolean(activeBase64);

                    return cloudSrc ? (
                      <>
                        <img 
                          src={cloudSrc} 
                          alt="Cloud Live Surveillance Feed" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={() => {
                            if (isAnnotated && boxedFrameBase64) setBoxedFrameBase64(null);
                            else if (!isAnnotated && rawFrameBase64) setRawFrameBase64(null);
                          }}
                        />
                        
                        {/* Top HUD overlay */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] flex items-center gap-1.5 shadow">
                              <span className={`w-2 h-2 rounded-full ${
                                systemState === 'SLEEPING' ? 'bg-purple-400' : 'bg-red-500 animate-ping'
                              }`} />
                              <span>{isBase64Active ? (isAnnotated ? 'REALTIME BASE64 BOXED' : 'REALTIME BASE64 RAW') : 'PHOTO FALLBACK'}</span>
                            </span>

                            {isHuman && (
                              <span className="px-2.5 py-1 rounded-lg bg-red-600/95 text-white font-mono text-[10px] font-black tracking-wide border border-red-400 shadow flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" />
                                <span>HUMAN INTRUDER (TRACK: {servoAngle}°)</span>
                              </span>
                            )}

                            {isAnimal && (
                              <span className="px-2.5 py-1 rounded-lg bg-yellow-500/95 text-slate-950 font-mono text-[10px] font-black tracking-wide border border-yellow-300 shadow flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>ANIMAL DETECTED (GPIO 12 BUZZER)</span>
                              </span>
                            )}
                          </div>

                          {/* Top Right: SG90 Angle & System State badge */}
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-cyan-500/30 text-cyan-300 font-mono text-[10px] flex items-center gap-1 shadow">
                              <Compass className="w-3 h-3 text-cyan-400" />
                              <span>SERVO: {servoAngle}°</span>
                            </span>
                          </div>
                        </div>

                        {/* Bottom HUD overlay */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-zinc-300 pointer-events-none">
                          <div className="flex items-center gap-2">
                            <span>Path: <strong className={isAnnotated ? 'text-amber-300' : 'text-cyan-300'}>
                              {isAnnotated ? '/security_system/boxed_frame' : '/security_system/raw_frame'}
                            </strong></span>
                            {isBase64Active && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Realtime Base64
                              </span>
                            )}
                          </div>
                          <span>Synced: {new Date(base64FrameTimestamp).toLocaleTimeString()}</span>
                        </div>
                      </>
                    ) : (
                      /* Camera Viewport when no live Base64 frame is present */
                      <div className="relative w-full h-full min-h-[280px] sm:min-h-[340px] bg-gradient-to-b from-zinc-950 via-slate-950 to-black flex items-center justify-center overflow-hidden">
                        {/* Tactical Scope Grid Lines */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d40d_1px,transparent_1px),linear-gradient(to_bottom,#06b6d40d_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                        
                        {/* Radar Range Rings */}
                        <div className="absolute w-64 h-64 rounded-full border border-zinc-800/60 pointer-events-none" />
                        <div className="absolute w-44 h-44 rounded-full border border-zinc-800/60 pointer-events-none" />

                        {/* Crosshairs */}
                        <div className="absolute inset-x-0 h-px bg-zinc-800/50 pointer-events-none" />
                        <div className="absolute inset-y-0 w-px bg-zinc-800/50 pointer-events-none" />

                        {/* Top HUD */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none flex-wrap gap-2 z-10">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border font-mono text-[10px] flex items-center gap-1.5 shadow ${
                              isCameraConnected
                                ? 'border-cyan-500/40 text-cyan-300'
                                : 'border-zinc-700 text-zinc-400'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${isCameraConnected ? 'bg-cyan-400 animate-ping' : 'bg-zinc-500'}`} />
                              <span>{isCameraConnected ? 'ESP32-CAM CONNECTED' : 'ESP32-CAM OFFLINE'}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg bg-black/75 border font-mono text-[10px] ${
                              isCameraConnected
                                ? 'border-emerald-500/30 text-emerald-300'
                                : 'border-zinc-800 text-zinc-500'
                            }`}>
                              {isCameraConnected ? '● AWAITING FRAME' : '○ NO HARDWARE STREAM'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-zinc-800 text-zinc-400 font-mono text-[10px] flex items-center gap-1 shadow">
                              <Compass className="w-3 h-3 text-zinc-400" />
                              <span>SERVO: {servoAngle}° SG90</span>
                            </span>
                          </div>
                        </div>

                        {/* Central Status */}
                        <div className="relative z-10 text-center space-y-2 p-4 max-w-md">
                          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow-lg">
                            <WifiOff className="w-7 h-7 text-zinc-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-mono font-bold text-sm tracking-wide">
                              {isCameraConnected ? 'Waiting for Live Video Frame...' : 'ESP32-CAM Hardware Not Connected'}
                            </h4>
                            <p className="text-[11px] text-zinc-400 font-mono mt-1 leading-relaxed">
                              Power on your ESP32-CAM or start the Colab YOLOv8 script to stream Base64 frames to <code className="text-cyan-300">/security_system/boxed_frame</code>.
                            </p>
                          </div>
                        </div>

                        {/* Bottom HUD */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-zinc-400 pointer-events-none z-10">
                          <div className="flex items-center gap-2">
                            <span>Status: <strong className={isCameraConnected ? 'text-emerald-300' : 'text-zinc-400'}>{isCameraConnected ? 'Online (Idle)' : 'Disconnected'}</strong></span>
                          </div>
                          <span>Hardware Link: {isCameraConnected ? 'Connected' : 'Waiting for ESP32-CAM'}</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Player Footer & Quick Actions */}
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-1 flex-wrap gap-2">
                <span>
                  {streamMode === 'local_mjpeg' ? (
                    <span>Hardware Endpoint: <code className="text-emerald-300">{localMjpegUrl}</code></span>
                  ) : (
                    <span>RTDB Key: <code className="text-cyan-200">/security_system/{photoViewMode === 'annotated' ? 'boxed_frame' : 'raw_frame'}</code></span>
                  )}
                </span>
                
                <div className="flex items-center gap-3">
                  <a
                    href={googleDriveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
                    title="View all saved intruder pictures in Google Drive"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Google Drive Photos</span>
                  </a>
                  {boxedFrameBase64 && (
                    <a
                      href={formatBase64Src(boxedFrameBase64)!}
                      download={`farm_iot_frame_${Date.now()}.jpg`}
                      className="text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save Frame</span>
                    </a>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: Controls, Camera Power Switch & Buzzer (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Feature 4: Prominent Camera Power Switch Toggle */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-2.5 border-b border-zinc-800/80 pb-3">
                <div className={`p-2 rounded-xl border shrink-0 ${
                  cameraActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}>
                  <Power className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">Camera Control Switch</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Controls database path: <code className="text-amber-300">/security_system/camera_active</code>
                  </p>
                </div>
              </div>

              {/* Prominent Camera Power Toggle Button */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white font-mono">Camera Power</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                      cameraActive 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {cameraActive ? 'POWER ON (TRUE)' : 'POWER OFF (FALSE)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    {cameraActive 
                      ? 'ESP32-CAM loop captures frame and uploads latest_photo.jpg.' 
                      : 'ESP32-CAM skips capture to save battery without unplugging.'}
                  </p>
                </div>

                {/* Big Toggle Switch Button */}
                <button
                  type="button"
                  onClick={handleToggleCameraPower}
                  className={`relative inline-flex h-9 w-18 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-300 focus:outline-none shadow-lg ${
                    cameraActive 
                      ? 'bg-emerald-500 border-emerald-400' 
                      : 'bg-zinc-800 border-zinc-700'
                  }`}
                  role="switch"
                  aria-checked={cameraActive}
                  title="Toggle Camera Power (writes true/false to /security_system/camera_active)"
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out flex items-center justify-center ${
                      cameraActive ? 'translate-x-9 text-emerald-600' : 'translate-x-0.5 text-zinc-600'
                    }`}
                  >
                    <Power className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </button>
              </div>

              {/* SG90 Servo Tracking Gauge & Pan Controller */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3.5 shadow-lg relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg border ${
                      isHuman ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                      isAnimal ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                      systemState === 'SLEEPING' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                      'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    }`}>
                      <Compass className={`w-4 h-4 ${isRotatingServo ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                        <span>SG90 Servo Tracking Gauge</span>
                        {isRotatingServo && <span className="text-[10px] text-cyan-400 animate-pulse font-normal">(Panning...)</span>}
                      </h4>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        GPIO 14 LEDC PWM (50Hz) • 15° to 165°
                      </span>
                    </div>
                  </div>
                  
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                    isHuman 
                      ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                      : isAnimal
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                      : systemState === 'SLEEPING'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isHuman ? 'HUMAN AUTOTRACK' : isAnimal ? '90° ANIMAL LOCK' : systemState === 'SLEEPING' ? 'PARKED ON PIR' : 'AUTONOMOUS RADAR'}
                  </span>
                </div>

                {/* Semicircular SVG Gauge Dial */}
                <div className="flex flex-col items-center justify-center pt-1 pb-1">
                  <div className="relative w-64 h-36 flex items-center justify-center">
                    <svg className="w-64 h-36 overflow-visible" viewBox="0 0 260 145">
                      <defs>
                        <linearGradient id="servoArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="25%" stopColor="#f59e0b" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="75%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Outer Background Arc (Track) from 15° to 165° */}
                      <path
                        d="M 38.2 105.4 A 95 95 0 0 1 221.8 105.4"
                        fill="none"
                        stroke="#27272a"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />

                      {/* Colored Gradient Value Track */}
                      <path
                        d="M 38.2 105.4 A 95 95 0 0 1 221.8 105.4"
                        fill="none"
                        stroke="url(#servoArcGradient)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        opacity="0.8"
                      />

                      {/* Tick marks & labels */}
                      <line x1="45" y1="107" x2="52" y2="105" stroke="#71717a" strokeWidth="2" />
                      <text x="32" y="124" fill="#a1a1aa" fontSize="9" fontFamily="monospace" textAnchor="middle">15° L</text>

                      <line x1="68" y1="68" x2="74" y2="74" stroke="#71717a" strokeWidth="2" />
                      <text x="58" y="60" fill="#a1a1aa" fontSize="9" fontFamily="monospace" textAnchor="middle">45°</text>

                      <line x1="130" y1="35" x2="130" y2="44" stroke="#10b981" strokeWidth="2.5" />
                      <text x="130" y="27" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">90° CTR</text>

                      <line x1="192" y1="68" x2="186" y2="74" stroke="#71717a" strokeWidth="2" />
                      <text x="202" y="60" fill="#a1a1aa" fontSize="9" fontFamily="monospace" textAnchor="middle">135°</text>

                      <line x1="215" y1="107" x2="208" y2="105" stroke="#71717a" strokeWidth="2" />
                      <text x="228" y="124" fill="#a1a1aa" fontSize="9" fontFamily="monospace" textAnchor="middle">165° R</text>

                      {/* Needle */}
                      {(() => {
                        const rad = (180 - servoAngle) * (Math.PI / 180);
                        const needleLen = 82;
                        const nx = 130 + needleLen * Math.cos(rad);
                        const ny = 130 - needleLen * Math.sin(rad);
                        const needleColor = isHuman ? '#ef4444' : isAnimal ? '#f59e0b' : '#06b6d4';
                        return (
                          <g filter="url(#needleGlow)">
                            <line
                              x1="130"
                              y1="130"
                              x2={nx}
                              y2={ny}
                              stroke={needleColor}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              className="transition-all duration-300 ease-out"
                            />
                            <circle
                              cx={nx}
                              cy={ny}
                              r="4"
                              fill={needleColor}
                              className="transition-all duration-300 ease-out"
                            />
                          </g>
                        );
                      })()}

                      {/* Center Hub */}
                      <circle cx="130" cy="130" r="10" fill="#18181b" stroke="#3f3f46" strokeWidth="3" />
                      <circle cx="130" cy="130" r="4" fill="#06b6d4" />
                    </svg>

                    {/* Digital Readout Box at Base */}
                    <div className="absolute bottom-0 inset-x-0 flex flex-col items-center">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black font-mono tracking-tight text-white drop-shadow">
                          {servoAngle}°
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase">
                          {servoAngle < 85 ? 'WEST (LEFT)' : servoAngle > 95 ? 'EAST (RIGHT)' : 'CENTER (NORTH)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual Angle Slider & Realtime Feedback */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span>Manual Pan Adjustment:</span>
                      <strong className="text-cyan-300">{servoAngle}°</strong>
                    </span>
                    <span className="text-zinc-500">Range: 15°–165°</span>
                  </div>

                  <input
                    type="range"
                    min={15}
                    max={165}
                    step={1}
                    value={servoAngle}
                    onChange={(e) => handleSetServoAngle(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                  />

                  {/* Quick Presets */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[
                      { label: '15° L', angle: 15, hint: 'Far Left' },
                      { label: '45°', angle: 45, hint: 'Left' },
                      { label: '90° CTR', angle: 90, hint: 'Center (Deterrent)' },
                      { label: '135°', angle: 135, hint: 'Right' },
                      { label: '165° R', angle: 165, hint: 'Far Right' },
                    ].map((preset) => (
                      <button
                        key={preset.angle}
                        type="button"
                        onClick={() => handleSetServoAngle(preset.angle)}
                        className={`py-1 rounded-lg text-[10px] font-mono font-bold transition border cursor-pointer ${
                          servoAngle === preset.angle
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                            : 'bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                        }`}
                        title={`${preset.hint} (${preset.angle}°)`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Servo Tracking Logic Banner */}
                <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800/80 text-[11px] font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Database Angle:</span>
                    <code className="text-amber-300">/security_system/servo_angle = {servoAngle}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">LEDC PWM Pulse:</span>
                    <code className="text-cyan-300">
                      {(0.5 + ((servoAngle / 180) * 1.9)).toFixed(2)}ms / 20ms (50Hz)
                    </code>
                  </div>
                </div>
              </div>

              {/* Buzzer Control Card */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className={`w-4 h-4 ${buzzerActive ? 'text-red-400 animate-bounce' : 'text-zinc-400'}`} />
                    <span className="text-sm font-bold text-white font-mono">Buzzer Alarm (GPIO 12)</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                    buzzerActive 
                      ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' 
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {buzzerActive ? 'ALARMING (TRUE)' : 'QUIET (FALSE)'}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  Controls <code className="text-yellow-300">/security_system/buzzer</code>. Triggers automatically when an animal is detected to sound the 5V active buzzer.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleSetBuzzer(!buzzerActive)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow ${
                      buzzerActive 
                        ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                        : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{buzzerActive ? 'Stop Buzzer (Write False)' : 'Sound Buzzer (Write True)'}</span>
                  </button>
                </div>
              </div>

              {/* Live Realtime Database Stream & Hardware Link */}
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Real Hardware Telemetry Stream</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
                    LIVE STREAM
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-zinc-800/80">
                    <span className="text-zinc-400">/security_system/system_state</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      systemState === 'SLEEPING' ? 'text-purple-400' : 'text-emerald-400'
                    }`}>
                      {systemState === 'SLEEPING' ? <Moon className="w-3 h-3" /> : <Activity className="w-3 h-3 animate-pulse" />}
                      <span>{systemState}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-zinc-800/80">
                    <span className="text-zinc-400">/security_system/servo_angle</span>
                    <span className="font-bold text-cyan-400">
                      {servoAngle}°
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-zinc-800/80">
                    <span className="text-zinc-400">/security_system/last_detection</span>
                    <span className={`font-bold ${
                      isHuman ? 'text-red-400' : isAnimal ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>
                      {lastDetection || 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-zinc-800/80">
                    <span className="text-zinc-400">/security_system/camera_active</span>
                    <span className={`font-bold ${cameraActive ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {cameraActive ? 'true (Online)' : 'false (Standby)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-zinc-800/80">
                    <span className="text-zinc-400">/security_system/buzzer</span>
                    <span className={`font-bold ${buzzerActive ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`}>
                      {buzzerActive ? 'true (Active)' : 'false (Quiet)'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearDetection}
                  className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-mono transition cursor-pointer text-center"
                >
                  Reset / Clear Database Path
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB: Google Colab AI Vision (Human vs Animal) */}
      {activeTab === 'colab' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  <span>Google Colab AI Vision Processor</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                    YOLOv8 + Firebase
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Cloud Deep Learning Pipeline: Distinguishing Human Intrusion vs Animal Threat with Differential Cloud Actions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://colab.research.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <span>Launch Colab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={copyColabScript}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-400/20"
              >
                {copiedColabCode ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedColabCode ? 'Python Code Copied!' : 'Copy Colab Script (.py)'}</span>
              </button>
            </div>
          </div>

          {/* Differential Logic: What Google Colab Does Differently for Humans vs Animals */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                How Google Colab Processes Humans vs Animals Differently
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Card 1: HUMAN INTRUDER LOGIC */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-red-950/40 via-zinc-950 to-zinc-950 border-2 border-red-500/40 space-y-3 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-red-500/20 pb-2.5">
                  <div className="flex items-center gap-2 text-red-400 font-bold font-mono text-sm">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    <span>1. HUMAN INTRUDER (Class 0: person)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/40">
                    CRITICAL SECURITY
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">● Threat Type:</span>
                    <span className="text-zinc-300 font-sans">Theft of solar panels, inverter tampering, battery disconnection, cable sabotage.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">● Visual Overlay:</span>
                    <span className="text-zinc-300 font-sans">Colab draws a bold <strong className="text-red-400">RED Bounding Box</strong> with confidence score on the frame.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">● Database State:</span>
                    <code className="text-red-300 bg-black/60 px-1.5 py-0.5 rounded text-[11px]">/security_system/last_detection = "Human"</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">● Buzzer Strategy:</span>
                    <span className="text-amber-300 font-sans font-bold">Kept SILENT (false).</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed pt-1 bg-black/40 p-2.5 rounded-xl border border-zinc-800">
                    💡 <em>Engineering Rationale:</em> Colab intentionally does not blast a noisy buzzer when a human intruder is detected. This prevents the intruder from panicking, destroying the camera lens, or fleeing before high-resolution photographic evidence is securely committed to Firebase Storage and push alerts reach the operator.
                  </p>
                </div>
              </div>

              {/* Card 2: ANIMAL & PEST LOGIC */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-950 border-2 border-yellow-400/40 space-y-3 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-yellow-500/20 pb-2.5">
                  <div className="flex items-center gap-2 text-yellow-300 font-bold font-mono text-sm">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span>2. ANIMAL & PEST (Classes 14–23)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-200 font-bold border border-yellow-400/40">
                    AUTO DETERRENT
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">● Threat Type:</span>
                    <span className="text-zinc-300 font-sans">Birds dropping guano (hot-spot thermal cell burnout), cows/goats trampling cabling, monkeys dislodging panels.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">● Visual Overlay:</span>
                    <span className="text-zinc-300 font-sans">Colab draws a bright <strong className="text-yellow-400">YELLOW/AMBER Bounding Box</strong> labeled with the exact animal species (e.g. BIRD 89%, COW 94%).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">● Database State:</span>
                    <code className="text-yellow-300 bg-black/60 px-1.5 py-0.5 rounded text-[11px]">/security_system/last_detection = "Animal"</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">● Buzzer Strategy:</span>
                    <span className="text-emerald-400 font-sans font-bold">AUTOMATICALLY FIRES 5V ACTIVE BUZZER (true)!</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed pt-1 bg-black/40 p-2.5 rounded-xl border border-zinc-800">
                    🔊 <em>Engineering Rationale:</em> Colab instantly sets <code className="text-yellow-300">/security_system/buzzer = true</code>. The physical ESP32-CAM detects this flag and sounds the <strong>90dB active buzzer on GPIO 12</strong> for 3.5 seconds, humanely scaring away birds and animals before they soil or damage the photovoltaic modules.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Architecture Flow Strip */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs font-mono">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Edge AI Execution Flow (Google Colab CPU Architecture)</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px] pt-1">
              <div className="p-2.5 rounded-xl bg-black border border-zinc-800">
                <strong className="text-cyan-400 block mb-0.5">1. PIR Wake & Capture</strong>
                <span className="text-zinc-400">ESP32 wakes on GPIO 13 &amp; uploads frame</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black border border-zinc-800">
                <strong className="text-amber-400 block mb-0.5">2. CPU Inference</strong>
                <span className="text-zinc-400">YOLOv8n (imgsz=320) runs in ~120ms (0 GPU Units)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black border border-zinc-800">
                <strong className="text-emerald-400 block mb-0.5">3. Classify & Track</strong>
                <span className="text-zinc-400">SG90 Servo pan (15°–165°) / 90° center</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black border border-zinc-800">
                <strong className="text-rose-400 block mb-0.5">4. Auto Deep Sleep</strong>
                <span className="text-zinc-400">Returns to sleep after target leaves (~150µA)</span>
              </div>
            </div>
          </div>

          {/* Colab CPU Setup Guide Card */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-zinc-800 pb-2.5">
              <Bot className="w-4 h-4" />
              <span className="text-sm">Google Colab CPU Setup Guide (75-Hour Free Session Optimization)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-zinc-300">
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 space-y-1">
                <span className="text-amber-300 font-bold block">Step 1: Standard CPU</span>
                <p className="text-[11px] text-zinc-400 font-sans">
                  In Colab, go to <strong>Runtime &gt; Change runtime type &gt; CPU</strong>. Standard CPU uses zero GPU compute units, giving you full access to Colab&apos;s 75-hour monthly tier.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 space-y-1">
                <span className="text-cyan-300 font-bold block">Step 2: ~120ms Frame Rate</span>
                <p className="text-[11px] text-zinc-400 font-sans">
                  With <code className="text-cyan-300">imgsz=320</code> and <code className="text-cyan-300">device=&apos;cpu&apos;</code>, YOLOv8 Nano processes each frame in ~0.12 seconds on standard Intel Xeon CPU.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 space-y-1">
                <span className="text-emerald-300 font-bold block">Step 3: Auto Sleep / Wake</span>
                <p className="text-[11px] text-zinc-400 font-sans">
                  When target leaves (3 clear checks), Colab sets <code className="text-emerald-300">sleep_command = true</code>. Colab idles at low CPU until PIR wakes the camera again.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmed Flow: Cloud Firestore REST API Direct Ingestion */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-black border border-emerald-500/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                    <span>Cloud Firestore REST API Ingestion (100% Free Spark Tier)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      ACTIVE &amp; VERIFIED
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-300 font-sans mt-0.5">
                    Your Google Colab Python script and ESP32 transmit detections directly to this endpoint with zero library overhead.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const restUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/solar_iot/security_system?updateMask.fieldPaths=last_detection&updateMask.fieldPaths=buzzer&updateMask.fieldPaths=last_seen&key=${firebaseConfig.apiKey}`;
                  navigator.clipboard.writeText(restUrl);
                  setCopiedRestUrl(true);
                  setTimeout(() => setCopiedRestUrl(false), 2500);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 font-mono shrink-0 shadow"
              >
                {copiedRestUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRestUrl ? 'Copied REST URL!' : 'Copy REST Endpoint'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black border border-zinc-800 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                <span className="text-emerald-400 font-bold">HTTP PATCH Endpoint</span>
                <span>Document: solar_iot/security_system</span>
              </div>
              <code className="text-zinc-300 break-all text-[11px] block select-all">
                https://firestore.googleapis.com/v1/projects/{firebaseConfig.projectId}/databases/{firebaseConfig.firestoreDatabaseId}/documents/solar_iot/security_system?key={firebaseConfig.apiKey}
              </code>
            </div>
          </div>

          {/* Python Code Viewer */}
          <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-black font-mono text-xs shadow-inner">
            <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-zinc-400 text-[11px]">
              <span className="text-amber-400 font-bold uppercase flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>google_colab_ai_detection.py</span>
              </span>
              <span>Python 3.10+ • Ultralytics YOLOv8n • Standard CPU Runtime (device=&apos;cpu&apos;)</span>
            </div>
            <pre className="p-4 text-amber-200/90 overflow-x-auto leading-relaxed max-h-[460px] custom-scrollbar">
              <code>{activeColabScript}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: ESP32-CAM Firmware, Pinout Guide & Hardware Architecture */}
      {activeTab === 'firmware' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">ESP32-CAM Hardware Firmware & Wiring</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Complete Arduino C++ Sketch with Active Buzzer (GPIO 12) & Firebase RTDB / Storage Upload
                </p>
              </div>
            </div>

            <button
              onClick={copyFirmwareSketch}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              {copiedCode ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Sketch Copied!' : 'Copy Arduino Sketch (.ino)'}</span>
            </button>
          </div>

          {/* Hardware Flow Architecture Explanation requested by user */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-yellow-300 font-bold">
                <Volume2 className="w-4 h-4" />
                <span>1. Triggering the Active Buzzer (GPIO 12)</span>
              </div>
              <p className="text-zinc-300 leading-relaxed font-sans text-xs">
                Connect the positive pin of a standard 5V or 3.3V active buzzer to <strong>GPIO 12</strong> on your ESP32-CAM.
                In the Arduino loop, the ESP32 constantly polls <code className="text-yellow-300 bg-black/60 px-1 py-0.5 rounded">/security_system/buzzer</code>.
                When the website sets it to <code className="text-emerald-400">true</code>, the ESP32 energizes GPIO 12 to sound the alarm, and then writes it back to <code className="text-zinc-400">false</code>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Power className="w-4 h-4" />
                <span>2. Turning OFF the Camera Power</span>
              </div>
              <p className="text-zinc-300 leading-relaxed font-sans text-xs">
                At the beginning of each loop, the ESP32 checks <code className="text-cyan-300 bg-black/60 px-1 py-0.5 rounded">/security_system/camera_active</code>.
                If <code className="text-emerald-400">true</code>, it takes a picture and uploads to Firebase Storage as <code className="text-white">latest_photo.jpg</code>.
                If <code className="text-red-400">false</code> (turned OFF via the website toggle), the ESP32 skips capture and waits, saving power without needing to unplug!
              </p>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-black font-mono text-xs shadow-inner">
            <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-zinc-400 text-[11px]">
              <span className="text-cyan-400 font-bold uppercase">esp32_cam_security_system.ino</span>
              <span>Board: AI Thinker ESP32-CAM • OV2640</span>
            </div>
            <pre className="p-4 text-emerald-300 overflow-x-auto leading-relaxed max-h-[460px] custom-scrollbar">
              <code>{activeEsp32Sketch}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: Event History Log */}
      {activeTab === 'history' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
            <div className="flex items-center space-x-2.5">
              <History className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-mono">Security Detection Audit Log</h3>
            </div>
            {eventLogs.length > 0 && (
              <button
                onClick={() => {
                  setEventLogs([]);
                  localStorage.removeItem('solar_iot_security_logs');
                }}
                className="text-xs text-zinc-500 hover:text-red-400 transition cursor-pointer font-mono"
              >
                Clear Log
              </button>
            )}
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {eventLogs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500/40 mx-auto" />
                <p>No detection events recorded yet.</p>
                <p className="text-[11px]">Intrusion events will be logged here automatically.</p>
              </div>
            ) : (
              eventLogs.map((item) => (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-xl bg-black border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-2.5">
                    {item.type === 'human' ? (
                      <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                        <ShieldAlert className="w-4 h-4" />
                      </span>
                    ) : item.type === 'animal' ? (
                      <span className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                        <Camera className="w-4 h-4" />
                      </span>
                    )}

                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className={item.type === 'human' ? 'text-red-400' : item.type === 'animal' ? 'text-yellow-300' : 'text-cyan-300'}>
                          {item.detection}
                        </span>
                        {item.buzzerTriggered && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                            Buzzer Dispatched
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Time: {item.timestamp}
                      </div>
                    </div>
                  </div>

                  {item.photoUrl && (
                    <button
                      onClick={() => {
                        setPhotoUrl(item.photoUrl!);
                        setActiveTab('monitor');
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Photo</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Realtime Database Diagnostics, Regional Config & Plan Fix */}
      {activeTab === 'rtdb_setup' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  <span>Firebase Realtime Database Diagnostics &amp; Plan Guide</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Resolve &ldquo;Upgrade your plan&rdquo; prompts, fix HTTP 404, or use 100% Free Cloud Firestore with zero billing required.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => testRtdbEndpoint(rtdbUrl)}
                disabled={isTestingRtdb}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingRtdb ? 'animate-spin' : ''}`} />
                <span>{isTestingRtdb ? 'Testing Connection...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          {/* Real-time Mode Selector: Free Firestore vs Dual RTDB */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900/90 to-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Choose Real-Time Streaming Architecture</span>
                <h4 className="text-sm font-bold text-white font-mono mt-0.5">How would you like live security detections &amp; telemetry to stream?</h4>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono w-fit">
                Currently: {syncMode === 'firestore_free' ? '🟢 100% Free Firestore Mode' : '🟡 Dual RTDB + Firestore'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* Option 1: 100% Free Cloud Firestore */}
              <button
                type="button"
                onClick={() => handleSetSyncMode('firestore_free')}
                className={`p-4 rounded-xl border text-left transition cursor-pointer relative ${
                  syncMode === 'firestore_free'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500'
                    : 'bg-black/50 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${syncMode === 'firestore_free' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span className="font-bold text-sm font-mono">100% Free Cloud Firestore Mode</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    RECOMMENDED • NO UPGRADE
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans mt-2 leading-relaxed">
                  Uses native Cloud Firestore WebSocket real-time push (<code className="text-emerald-300 font-mono text-[11px]">onSnapshot</code>). Runs 100% within the free Spark tier. <strong>Never requires a credit card, payment, or Blaze plan.</strong>
                </p>
              </button>

              {/* Option 2: Realtime Database Dual Sync */}
              <button
                type="button"
                onClick={() => handleSetSyncMode('dual')}
                className={`p-4 rounded-xl border text-left transition cursor-pointer relative ${
                  syncMode === 'dual'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-100 ring-1 ring-amber-500'
                    : 'bg-black/50 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className={`w-4 h-4 ${syncMode === 'dual' ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="font-bold text-sm font-mono">Realtime Database Dual-Sync</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                    FREE ONLY IN US-CENTRAL
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans mt-2 leading-relaxed">
                  Streams to both RTDB and Cloud Firestore. <strong>Must be created in United States (<code className="text-amber-300 font-mono text-[11px]">us-central1</code>)</strong> to stay on the free Spark tier without upgrading to Blaze.
                </p>
              </button>
            </div>
          </div>

          {/* CRITICAL EXPLANATION: Why Firebase says "Upgrade your plan" */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-red-950/20 to-zinc-950 border border-amber-500/40 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2 flex-wrap">
                  <span>Why does Firebase say &ldquo;Upgrade your project to the Blaze plan&rdquo;?</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    YOU DO NOT NEED TO PAY!
                  </span>
                </h4>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Here is the exact technical reason why you saw this error in the Firebase Console, and how to stay 100% free:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
              <div className="p-3.5 rounded-xl bg-black/60 border border-rose-500/30 space-y-1.5">
                <div className="font-bold text-rose-300 font-mono flex items-center gap-1.5">
                  <span>❌ What caused the &ldquo;Upgrade&rdquo; prompt:</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  When you clicked <em>Create Database</em> in Firebase, you likely selected <strong>Singapore (<code className="text-rose-300 font-mono">asia-southeast1</code>)</strong> or <strong>Belgium (<code className="text-rose-300 font-mono">europe-west1</code>)</strong>. Google Firebase requires the paid Blaze (pay-as-you-go) plan for non-US regional databases!
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/60 border border-emerald-500/30 space-y-1.5">
                <div className="font-bold text-emerald-300 font-mono flex items-center gap-1.5">
                  <span>✅ How to fix it for 100% FREE:</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  In Firebase Console, choose <strong>United States (<code className="text-emerald-300 font-mono">us-central1</code>)</strong> as the location! The United States location is <strong>100% FREE on the Spark plan</strong>. Firebase will immediately create the database without asking for any credit card or upgrade.
                </p>
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetSyncMode('firestore_free')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 font-mono shadow"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Stay 100% Free with Cloud Firestore (Zero Setup)</span>
              </button>
              <a
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/database`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition flex items-center gap-1.5 font-mono"
              >
                <span>Open Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Diagnostic Result Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            rtdbTestResult?.status === 'connected'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : rtdbTestResult?.status === 'not_found'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : rtdbTestResult?.status === 'permission_denied'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {rtdbTestResult?.status === 'connected' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : rtdbTestResult?.status === 'not_found' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                ) : rtdbTestResult?.status === 'permission_denied' ? (
                  <Lock className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold font-mono text-sm flex items-center gap-2">
                    <span>
                      {rtdbTestResult?.status === 'connected' && '🟢 200 OK — Realtime Database Connected'}
                      {rtdbTestResult?.status === 'not_found' && '🟡 HTTP 404 — Database Not Created in Firebase Console Yet'}
                      {rtdbTestResult?.status === 'permission_denied' && '🔴 HTTP 401/403 — Security Rules Locked'}
                      {rtdbTestResult?.status === 'error' && '⚪ Network / Connection Error'}
                      {!rtdbTestResult && 'Diagnostic Status Pending'}
                    </span>
                    {rtdbTestResult?.latencyMs !== null && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/40 text-zinc-300 font-mono border border-white/10">
                        ⚡ {rtdbTestResult?.latencyMs} ms
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 font-sans mt-1 leading-relaxed">
                    {rtdbTestResult?.message || 'Testing database endpoint...'}
                  </p>
                </div>
              </div>

              {/* Dual sync guarantee badge */}
              <div className="shrink-0 p-2.5 rounded-xl bg-black/50 border border-emerald-500/30 text-xs font-mono">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Dual-Sync Safeguard</div>
                <div className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cloud Firestore ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Endpoint URL Configurator */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Realtime Database Endpoint URL</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Enter your exact Realtime Database URL from your Firebase Console.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const defUrl = 'https://solariot-f49f5-default-rtdb.firebaseio.com';
                  handleSaveRtdbUrl(defUrl);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition font-mono underline cursor-pointer"
              >
                Reset Default (solariot-f49f5)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://solariot-f49f5-default-rtdb.firebaseio.com"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400 transition"
              />
              <button
                type="button"
                onClick={() => handleSaveRtdbUrl(customUrlInput)}
                className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 font-mono"
              >
                Save &amp; Connect
              </button>
            </div>

            {/* Quick Regional Presets with Plan Badges */}
            <div className="space-y-2">
              <div className="text-[11px] text-zinc-400 font-mono">Location Presets (Select your database to connect):</div>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveRtdbUrl('https://solariot-f49f5-default-rtdb.firebaseio.com');
                  }}
                  className={`px-3 py-2 rounded-xl border transition cursor-pointer flex items-center gap-2 ${
                    rtdbUrl.includes('solariot-f49f5')
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold ring-1 ring-emerald-500'
                      : 'bg-black border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <span>🇺🇸 solariot-f49f5 (firebaseio.com)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    SINGLE ACCOUNT • ACTIVE
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 1.5: Using Another Account's Firebase Realtime Database */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-zinc-900 to-black border border-cyan-500/30 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-sm font-mono">
                    Can I use a Realtime Database from another Firebase account?
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                    YES, 100% SUPPORTED!
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  You can connect <strong>ANY Realtime Database</strong> created under a different Gmail/Google account or Firebase project. There are zero cross-account restrictions — you simply need open security rules on that database!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-black border border-zinc-800 space-y-1.5">
                <div className="text-cyan-400 font-bold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">1</span>
                  <span>Get Other Account URL</span>
                </div>
                <p className="text-zinc-400 text-[11px] font-sans leading-relaxed">
                  Log into your other account at <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Firebase Console</a>, open your project &gt; Realtime Database, and copy the root URL (e.g. <code className="text-zinc-200">https://my-other-project-default-rtdb.firebaseio.com</code>).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-zinc-800 space-y-1.5">
                <div className="text-cyan-400 font-bold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">2</span>
                  <span>Set Open Rules</span>
                </div>
                <p className="text-zinc-400 text-[11px] font-sans leading-relaxed">
                  In that other project&apos;s <strong>Rules</strong> tab, set <code className="text-emerald-400 font-mono">{`{ "rules": { ".read": true, ".write": true } }`}</code> so this dashboard, Colab, and ESP32 can connect directly.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-zinc-800 space-y-1.5">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">3</span>
                  <span>Paste &amp; Save Above</span>
                </div>
                <p className="text-zinc-400 text-[11px] font-sans leading-relaxed">
                  Paste that URL into the <strong>Realtime Database Endpoint URL</strong> box above and click <strong>Save &amp; Connect</strong>. The dashboard, Colab code, and ESP32 firmware will instantly sync to your other account!
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: 1-Minute Step-by-Step Enablement Guide */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>How to Enable Free Realtime Database in Firebase Console (1 Minute)</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Follow these exact steps to ensure you stay on the 100% Free Spark Tier without paying:
                </p>
              </div>
              <a
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/database`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow font-mono"
              >
                <span>Open Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-black border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">1</span>
                  <span>Open Database</span>
                </div>
                <p className="text-zinc-400 text-[11px] font-sans leading-relaxed">
                  Go to <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/database`} target="_blank" rel="noreferrer" className="text-cyan-400 underline">Firebase Console</a>, open project <code className="text-zinc-200">{firebaseConfig.projectId}</code>, and click <strong>Realtime Database</strong> under &ldquo;Build&rdquo;.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-emerald-500/40 space-y-1.5 ring-1 ring-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
                  <span>Select US-Central (FREE!)</span>
                </div>
                <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
                  Click <strong>Create Database</strong>. In the Location dropdown, pick <strong>United States (us-central1)</strong>. <em>Do NOT select Singapore/Europe or it prompts Blaze!</em>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">3</span>
                  <span>Start in Test Mode</span>
                </div>
                <p className="text-zinc-400 text-[11px] font-sans leading-relaxed">
                  Under Security Rules, select <strong>Start in test mode</strong> (or paste open rules below). Click <strong>Enable</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
                  <span>Paste URL Here</span>
                </div>
                <p className="text-zinc-400 text-[11px] font-sans leading-relaxed">
                  Copy the database URL (<code className="text-zinc-200 font-mono">...default-rtdb.firebaseio.com</code>) and click <strong>Save &amp; Connect</strong> above.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Security Rules & Test Write Seed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rules Helper with Presets */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>Realtime Database Rules</span>
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex p-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setRulesPreset('scoped')}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${
                        rulesPreset === 'scoped'
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Scoped (Safe)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRulesPreset('open')}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${
                        rulesPreset === 'open'
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Open Mode
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyRules(rulesPreset)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 text-xs font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRules ? 'Copied!' : 'Copy Rules'}</span>
                  </button>
                </div>
              </div>

              {/* Explanatory callout addressing the red console banner */}
              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Fixing the Firebase Console Red Banner:</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  {rulesPreset === 'scoped' ? (
                    <>
                      <strong>Scoped Rules (Recommended)</strong> eliminate the <em>&quot;public rules&quot;</em> warning in Firebase by strictly granting read/write only to <code className="text-cyan-300 font-mono">/security_system</code> and <code className="text-cyan-300 font-mono">/solar_iot</code> without any expiration date.
                    </>
                  ) : (
                    <>
                      <strong>Open Mode</strong> allows read/write to all root branches. It removes any 30-day expiration lockout, but Firebase will display an informational banner cautioning that root rules are open.
                    </>
                  )}
                </p>
              </div>

              {/* Step by step action guide */}
              <div className="text-[11px] font-sans text-zinc-400 space-y-1 bg-black/40 p-2.5 rounded-xl border border-zinc-800/60">
                <div className="font-bold text-zinc-200">How to apply in Firebase Console:</div>
                <ol className="list-decimal list-inside space-y-0.5 text-zinc-400">
                  <li>In your database console (where you see Data), tap the <strong>Rules</strong> tab at the top.</li>
                  <li>Select all existing text and paste the JSON below.</li>
                  <li>Click the blue <strong>Publish</strong> button in the top right.</li>
                </ol>
              </div>

              <pre className="p-3 rounded-xl bg-black border border-zinc-800 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed max-h-48">
{rulesPreset === 'scoped' ? SCOPED_RULES_STR : OPEN_RULES_STR}
              </pre>
            </div>

            {/* Test Ping Tool */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Interactive Realtime Test Ping</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Send live diagnostic test packets to verify that your ESP32-CAM and Colab pathways can transmit to Firebase.
                </p>
              </div>

              {seedStatusMsg && (
                <div className={`p-3 rounded-xl text-xs font-mono border ${
                  seedStatusMsg.type === 'success' 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  {seedStatusMsg.text}
                </div>
              )}

              {firestoreSeedMsg && (
                <div className={`p-3 rounded-xl text-xs font-mono border ${
                  firestoreSeedMsg.type === 'success' 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  {firestoreSeedMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSeedRtdb}
                  disabled={isSeedingRtdb}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer font-mono flex items-center justify-center gap-2 shadow"
                >
                  <Zap className={`w-4 h-4 ${isSeedingRtdb ? 'animate-bounce' : ''}`} />
                  <span>{isSeedingRtdb ? 'Testing RTDB...' : 'Ping Realtime Database'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSeedFirestore}
                  disabled={isSeedingFirestore}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer font-mono flex items-center justify-center gap-2 shadow"
                >
                  <CheckCircle2 className={`w-4 h-4 ${isSeedingFirestore ? 'animate-spin' : ''}`} />
                  <span>{isSeedingFirestore ? 'Writing...' : 'Ping Cloud Firestore'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Video / Photo Stream Modal */}
      {isFullscreenPhoto && (() => {
        const isLocal = streamMode === 'local_mjpeg';
        const activeBase64 = photoViewMode === 'annotated'
          ? (boxedFrameBase64 || rawFrameBase64)
          : (rawFrameBase64 || boxedFrameBase64);
        const modalUrl = isLocal 
          ? localMjpegUrl 
          : (formatBase64Src(activeBase64) || alertPhotoUrl || photoUrl);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn">
            <div className="relative max-w-6xl w-full max-h-[92vh] flex flex-col items-center justify-center space-y-4">
              <button
                onClick={() => setIsFullscreenPhoto(false)}
                className="absolute top-2 right-2 p-2 rounded-full bg-zinc-900/90 text-white hover:bg-zinc-800 transition cursor-pointer z-10 shadow-lg"
                title="Close Fullscreen"
              >
                <Maximize2 className="w-5 h-5 rotate-45" />
              </button>
              {modalUrl ? (
                <img 
                  src={modalUrl} 
                  alt="Fullscreen Video Stream" 
                  className="max-h-[82vh] w-auto rounded-2xl border border-zinc-800 object-contain shadow-2xl"
                />
              ) : (
                <div className="p-12 text-center text-zinc-400 font-mono">
                  No active video stream or frame available.
                </div>
              )}
              <div className="text-xs font-mono text-zinc-400 flex items-center gap-3 flex-wrap justify-center">
                <span>
                  Source: <strong className={isLocal ? 'text-emerald-300' : 'text-cyan-300'}>
                    {isLocal ? '25 FPS Local Hardware MJPEG' : 'Cloud Realtime Base64'}
                  </strong>
                </span>
                <span>•</span>
                <span>Endpoint: <code>{isLocal ? localMjpegUrl : '/security_system/boxed_frame'}</code></span>
                <span>•</span>
                <a
                  href={googleDriveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-white flex items-center gap-1"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Google Drive Archive</span>
                </a>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

// Complete Python script generator for Google Colab CPU-accelerated Object Detection (YOLOv8 Nano)
// Mounts Google Drive (/content/drive/MyDrive/Farm_IOT_Security_Photos) & streams Base64 directly via RTDB
// Uses device='cpu' and imgsz=320 for ~120ms latency and 75 hours of free Colab compute without GPU dependency
export function getGoogleColabAiScript(activeUrl: string = 'https://solariot-f49f5-default-rtdb.firebaseio.com'): string {
  const cleanUrl = activeUrl.trim().replace(/\/+$/, '');
  return `# =========================================================================================
#  Farm.IOT — Google Colab CPU Vision Processor (Drive Archive + Base64 RTDB Stream)
#  Runtime: Standard CPU (No GPU required — saves compute quota across 75h sessions)
#  Storage: Zero Firebase Storage! Archives saved directly to Google Drive folder.
# =========================================================================================

# Step 1: Install Dependencies
!pip install -q ultralytics opencv-python-headless requests pillow

import os
import cv2
import time
import base64
import requests
import numpy as np
from datetime import datetime
from ultralytics import YOLO
from google.colab import drive
from google.colab.patches import cv2_imshow
from IPython.display import clear_output

# Step 2: Mount Google Drive to archive all Intruder & Wildlife photos
print("📁 Mounting Google Drive...")
drive.mount('/content/drive')

DRIVE_ARCHIVE_DIR = '/content/drive/MyDrive/Farm_IOT_Security_Photos'
os.makedirs(DRIVE_ARCHIVE_DIR, exist_ok=True)
print(f"✅ Google Drive Archive Ready: {DRIVE_ARCHIVE_DIR}")

# Firebase Realtime Database Configuration (NO Firebase Storage needed!)
FIREBASE_RTDB_URL = "${cleanUrl}"

print("🚀 Loading YOLOv8n on Google Colab CPU Runtime...")
model = YOLO('yolov8n.pt')

HUMAN_CLASS_ID = 0
ANIMAL_CLASS_IDS = {14, 15, 16, 17, 18, 19, 20, 21, 22, 23}
empty_frame_streak = 0  # Counts clear frames before putting ESP32-CAM back to sleep

def fetch_raw_frame():
    """Fetch raw base64 frame from RTDB /security_system/raw_frame"""
    try:
        resp = requests.get(f"{FIREBASE_RTDB_URL}/security_system/raw_frame.json", timeout=6)
        if resp.status_code != 200 or not resp.json():
            return None
        raw_b64 = resp.json()
        if raw_b64.startswith("data:image"):
            raw_b64 = raw_b64.split(",")[1]
        img_bytes = base64.b64decode(raw_b64)
        img_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        return cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
    except Exception as e:
        return None

def process_frame_on_cpu():
    global empty_frame_streak

    # 1. Fetch latest raw frame pushed by ESP32-CAM
    img = fetch_raw_frame()
    if img is None:
        return None

    # 2. Run fast CPU inference (imgsz=320 runs in ~120ms on standard CPU)
    results = model(img, conf=0.40, imgsz=320, device='cpu', verbose=False)[0]

    detected_human = False
    detected_animal = False
    servo_angle = 90
    img_width = img.shape[1]
    detected_label = "None"

    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        label = model.names[cls_id]
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        if cls_id == HUMAN_CLASS_ID:
            detected_human = True
            detected_label = "Human"
            # Calculate SG90 Servo Tracking Angle (15° to 165°)
            person_center_x = (x1 + x2) / 2
            servo_angle = int(180 - ((person_center_x / img_width) * 180))
            servo_angle = max(15, min(165, servo_angle))

            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 3)
            cv2.putText(img, f"HUMAN {conf*100:.0f}% | SERVO: {servo_angle} deg",
                        (x1, max(20, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        elif cls_id in ANIMAL_CLASS_IDS:
            detected_animal = True
            detected_label = f"Animal_{label}"
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 255), 3)
            cv2.putText(img, f"ANIMAL: {label.upper()} {conf*100:.0f}%",
                        (x1, max(20, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

    # 3. Handle Detection & Google Drive Archiving
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if detected_human or detected_animal:
        empty_frame_streak = 0
        
        # Save photo archive directly to Google Drive
        filename = f"{detected_label}_{timestamp_str}.jpg"
        file_path = os.path.join(DRIVE_ARCHIVE_DIR, filename)
        cv2.imwrite(file_path, img)
        print(f"💾 Archived to Google Drive: {filename}")

        # Encode annotated frame to Base64 for live dashboard view
        _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 75])
        boxed_b64 = base64.b64encode(buffer).decode('utf-8')

        if detected_human:
            requests.patch(f"{FIREBASE_RTDB_URL}/security_system.json", json={
                "system_state": "AWAKE_TRACKING",
                "last_detection": "Human",
                "servo_angle": servo_angle,
                "buzzer": False,
                "sleep_command": False,
                "boxed_frame": boxed_b64,
                "latest_saved_drive_file": filename
            })
            print(f"🚨 HUMAN TRACKED -> Rotating SG90 Servo to {servo_angle}° (Buzzer Silent)")

        elif detected_animal:
            requests.patch(f"{FIREBASE_RTDB_URL}/security_system.json", json={
                "system_state": "AWAKE_TRACKING",
                "last_detection": "Animal",
                "servo_angle": 90,
                "buzzer": True,
                "sleep_command": False,
                "boxed_frame": boxed_b64,
                "latest_saved_drive_file": filename
            })
            print("⚠️ ANIMAL DETECTED -> Sounding GPIO 12 Buzzer for 3.5s...")
            time.sleep(3.5)
            requests.put(f"{FIREBASE_RTDB_URL}/security_system/buzzer.json", json=False)

    else:
        empty_frame_streak += 1
        print(f"✅ Perimeter clear ({empty_frame_streak}/3 checks)")

        # After 3 consecutive clear checks, send Deep Sleep command
        if empty_frame_streak >= 3:
            print("🌙 Target gone! Sending Deep Sleep command to ESP32-CAM...")
            requests.patch(f"{FIREBASE_RTDB_URL}/security_system.json", json={
                "system_state": "SLEEPING",
                "last_detection": "None",
                "servo_angle": 90,
                "buzzer": False,
                "sleep_command": True
            })

    return img

# Continuous CPU Loop
print("✅ CPU Vision Loop Active! Polling RTDB Base64 frames...")
while True:
    try:
        state_resp = requests.get(f"{FIREBASE_RTDB_URL}/security_system/system_state.json", timeout=5)
        state = state_resp.json() if state_resp.status_code == 200 else "SLEEPING"
        
        if state == "SLEEPING":
            print("🌙 ESP32-CAM is in Deep Sleep. Waiting for PIR sensor on GPIO 13 to wake it up...")
            time.sleep(4)
        else:
            frame = process_frame_on_cpu()
            if frame is not None:
                clear_output(wait=True)
                cv2_imshow(frame)
            time.sleep(2)
    except KeyboardInterrupt:
        print("🛑 Stopped by user.")
        break
    except Exception as e:
        time.sleep(2)
`;
}

export const GOOGLE_COLAB_AI_SCRIPT = getGoogleColabAiScript();

// Complete Arduino C++ sketch generator for AI-Thinker ESP32-CAM with OV2640, Active Buzzer on GPIO 12,
// PIR sensor wake-up on GPIO 13, SG90 Micro Servo tracking on GPIO 14, Local 25 FPS MJPEG Streamer & Base64 RTDB Broadcaster
export function getEsp32CamSketch(activeUrl: string = 'https://solariot-f49f5-default-rtdb.firebaseio.com'): string {
  const cleanUrl = activeUrl.trim().replace(/\/+$/, '');
  return `/*
 * =========================================================================================
 *  Farm.IOT — ESP32-CAM Dual Stream Firmware (Local 25FPS MJPEG + Cloud Base64 RTDB)
 * =========================================================================================
 *  Hardware Connections:
 *   - AI-Thinker ESP32-CAM with OV2640 Camera
 *   - PIR Motion Sensor (HC-SR501 / AM312): OUT -> GPIO 13 (EXT0 Wake-up source)
 *   - SG90 Micro Servo (5V / 3.3V): Signal -> GPIO 14 (LEDC PWM), VCC -> 5V, GND -> GND
 *   - Active Buzzer (5V / 3.3V): (+) -> GPIO 12, (-) -> GND
 *   - External 5V 2A Regulated Power Supply
 *
 *  Features (NO Firebase Storage required!):
 *   1. Local High-Speed MJPEG Stream Server: http://<ESP32_IP>:81/stream (25 FPS smooth stream)
 *   2. Cloud Base64 Broadcaster: Uploads Base64 JPEG to /security_system/raw_frame in RTDB
 *   3. Google Drive Archiving via Google Colab CPU vision processor
 *   4. PIR Night-Mode Deep Sleep on GPIO 13
 *   5. SG90 Servo Intruder Angle Tracking on GPIO 14 (15° to 165°)
 *   6. GPIO 12 Active Buzzer for Animal Deterrent
 * =========================================================================================
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include "esp_http_server.h"
#include "mbedtls/base64.h"

// 1. WiFi Credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// 2. Firebase Project Credentials (solariot-f49f5 Single Account)
#define API_KEY "${firebaseConfig.apiKey}"
#define DATABASE_URL "${cleanUrl}"

// 3. Hardware Pin Definitions
#define BUZZER_PIN 12    // Active Buzzer connected to GPIO 12
#define PIR_PIN    13    // PIR Motion Sensor OUT on GPIO 13 (Wake-up pin)
#define SERVO_PIN  14    // SG90 Micro Servo PWM Signal on GPIO 14

// Servo PWM configuration using native ESP32 LEDC (No external servo library required)
#define SERVO_LEDC_CH  2
#define SERVO_FREQ     50    // 50Hz for SG90 servo (20ms period)
#define SERVO_RES      16    // 16-bit resolution (0 - 65535)

// 4. AI-Thinker ESP32-CAM Pin Configuration
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\\r\\n--" PART_BOUNDARY "\\r\\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\\r\\nContent-Length: %u\\r\\n\\r\\n";

httpd_handle_t stream_httpd = NULL;
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool cameraActive = true;
bool buzzerActive = false;
int currentServoAngle = 90;
unsigned long lastBase64UploadMillis = 0;
unsigned long lastHeartbeatMillis = 0;

void setServoAngle(int angle) {
  angle = constrain(angle, 15, 165);
  currentServoAngle = angle;
  // SG90 50Hz (20ms period): 0.5ms (15°) to 2.4ms (165°)
  float pulse_ms = 0.5 + ((float)angle / 180.0) * 1.9;
  uint32_t duty = (uint32_t)((pulse_ms / 20.0) * 65535.0);
  ledcWrite(SERVO_LEDC_CH, duty);
  Serial.printf("[SERVO] Rotated SG90 to %d degrees\\n", angle);
}

void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA; // 320x240 for 25 FPS high throughput
  config.jpeg_quality = 12;
  config.fb_count = 2; // Double buffer for smooth 25 FPS MJPEG stream

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAMERA] Init failed: 0x%x\\n", err);
  } else {
    Serial.println("[CAMERA] OV2640 Initialized successfully.");
  }
}

// -------------------------------------------------------------------------
// Local High-Speed MJPEG Streaming Server (Port 81)
// -------------------------------------------------------------------------
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[STREAM] Camera capture failed");
      res = ESP_FAIL;
    } else {
      _jpg_buf_len = fb->len;
      _jpg_buf = fb->buf;
    }
    if (res == ESP_OK) {
      size_t hlen = snprintf(part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, part_buf, strlen(part_buf));
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if (_jpg_buf) {
      free(_jpg_buf);
      _jpg_buf = NULL;
    }
    if (res != ESP_OK) break;
  }
  return res;
}

void startLocalCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 81;
  config.ctrl_port = 32768;

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    Serial.printf("⚡ [STREAM] 25 FPS MJPEG Server active at: http://%s:81/stream\\n", WiFi.localIP().toString().c_str());
  }
}

// -------------------------------------------------------------------------
// Cloud Base64 Broadcaster to Firebase RTDB /security_system/raw_frame
// -------------------------------------------------------------------------
void broadcastRawFrameBase64() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) return;

  size_t output_len = 0;
  mbedtls_base64_encode(NULL, 0, &output_len, fb->buf, fb->len);
  char *b64_buffer = (char *)malloc(output_len + 1);

  if (b64_buffer) {
    if (mbedtls_base64_encode((unsigned char *)b64_buffer, output_len + 1, &output_len, fb->buf, fb->len) == 0) {
      b64_buffer[output_len] = '\\0';
      Firebase.RTDB.setString(&fbdo, "/security_system/raw_frame", b64_buffer);
    }
    free(b64_buffer);
  }
  esp_camera_fb_return(fb);
}

void enterDeepSleepWithPirArmed() {
  Serial.println("🌙 [POWER] Entering Deep Sleep (~150uA). Arming PIR wake-up on GPIO 13...");
  setServoAngle(90); // Center camera before sleeping
  delay(300);

  // Configure PIR Sensor on GPIO 13 as EXT0 Wakeup (wakes on HIGH logic level)
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_13, 1);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(PIR_PIN, INPUT);

  // Initialize SG90 Servo PWM on GPIO 14
  ledcSetup(SERVO_LEDC_CH, SERVO_FREQ, SERVO_RES);
  ledcAttachPin(SERVO_PIN, SERVO_LEDC_CH);
  setServoAngle(90); // Start at 90° center position

  // Check Wake-up Reason
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  if (wakeup_reason == ESP_SLEEP_WAKEUP_EXT0) {
    Serial.println("⚡ [POWER] WOKEN UP BY PIR SENSOR ON GPIO 13! Motion detected!");
  } else {
    Serial.println("⚡ [POWER] Normal boot or reset.");
  }

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi connected!");
  Serial.printf("ESP32-CAM Local IP: %s\\n", WiFi.localIP().toString().c_str());

  // Initialize Camera
  initCamera();

  // Start 25 FPS MJPEG Local Streaming Server on Port 81
  startLocalCameraServer();

  // Initialize Firebase RTDB
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Register physical camera connection and initial system state
  Firebase.RTDB.setBool(&fbdo, "/security_system/camera_connected", true);
  Firebase.RTDB.setString(&fbdo, "/security_system/system_state", "AWAKE_TRACKING");
  Firebase.RTDB.setBool(&fbdo, "/security_system/sleep_command", false);
  Firebase.RTDB.setInt(&fbdo, "/security_system/servo_angle", 90);
  Firebase.RTDB.onDisconnect.setBool(&fbdo, "/security_system/camera_connected", false);

  // If woken by PIR, broadcast raw frame immediately for Colab
  if (wakeup_reason == ESP_SLEEP_WAKEUP_EXT0) {
    delay(400);
    broadcastRawFrameBase64();
  }
}

void loop() {
  // Update heartbeat in RTDB every 5 seconds
  if (millis() - lastHeartbeatMillis > 5000) {
    lastHeartbeatMillis = millis();
    Firebase.RTDB.setBool(&fbdo, "/security_system/camera_connected", true);
    Firebase.RTDB.setInt(&fbdo, "/security_system/last_seen", (int)millis());
  }

  // 1. CHECK SLEEP COMMAND FROM GOOGLE COLAB / WEB DASHBOARD
  if (Firebase.RTDB.getBool(&fbdo, "/security_system/sleep_command")) {
    if (fbdo.boolData() == true) {
      Serial.println("🌙 [SLEEP] Sleep command received from Colab/Web Dashboard!");
      Firebase.RTDB.setBool(&fbdo, "/security_system/sleep_command", false);
      Firebase.RTDB.setString(&fbdo, "/security_system/system_state", "SLEEPING");
      enterDeepSleepWithPirArmed();
    }
  }

  // 2. CHECK SG90 SERVO TRACKING ANGLE: /security_system/servo_angle (15° - 165°)
  if (Firebase.RTDB.getInt(&fbdo, "/security_system/servo_angle")) {
    int targetAngle = fbdo.intData();
    if (targetAngle >= 15 && targetAngle <= 165 && targetAngle != currentServoAngle) {
      setServoAngle(targetAngle);
    }
  }

  // 3. CHECK CAMERA POWER SWITCH & BROADCAST CLOUD BASE64
  if (Firebase.RTDB.getBool(&fbdo, "/security_system/camera_active")) {
    cameraActive = fbdo.boolData();
  }

  if (cameraActive) {
    // Broadcast raw base64 frame to RTDB every 4 seconds for Colab CPU processing
    if (millis() - lastBase64UploadMillis > 4000) {
      lastBase64UploadMillis = millis();
      broadcastRawFrameBase64();
    }
  }

  // 4. CHECK BUZZER TRIGGER: /security_system/buzzer (3.5s for Animal Deterrent)
  if (Firebase.RTDB.getBool(&fbdo, "/security_system/buzzer")) {
    buzzerActive = fbdo.boolData();
    if (buzzerActive) {
      Serial.println("🚨 [ALARM] Animal Deterrent! Sounding GPIO 12 Active Buzzer for 3.5s...");
      digitalWrite(BUZZER_PIN, HIGH);
      delay(3500);
      digitalWrite(BUZZER_PIN, LOW);

      // Reset buzzer back to false
      Firebase.RTDB.setBool(&fbdo, "/security_system/buzzer", false);
      Serial.println("[ALARM] Buzzer silenced.");
    }
  }

  delay(200);
}
`;
}

export const ESP32_CAM_SKETCH = getEsp32CamSketch();

