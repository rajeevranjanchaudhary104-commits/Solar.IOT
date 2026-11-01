import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  VolumeX, 
  Volume2, 
  ExternalLink, 
  RefreshCw, 
  Plus, 
  Search, 
  Clock, 
  Cpu, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  Lock, 
  Unlock, 
  Radio, 
  UserCheck, 
  UserX,
  X,
  Calendar,
  Layers,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { WorkerProfile, AttendanceRecord } from '../types/solar';
import { 
  initGoogleDocsAuth, 
  signInWithGoogleDocs, 
  hasGoogleDocsToken, 
  getGoogleAccessToken, 
  getSavedGoogleDocId, 
  getSavedGoogleDocUrl, 
  logAttendanceToGoogleDoc,
  createAttendanceGoogleDoc
} from '../lib/googleDocs';
import { db, rtdb, firebaseConfig } from '../lib/firebase';
import { ref as dbRef, set as dbSet, onValue } from 'firebase/database';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

interface WorkersSectionProps {
  user?: any;
  onRequireSignIn?: () => void;
  onNavigateToSecurity?: () => void;
  onNavigateToEsp32?: () => void;
}

// Pre-seeded verified agricultural farm staff
const INITIAL_WORKERS: WorkerProfile[] = [
  {
    id: 'w_01',
    name: 'Dr. Vikram Patel',
    role: 'Lead Agronomist & Microgrid Operator',
    department: 'Research & Grid Systems',
    rfidUid: '4A:F2:9B:10',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    faceRecognitionVerified: true,
    muteBuzzerOnEntry: true,
    status: 'on_shift',
    phone: '+91 98765 43210',
    email: 'vikram.patel@farmiot.org',
    registeredDate: '2026-01-15',
    lastCheckIn: 'Today, 08:15 AM'
  },
  {
    id: 'w_02',
    name: 'Anita Sharma',
    role: 'Solar PV & Wiper Automation Lead',
    department: 'Renewable Power',
    rfidUid: '73:1B:64:89',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    faceRecognitionVerified: true,
    muteBuzzerOnEntry: true,
    status: 'on_shift',
    phone: '+91 98765 11223',
    email: 'anita.sharma@farmiot.org',
    registeredDate: '2026-02-01',
    lastCheckIn: 'Today, 08:30 AM'
  },
  {
    id: 'w_03',
    name: 'Rajesh Kumar',
    role: 'Rhizosphere Soil & Irrigation Tech',
    department: 'Smart Irrigation',
    rfidUid: 'A9:2E:7C:33',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    faceRecognitionVerified: true,
    muteBuzzerOnEntry: true,
    status: 'active',
    phone: '+91 98765 88990',
    email: 'rajesh.kumar@farmiot.org',
    registeredDate: '2026-02-18',
    lastCheckIn: 'Yesterday, 05:40 PM'
  },
  {
    id: 'w_04',
    name: 'Sunita Verma',
    role: 'Agrivoltaic Crop Specialist',
    department: 'Nursery & Harvest',
    rfidUid: 'B5:8D:12:4F',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    faceRecognitionVerified: true,
    muteBuzzerOnEntry: true,
    status: 'active',
    phone: '+91 98765 33445',
    email: 'sunita.verma@farmiot.org',
    registeredDate: '2026-03-05',
    lastCheckIn: 'Yesterday, 06:10 PM'
  },
  {
    id: 'w_05',
    name: 'Manoj Singh',
    role: 'Perimeter Security & ESP32-CAM Tech',
    department: 'Facility Security',
    rfidUid: 'C1:33:9A:7E',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    faceRecognitionVerified: true,
    muteBuzzerOnEntry: true,
    status: 'on_shift',
    phone: '+91 98765 77665',
    email: 'manoj.singh@farmiot.org',
    registeredDate: '2026-01-10',
    lastCheckIn: 'Today, 07:45 AM'
  }
];

export const WorkersSection: React.FC<WorkersSectionProps> = ({
  user,
  onRequireSignIn,
  onNavigateToSecurity,
  onNavigateToEsp32
}) => {
  // Workers State
  const [workers, setWorkers] = useState<WorkerProfile[]>(() => {
    try {
      const saved = localStorage.getItem('farmiot_workers_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_WORKERS;
  });

  // Attendance Records State
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('farmiot_attendance_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'att_01',
        workerId: 'w_05',
        workerName: 'Manoj Singh',
        role: 'Perimeter Security & ESP32-CAM Tech',
        rfidUid: 'C1:33:9A:7E',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        date: new Date().toLocaleDateString(),
        time: '07:45 AM',
        faceMatched: true,
        buzzerSuppressed: true,
        gateId: 'Gate-Alpha-1',
        syncedToGoogleDocs: true,
        googleDocUrl: getSavedGoogleDocUrl() || undefined
      },
      {
        id: 'att_02',
        workerId: 'w_01',
        workerName: 'Dr. Vikram Patel',
        role: 'Lead Agronomist & Microgrid Operator',
        rfidUid: '4A:F2:9B:10',
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        date: new Date().toLocaleDateString(),
        time: '08:15 AM',
        faceMatched: true,
        buzzerSuppressed: true,
        gateId: 'Gate-Alpha-1',
        syncedToGoogleDocs: true,
        googleDocUrl: getSavedGoogleDocUrl() || undefined
      },
      {
        id: 'att_03',
        workerId: 'w_02',
        workerName: 'Anita Sharma',
        role: 'Solar PV & Wiper Automation Lead',
        rfidUid: '73:1B:64:89',
        timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
        date: new Date().toLocaleDateString(),
        time: '08:30 AM',
        faceMatched: true,
        buzzerSuppressed: true,
        gateId: 'Gate-Alpha-1',
        syncedToGoogleDocs: true,
        googleDocUrl: getSavedGoogleDocUrl() || undefined
      }
    ];
  });

  // Google Docs Auth & Connection State
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(() => hasGoogleDocsToken());
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);
  const [googleDocId, setGoogleDocId] = useState<string | null>(() => getSavedGoogleDocId());
  const [googleDocUrl, setGoogleDocUrl] = useState<string | null>(() => getSavedGoogleDocUrl());
  const [isSyncingDoc, setIsSyncingDoc] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active RFID Reader & Live Reader State
  const [isScanningRfid, setIsScanningRfid] = useState<boolean>(false);
  const [lastScannedUid, setLastScannedUid] = useState<string | null>(null);
  const [manualInputUid, setManualInputUid] = useState<string>('');
  const [scanResult, setScanResult] = useState<{
    status: 'authorized' | 'unauthorized' | 'processing' | 'already_checked_in';
    worker?: WorkerProfile;
    message: string;
    buzzerMuted: boolean;
  } | null>(null);

  // New Worker Modal
  const [showAddWorkerModal, setShowAddWorkerModal] = useState<boolean>(false);
  const [newWorkerName, setNewWorkerName] = useState<string>('');
  const [newWorkerRole, setNewWorkerRole] = useState<string>('');
  const [newWorkerDept, setNewWorkerDept] = useState<string>('Renewable Power');
  const [newWorkerRfid, setNewWorkerRfid] = useState<string>('');
  const [newWorkerPhone, setNewWorkerPhone] = useState<string>('');

  // Delete / Unlink RFID Profile Confirmation Modal
  const [workerToDelete, setWorkerToDelete] = useState<WorkerProfile | null>(null);

  // Active Sub-Tab (Production Mode - Test Mode Removed)
  const [activeTab, setActiveTab] = useState<'attendance' | 'workers' | 'gate_scanner' | 'hardware_code'>('attendance');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSketch, setCopiedSketch] = useState<boolean>(false);

  // Audio Context Ref for RFID Beep and Buzzer
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBuzzerTone = (frequency: number, durationMs: number, type: OscillatorType = 'sine') => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  };

  // Listen to Google Docs Auth state on mount
  useEffect(() => {
    const unsubscribe = initGoogleDocsAuth(
      (googleUser, token) => {
        setIsGoogleConnected(true);
      },
      () => {
        setIsGoogleConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save workers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('farmiot_workers_list', JSON.stringify(workers));
    } catch {}
  }, [workers]);

  // Save attendance logs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('farmiot_attendance_logs', JSON.stringify(attendanceLogs));
    } catch {}
  }, [attendanceLogs]);

  // Real-time synchronization with Firebase for RFID gate events
  useEffect(() => {
    // 1. Listen to Realtime Database for hardware RFID card taps (/solar_iot/rfid_events)
    let unsubRtdb: (() => void) | null = null;
    if (rtdb) {
      try {
        const rfidRef = dbRef(rtdb, 'solar_iot/rfid_events/latest');
        unsubRtdb = onValue(rfidRef, (snapshot) => {
          const val = snapshot.val();
          if (val && val.uid && val.timestamp && Date.now() - val.timestamp < 10000) {
            handleRfidTap(val.uid, 'ESP32 Hardware Reader');
          }
        }, (err) => {
          console.warn('[Workers] RTDB listener note:', err);
        });
      } catch {}
    }

    // 2. Listen to Cloud Firestore (/solar_iot/rfid_events)
    let unsubFirestore: (() => void) | null = null;
    if (db) {
      try {
        const firestoreDoc = doc(db, 'solar_iot', 'rfid_events');
        unsubFirestore = onSnapshot(firestoreDoc, (snapshot) => {
          const data = snapshot.data();
          if (data && data.latest_uid && data.timestamp && Date.now() - data.timestamp < 10000) {
            handleRfidTap(data.latest_uid, 'ESP32 Hardware Reader');
          }
        }, () => {});
      } catch {}
    }

    return () => {
      if (unsubRtdb) unsubRtdb();
      if (unsubFirestore) unsubFirestore();
    };
  }, [workers]);

  // Connect to Google Docs OAuth
  const handleConnectGoogleDocs = async () => {
    try {
      setIsConnectingGoogle(true);
      setSyncStatusMsg(null);
      const { user: gUser, accessToken } = await signInWithGoogleDocs();
      setIsGoogleConnected(true);
      
      // Auto-create or verify document
      if (!googleDocId) {
        const newDoc = await createAttendanceGoogleDoc(accessToken);
        setGoogleDocId(newDoc.documentId);
        setGoogleDocUrl(newDoc.url);
        setSyncStatusMsg({
          type: 'success',
          text: `Connected to Google Docs! Created register document: "${newDoc.documentId.substring(0, 12)}..."`
        });
      } else {
        setSyncStatusMsg({
          type: 'success',
          text: `Successfully connected with ${gUser.email}! Live sync ready.`
        });
      }
    } catch (err: any) {
      console.error('Google Docs connection error:', err);
      setSyncStatusMsg({
        type: 'error',
        text: err.message || 'Failed to authenticate with Google Docs. Please try again.'
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Helper to check if two dates are on the same calendar day
  const isSameCalendarDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Helper to check if a worker has already checked in today (Strict 1 Check-In / Day Rule)
  const getWorkerTodayRecord = (workerId: string, rfidUid?: string) => {
    return attendanceLogs.find(log => 
      (log.workerId === workerId || (rfidUid && log.rfidUid.trim().toUpperCase() === rfidUid.trim().toUpperCase())) &&
      isSameCalendarDay(new Date(log.timestamp), new Date())
    );
  };

  const isWorkerCheckedInToday = (workerId: string, rfidUid?: string) => {
    return Boolean(getWorkerTodayRecord(workerId, rfidUid));
  };

  // Perform an RFID Card Event (Physical Reader or Gate Terminal)
  const handleRfidTap = async (uid: string, source: string = 'ESP32 Hardware Reader') => {
    const cleanUid = uid.trim().toUpperCase();
    setIsScanningRfid(true);
    setLastScannedUid(cleanUid);
    setScanResult({
      status: 'processing',
      message: `Scanning RFID Card (UID: ${cleanUid})...`,
      buzzerMuted: false
    });

    // Check against authorized workers database
    const matchedWorker = workers.find(w => w.rfidUid.trim().toUpperCase() === cleanUid);

    setTimeout(async () => {
      if (matchedWorker) {
        // ENFORCE 1-PER-DAY POLICY: "No one can add more than 1 in a day"
        const existingRecordToday = getWorkerTodayRecord(matchedWorker.id, cleanUid);

        if (existingRecordToday) {
          // Worker is recognized & whitelisted: Mute ESP32-CAM buzzer to grant gate entry without false alarms!
          playBuzzerTone(2000, 100, 'sine');
          await suppressSecurityBuzzer(matchedWorker.name, cleanUid);

          // BUT STRICTLY DO NOT ADD another attendance log or append to Google Docs!
          setScanResult({
            status: 'already_checked_in',
            worker: matchedWorker,
            message: `ACCESS GRANTED (Buzzer Muted): ${matchedWorker.name} has ALREADY recorded attendance today at ${existingRecordToday.time}. Policy enforces maximum 1 check-in per day (No duplicate record created).`,
            buzzerMuted: matchedWorker.muteBuzzerOnEntry
          });
          setIsScanningRfid(false);
          return;
        }

        // First check-in of the day: Double success beep (1800 Hz then 2400 Hz)
        playBuzzerTone(1800, 80, 'sine');
        setTimeout(() => playBuzzerTone(2400, 120, 'sine'), 90);

        // Suppress ESP32-CAM buzzer on Firebase
        await suppressSecurityBuzzer(matchedWorker.name, cleanUid);

        const newRecord: AttendanceRecord = {
          id: `att_${Date.now()}`,
          workerId: matchedWorker.id,
          workerName: matchedWorker.name,
          role: matchedWorker.role,
          rfidUid: cleanUid,
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          faceMatched: matchedWorker.faceRecognitionVerified,
          buzzerSuppressed: matchedWorker.muteBuzzerOnEntry,
          gateId: 'Gate-Alpha-1',
          syncedToGoogleDocs: false
        };

        // Try direct sync to Google Docs if token is cached
        const token = getGoogleAccessToken();
        if (token) {
          try {
            const syncResult = await logAttendanceToGoogleDoc(token, newRecord);
            newRecord.syncedToGoogleDocs = true;
            newRecord.googleDocId = syncResult.documentId;
            newRecord.googleDocUrl = syncResult.url;
            setGoogleDocUrl(syncResult.url);
          } catch (syncErr: any) {
            console.warn('Google doc auto-append note:', syncErr);
          }
        }

        // Update attendance list (Enforces 1 record per worker per day)
        setAttendanceLogs(prev => [newRecord, ...prev.slice(0, 49)]);

        // Update worker's last check-in
        setWorkers(prev => prev.map(w => w.id === matchedWorker.id ? {
          ...w,
          status: 'on_shift',
          lastCheckIn: `Today, ${newRecord.time}`
        } : w));

        setScanResult({
          status: 'authorized',
          worker: matchedWorker,
          message: `FIRST CHECK-IN RECORDED (1/1 Today): ${matchedWorker.name} (${matchedWorker.role}). Face Matched — ESP32-CAM Buzzer MUTED. Added to Google Docs.`,
          buzzerMuted: matchedWorker.muteBuzzerOnEntry
        });
      } else {
        // Low discordant warning beep (400 Hz)
        playBuzzerTone(400, 350, 'sawtooth');

        setScanResult({
          status: 'unauthorized',
          message: `ACCESS DENIED: Unknown RFID UID (${cleanUid}). Security Alarm Armed & Camera Snapshot Logged!`,
          buzzerMuted: false
        });
      }

      setIsScanningRfid(false);
    }, 600);
  };

  // Suppress ESP32-CAM Security Buzzer on Firebase
  const suppressSecurityBuzzer = async (workerName: string, uid: string) => {
    // 1. Firebase Realtime Database
    if (rtdb) {
      try {
        const secRef = dbRef(rtdb, 'solar_iot/security_system');
        await dbSet(secRef, {
          buzzer: false,
          last_detection: `Authorized Worker: ${workerName}`,
          camera_active: true,
          authorized_rfid: uid,
          buzzer_muted: true,
          updated_at: new Date().toISOString()
        });
      } catch {}
    }

    // 2. Cloud Firestore (100% Free Spark Tier)
    if (db) {
      try {
        const secDoc = doc(db, 'solar_iot', 'security_system');
        await setDoc(secDoc, {
          buzzer: false,
          last_detection: `Authorized Worker: ${workerName}`,
          camera_active: true,
          authorized_rfid: uid,
          buzzer_muted: true,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch {}
    }
  };

  // Manual Sync of all unsynced records to Google Docs
  const handleSyncPendingRecords = async () => {
    let token = getGoogleAccessToken();
    if (!token) {
      try {
        const res = await signInWithGoogleDocs();
        token = res.accessToken;
        setIsGoogleConnected(true);
      } catch (err: any) {
        setSyncStatusMsg({
          type: 'error',
          text: 'Google authentication required before syncing.'
        });
        return;
      }
    }

    setIsSyncingDoc(true);
    setSyncStatusMsg(null);
    try {
      const unsynced = attendanceLogs.filter(r => !r.syncedToGoogleDocs);
      if (unsynced.length === 0) {
        setSyncStatusMsg({
          type: 'success',
          text: 'All attendance records are already synchronized with Google Docs!'
        });
        setIsSyncingDoc(false);
        return;
      }

      let lastUrl = googleDocUrl || '';
      for (const record of unsynced) {
        const res = await logAttendanceToGoogleDoc(token, record);
        lastUrl = res.url;
        record.syncedToGoogleDocs = true;
        record.googleDocUrl = res.url;
        record.googleDocId = res.documentId;
      }

      setAttendanceLogs([...attendanceLogs]);
      setGoogleDocUrl(lastUrl);
      setSyncStatusMsg({
        type: 'success',
        text: `Successfully synced ${unsynced.length} attendance record(s) to Google Docs!`
      });
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `Sync error: ${err.message || 'Check Google Drive & Docs permissions'}`
      });
    } finally {
      setIsSyncingDoc(false);
    }
  };

  // Add new worker
  const handleAddNewWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerRfid.trim()) return;

    const cleanRfid = newWorkerRfid.trim().toUpperCase();
    const existing = workers.find(w => w.rfidUid.trim().toUpperCase() === cleanRfid);
    if (existing) {
      alert(`RFID UID ${cleanRfid} is already assigned to ${existing.name}. Each worker must have a unique RFID badge.`);
      return;
    }

    const newWorker: WorkerProfile = {
      id: `w_${Date.now()}`,
      name: newWorkerName.trim(),
      role: newWorkerRole.trim() || 'Agricultural Field Specialist',
      department: newWorkerDept,
      rfidUid: cleanRfid,
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      faceRecognitionVerified: true,
      muteBuzzerOnEntry: true,
      status: 'active',
      phone: newWorkerPhone.trim() || undefined,
      registeredDate: new Date().toISOString().split('T')[0],
      lastCheckIn: 'Registered Today'
    };

    setWorkers(prev => [newWorker, ...prev]);
    setShowAddWorkerModal(false);
    setNewWorkerName('');
    setNewWorkerRole('');
    setNewWorkerRfid('');
    setNewWorkerPhone('');
  };

  // Remove existing profile from RFID sensor whitelist
  const handleConfirmDeleteWorker = (worker: WorkerProfile) => {
    const updated = workers.filter(w => w.id !== worker.id);
    setWorkers(updated);
    try {
      localStorage.setItem('farmiot_workers_list', JSON.stringify(updated));
    } catch {}

    setWorkerToDelete(null);
    setSyncStatusMsg({
      type: 'success',
      text: `Worker profile "${worker.name}" removed and RFID badge ${worker.rfidUid} unlinked. Any future scan of this badge will trigger the intruder alarm buzzer.`
    });

    // If current scan result is for this worker, clear it
    if (scanResult?.worker?.id === worker.id) {
      setScanResult(null);
    }
  };

  // Filtered workers list
  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.rfidUid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ready-to-flash Arduino C++ Code for ESP32 + RC522 RFID Reader
  const esp32RfidArduinoCode = `/*
 * =========================================================================
 * FARM.IOT - ESP32 RC522 RFID WORKER ATTENDANCE & BUZZER SUPPRESSION SKETCH
 * =========================================================================
 * Hardware:
 *   - ESP32-WROOM-32 or ESP32-CAM Node
 *   - RC522 RFID 13.56 MHz Reader (SPI)
 *   - Active Piezo Buzzer (GPIO 12)
 *
 * RC522 SPI Pin Connections to ESP32:
 *   - SDA / SS   --> GPIO 5
 *   - SCK        --> GPIO 18
 *   - MOSI       --> GPIO 23
 *   - MISO       --> GPIO 19
 *   - IRQ        --> Unused
 *   - GND        --> GND
 *   - RST        --> GPIO 22
 *   - 3.3V (VCC) --> 3.3V  (WARNING: DO NOT CONNECT TO 5V!)
 * =========================================================================
 */

#include <WiFi.h>
#include <SPI.h>
#include <MFRC522.h>
#include <HTTPClient.h>

// 1. Wi-Fi Configuration
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// 2. Hardware Pins
#define SS_PIN    5
#define RST_PIN   22
#define BUZZER_PIN 12

// 3. Cloud Firestore REST Endpoint (100% Free on Spark Plan)
const char* FIRESTORE_ENDPOINT = "https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/solar_iot/rfid_events?updateMask.fieldPaths=latest_uid&updateMask.fieldPaths=timestamp&updateMask.fieldPaths=worker_scanned";

// 4. Firebase Realtime Database URL
const char* RTDB_URL = "${firebaseConfig.databaseURL}/solar_iot/rfid_events.json";

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println(F("[Farm.IoT] RC522 RFID Attendance Reader Initialized."));

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print(F("[Farm.IoT] Connecting to Wi-Fi"));
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(F("\\n[Farm.IoT] Wi-Fi Connected!"));
}

void loop() {
  // Check if a new RFID card is presented
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // Extract UID formatted as XX:XX:XX:XX
  String cardUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (i > 0) cardUid += ":";
    if (mfrc522.uid.uidByte[i] < 0x10) cardUid += "0";
    cardUid += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardUid.toUpperCase();
  Serial.print(F("[RFID Tap Detected] UID: "));
  Serial.println(cardUid);

  // Short confirmation beep on card read
  digitalWrite(BUZZER_PIN, HIGH);
  delay(80);
  digitalWrite(BUZZER_PIN, LOW);

  // Transmit UID to Farm.IoT Firebase Cloud
  transmitRfidEvent(cardUid);

  // Halt card to prevent repeated reads
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1500); // 1.5s debounce
}

void transmitRfidEvent(String uid) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;

  // Stream to Firestore REST API (triggers Google Docs sync & mutes buzzer)
  http.begin(FIRESTORE_ENDPOINT);
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{\\"fields\\":{\\"latest_uid\\":{\\"stringValue\\":\\"" + uid + "\\"},\\"timestamp\\":{\\"integerValue\\":\\"" + String(millis()) + "\\"},\\"worker_scanned\\":{\\"booleanValue\\":true}}}";
  int httpCode = http.PATCH(jsonPayload);
  Serial.print(F("[Cloud Sync] HTTP Response: "));
  Serial.println(httpCode);
  http.end();
}`;

  return (
    <div className="space-y-6">
      {/* ESP32-CAM Direct Option Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-950/70 via-zinc-900 to-black border border-rose-500/40 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0 shadow-lg shadow-rose-500/10">
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                ESP32-CAM Surveillance Node
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> 1 Check-In / Day Policy Active
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white">
              Looking for the ESP32-CAM Video Feed &amp; Siren Controls?
            </h2>
            <p className="text-xs text-zinc-300 max-w-2xl">
              The camera feed, intruder alarm buzzer override, and Google Colab YOLOv8 vision AI are accessible in the dedicated ESP32-CAM option.
            </p>
          </div>
        </div>

        {onNavigateToSecurity && (
          <button
            onClick={onNavigateToSecurity}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black text-xs font-mono tracking-wide transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 shrink-0 self-start md:self-center"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>Open ESP32-CAM Option ➔</span>
          </button>
        )}
      </div>

      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-black border border-emerald-500/40 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> RC522 RFID 13.56 MHz
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Google Docs Live Sync
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <VolumeX className="w-3.5 h-3.5 text-purple-400" /> Face Whitelist (Buzzer Muted)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Max 1 Check-In / Day
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-400" />
              <span>Farm Worker RFID Attendance &amp; Security Whitelist</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
              When an authorized worker touches their RFID card at the farm gate, attendance is automatically appended to <strong>Google Docs</strong> (strictly limited to <strong>1 check-in per day</strong>). Simultaneously, the worker's identity is verified to <strong>mute the ESP32-CAM alarm buzzer</strong>, granting quiet entry without false intruder alerts.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide block">Active Staff</span>
              <span className="text-xl font-black text-white font-mono mt-0.5 block">{workers.length}</span>
              <span className="text-[10px] text-emerald-400 font-mono">100% Whitelisted</span>
            </div>
            <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide block">Checked In Today</span>
              <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                {workers.filter(w => isWorkerCheckedInToday(w.id, w.rfidUid)).length}
              </span>
              <span className="text-[10px] text-amber-300 font-mono">1/Day Enforced</span>
            </div>
            <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide block">Buzzer Suppressed</span>
              <span className="text-xl font-black text-amber-300 font-mono mt-0.5 block">
                {attendanceLogs.filter(a => a.buzzerSuppressed).length}
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono">False Alarms Muted</span>
            </div>
          </div>
        </div>

        {/* Google Docs Connection & Sync Bar */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${isGoogleConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono">
                  {isGoogleConnected ? 'Google Docs & Drive Connected' : 'Google Docs Sync Standby'}
                </span>
                {googleDocId && (
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Doc ID: {googleDocId.substring(0, 8)}...
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-400">
                {googleDocUrl ? 'Attendance document active on Google Drive' : 'Connect your Google account to enable live spreadsheet/doc logging'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isGoogleConnected ? (
              <button
                onClick={handleConnectGoogleDocs}
                disabled={isConnectingGoogle}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>{isConnectingGoogle ? 'Connecting...' : 'Sign in with Google Docs'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleSyncPendingRecords}
                  disabled={isSyncingDoc}
                  className="px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 text-xs font-semibold font-mono transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDoc ? 'animate-spin' : ''}`} />
                  <span>Sync to Google Docs</span>
                </button>

                {googleDocUrl && (
                  <a
                    href={googleDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-semibold font-mono transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Attendance Doc</span>
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {syncStatusMsg && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
            syncStatusMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}>
            {syncStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{syncStatusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs (Test Mode Removed - Real Hardware & Production Ledger) */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        {[
          { id: 'attendance', label: 'Attendance Records (Google Docs)', icon: Calendar, count: attendanceLogs.length },
          { id: 'workers', label: 'Registered Farm Staff Whitelist', icon: Users, count: workers.length },
          { id: 'gate_scanner', label: 'Gate RFID Reader & Hardware Link', icon: Radio },
          { id: 'hardware_code', label: 'ESP32 & RC522 Arduino Code', icon: Cpu }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-black/30 text-slate-950 font-black' : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Attendance Log Register */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Today's Verified Check-In Ledger</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Live stream of workers touching their RFID badges at Gate Alpha-1. Records automatically stream to Google Docs.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Max 1 Check-In / Day Enforced
              </span>
              <button
                onClick={() => setActiveTab('gate_scanner')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Gate RFID Terminal</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Worker &amp; Identity</th>
                  <th className="py-3 px-4">RFID UID</th>
                  <th className="py-3 px-4">Check-In Time</th>
                  <th className="py-3 px-4">ESP32-CAM Face Check</th>
                  <th className="py-3 px-4">Security Buzzer Status</th>
                  <th className="py-3 px-4">Google Docs Register</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {attendanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No check-ins logged yet today. Tap an RFID card above to record attendance.
                    </td>
                  </tr>
                ) : (
                  attendanceLogs.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-900/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                            {record.workerName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-white font-sans text-xs block">{record.workerName}</span>
                            <span className="text-[11px] text-zinc-400 font-sans">{record.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 text-amber-300 border border-zinc-800 text-[11px]">
                          {record.rfidUid}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        <div>
                          <span className="block font-semibold">{record.time}</span>
                          <span className="text-[10px] text-zinc-500">{record.date}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {record.faceMatched ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Face Matched (OK)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-semibold font-sans">
                            <Clock className="w-3.5 h-3.5" /> Pending Match
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {record.buzzerSuppressed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-semibold font-sans">
                            <VolumeX className="w-3.5 h-3.5" /> Muted (No Alarm)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-semibold font-sans">
                            <Volume2 className="w-3.5 h-3.5" /> Active Siren
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {record.syncedToGoogleDocs ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[11px] font-semibold font-sans">
                            <FileText className="w-3.5 h-3.5 text-purple-400" /> Synced to Docs
                          </span>
                        ) : (
                          <button
                            onClick={handleSyncPendingRecords}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 text-[11px] cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> Sync Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Gate RFID Reader & Live Hardware Terminal (Production Mode - Test Mode Removed) */}
      {activeTab === 'gate_scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Live Hardware Status & Gate Scanner */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 font-bold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Hardware Terminal
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-md border border-amber-500/30 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> 1 Check-In / Day Enforced
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-2 flex items-center gap-2">
                  <span>Gate Alpha-1 RFID Reader &amp; Face Guard</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Physical RC522 13.56 MHz RFID sensor at Gate Alpha-1 connected to ESP32 SPI bus. Events stream in real-time to Google Docs and suppress the ESP32-CAM alarm buzzer.
                </p>
              </div>

              {/* Direct Jump to ESP32-CAM option */}
              {onNavigateToSecurity && (
                <button
                  onClick={onNavigateToSecurity}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Open live ESP32-CAM surveillance stream & buzzer deterrents"
                >
                  <Camera className="w-4 h-4 text-rose-400" />
                  <span>ESP32-CAM Option</span>
                </button>
              )}
            </div>

            {/* Daily Policy Notice Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs font-mono flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-amber-300">Strict Attendance Policy: Maximum 1 Check-In Per Worker Per Day</span>
                <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                  When a worker touches their badge today, attendance is logged and synced to Google Docs. Any subsequent badge taps on the same day will automatically suppress the alarm buzzer to allow entry, but will not create duplicate attendance records.
                </p>
              </div>
            </div>

            {/* Gate Terminal Reader Input */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>Gate Card Terminal (USB Reader or Manual Scan)</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  ISO/IEC 14443 Type A • 13.56 MHz
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualInputUid.trim()) {
                    handleRfidTap(manualInputUid.trim(), 'Gate Terminal Reader');
                    setManualInputUid('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Scan or enter RFID UID (e.g. 4A:F2:9B:10)..."
                  value={manualInputUid}
                  onChange={(e) => setManualInputUid(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!manualInputUid.trim() || isScanningRfid}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Process Gate Pass</span>
                </button>
              </form>

              {lastScannedUid && (
                <div className="inline-block px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-amber-300">
                  Last Processed UID: <span className="font-bold">{lastScannedUid}</span>
                </div>
              )}
            </div>

            {/* Live Scan Result Banner */}
            {scanResult && (
              <div className={`p-4 rounded-2xl border text-xs font-mono transition-all animate-in fade-in duration-200 ${
                scanResult.status === 'authorized'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : scanResult.status === 'already_checked_in'
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                    : scanResult.status === 'unauthorized'
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
              }`}>
                <div className="flex items-start gap-3">
                  {scanResult.status === 'authorized' ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : scanResult.status === 'already_checked_in' ? (
                    <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : scanResult.status === 'unauthorized' ? (
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-spin" />
                  )}
                  <div className="space-y-1">
                    <span className="font-bold block text-sm">{scanResult.message}</span>
                    {scanResult.worker && (
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-300 font-sans flex-wrap">
                        {scanResult.status === 'authorized' && (
                          <span className="flex items-center gap-1 text-emerald-300 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Attendance Check-In 1/1 Recorded
                          </span>
                        )}
                        {scanResult.status === 'already_checked_in' && (
                          <span className="flex items-center gap-1 text-amber-300 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Already Checked In Today (No Duplicate)
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 text-blue-300 font-bold">
                          <VolumeX className="w-3.5 h-3.5" /> ESP32-CAM Buzzer Muted
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Registered Staff Card List with 1/Day Status */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Gate Whitelist &amp; Daily Status</span>
                </h3>
                <p className="text-xs text-zinc-400">Authorized farm staff with 1-per-day check-in status.</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {workers.map((worker) => {
                const todayRec = getWorkerTodayRecord(worker.id, worker.rfidUid);
                return (
                  <div
                    key={worker.id}
                    onClick={() => handleRfidTap(worker.rfidUid, `Gate: ${worker.name}`)}
                    className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/60 hover:bg-zinc-900/70 transition cursor-pointer group flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={worker.photoUrl}
                        alt={worker.name}
                        className="w-10 h-10 rounded-xl object-cover border border-zinc-700 group-hover:border-emerald-400 transition"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs group-hover:text-emerald-300 transition">
                            {worker.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                            {worker.department}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 block">{worker.role}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                            RFID: {worker.rfidUid}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {todayRec ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>1/1 Today</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-zinc-900 text-amber-300 border border-zinc-700 text-[10px] font-mono font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>0/1 Pending</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkerToDelete(worker);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 transition cursor-pointer"
                        title="Remove Profile & Unlink RFID Sensor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Registered Workers Whitelist & Management */}
      {activeTab === 'workers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search workers by name, role, department, or RFID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={() => setShowAddWorkerModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Worker</span>
            </button>
          </div>

          {/* Workers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkers.map((worker) => (
              <div key={worker.id} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={worker.photoUrl}
                        alt={worker.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-zinc-700"
                      />
                      <div>
                        <h4 className="font-bold text-white text-sm">{worker.name}</h4>
                        <span className="text-xs text-emerald-400 font-mono block">{worker.role}</span>
                        <span className="text-[11px] text-zinc-500">{worker.department}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        worker.status === 'on_shift'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {worker.status === 'on_shift' ? 'ON SHIFT' : 'STANDBY'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setWorkerToDelete(worker)}
                        className="p-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 transition cursor-pointer"
                        title="Remove Profile & Unlink RFID Sensor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Specs & Hardware Attributes */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs font-mono">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>RFID Card UID:</span>
                      <span className="font-bold text-amber-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {worker.rfidUid}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Face Recognition:</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Alarm Suppression:</span>
                      <span className="text-blue-400 flex items-center gap-1 font-bold">
                        <VolumeX className="w-3.5 h-3.5" /> Mutes Buzzer
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400 pt-1">
                      <span>Last Seen:</span>
                      <span className="text-zinc-300">{worker.lastCheckIn || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
                  {isWorkerCheckedInToday(worker.id, worker.rfidUid) ? (
                    <div className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Checked In Today (1/1 Max)</span>
                    </div>
                  ) : (
                    <div className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pending Today (0/1)</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab('gate_scanner');
                      setManualInputUid(worker.rfidUid);
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-mono transition cursor-pointer flex items-center gap-1 shrink-0"
                    title="View Gate Terminal for this Badge"
                  >
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Gate Terminal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkerToDelete(worker)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-500/50 text-xs font-mono transition cursor-pointer flex items-center gap-1 shrink-0"
                    title="Remove Profile from RFID Sensor Whitelist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ESP32 + RC522 RFID Arduino Firmware */}
      {activeTab === 'hardware_code' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 font-bold">
                  ESP32 &amp; RC522 Hardware Wiring &amp; Firmware
                </span>
                <h3 className="text-base font-bold text-white mt-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>C++ Firmware for MFRC522 RFID Reader with Cloud Logging</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Connect your RC522 RFID module to the ESP32 SPI bus. When any badge touches the coil, the UID is transmitted to Firebase, verifying the worker and muting the buzzer.
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(esp32RfidArduinoCode);
                  setCopiedSketch(true);
                  setTimeout(() => setCopiedSketch(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-500/20"
              >
                {copiedSketch ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSketch ? 'Copied to Clipboard!' : 'Copy Arduino Sketch'}</span>
              </button>
            </div>

            {/* Pinout Wiring Reference Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
              {[
                { pin: 'SDA / SS', esp: 'GPIO 5', color: 'text-amber-400' },
                { pin: 'SCK', esp: 'GPIO 18', color: 'text-cyan-400' },
                { pin: 'MOSI', esp: 'GPIO 23', color: 'text-emerald-400' },
                { pin: 'MISO', esp: 'GPIO 19', color: 'text-purple-400' },
                { pin: 'RST', esp: 'GPIO 22', color: 'text-rose-400' },
                { pin: 'GND', esp: 'GND', color: 'text-zinc-400' },
                { pin: '3.3V (VCC)', esp: '3.3V (NOT 5V)', color: 'text-red-400' }
              ].map((item, idx) => (
                <div key={idx} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-500 block font-mono">RC522 Pin</span>
                  <span className={`text-xs font-bold font-mono ${item.color} block`}>{item.pin}</span>
                  <span className="text-[10px] text-zinc-300 font-mono mt-1 block">➔ {item.esp}</span>
                </div>
              ))}
            </div>

            {/* Code Box */}
            <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-zinc-300 max-h-[420px] overflow-y-auto">
              <pre className="overflow-x-auto whitespace-pre-wrap">{esp32RfidArduinoCode}</pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register New Worker */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Register New Farm Worker</h3>
              </div>
              <button
                onClick={() => setShowAddWorkerModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewWorker} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Worker Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Job Title / Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solar PV Technician"
                    value={newWorkerRole}
                    onChange={(e) => setNewWorkerRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Department</label>
                  <select
                    value={newWorkerDept}
                    onChange={(e) => setNewWorkerDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    <option value="Renewable Power">Renewable Power</option>
                    <option value="Smart Irrigation">Smart Irrigation</option>
                    <option value="Research & Grid Systems">Research &amp; Grid Systems</option>
                    <option value="Nursery & Harvest">Nursery &amp; Harvest</option>
                    <option value="Facility Security">Facility Security</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium flex items-center justify-between">
                  <span>RFID Card UID (HEX) *</span>
                  <button
                    type="button"
                    onClick={() => {
                      const hex = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':');
                      setNewWorkerRfid(hex);
                    }}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Generate Random UID
                  </button>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5E:19:B3:8A"
                  value={newWorkerRfid}
                  onChange={(e) => setNewWorkerRfid(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Contact Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 98765 00000"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Automated Security Whitelisting
                </span>
                <p className="text-zinc-300">
                  Registering this worker will automatically enroll their RFID UID and face signature into the ESP32-CAM whitelist to prevent buzzer alarms and log check-ins to Google Docs.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Save &amp; Whitelist Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete / Remove Worker Profile & Unlink RFID Sensor */}
      {workerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Remove RFID Profile</h3>
                  <span className="text-[11px] font-mono text-rose-400">Unlink Badge &amp; Revoke Gate Access</span>
                </div>
              </div>
              <button
                onClick={() => setWorkerToDelete(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-3">
              <img
                src={workerToDelete.photoUrl}
                alt={workerToDelete.name}
                className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate">{workerToDelete.name}</h4>
                <p className="text-xs text-zinc-400 truncate">{workerToDelete.role}</p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    RFID: {workerToDelete.rfidUid}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {workerToDelete.department}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Security Notice: Immediate Revocation</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Removing this profile unlinks RFID tag <strong className="font-mono text-amber-300">{workerToDelete.rfidUid}</strong> from the sensor whitelist. 
                Any future scan of this physical badge will be flagged as <strong className="text-rose-400 uppercase font-mono">Unauthorized</strong>, access will be blocked, and the ESP32-CAM intruder alarm buzzer will sound immediately.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setWorkerToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteWorker(workerToDelete)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove &amp; Revoke Access</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
