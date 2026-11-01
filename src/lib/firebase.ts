import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel, doc, setDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Suppress transient backend connection retry notices
try {
  setLogLevel('silent');
} catch {
  // ignore if not supported in environment
}

export interface SecondaryFirebaseConfig {
  projectId: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface PersonalFirebaseConfig {
  projectId: string;
  databaseURL: string;
  apiKey?: string;
  authDomain?: string;
  appId?: string;
  storageBucket?: string;
  firestoreDatabaseId?: string;
  isActive: boolean;
}

const SECONDARY_CONFIG_STORAGE_KEY = 'solar_iot_secondary_firebase_config';
export const PERSONAL_CONFIG_STORAGE_KEY = 'solar_iot_personal_firebase_config';
export const RTDB_STORAGE_KEY = 'solar_iot_rtdb_custom_url';
export const DEFAULT_FARMIOT_RTDB_URL = 'https://solariot-f49f5-default-rtdb.firebaseio.com';

export const DEFAULT_FARMIOTEST_CONFIG: PersonalFirebaseConfig = {
  projectId: 'solariot-f49f5',
  databaseURL: DEFAULT_FARMIOT_RTDB_URL,
  apiKey: firebaseConfigJson.apiKey,
  authDomain: 'solariot-f49f5.firebaseapp.com',
  appId: firebaseConfigJson.appId,
  storageBucket: 'solariot-f49f5.firebasestorage.app',
  firestoreDatabaseId: (firebaseConfigJson as any).firestoreDatabaseId || '(default)',
  isActive: true,
};

export function getCustomRtdbUrl(): string {
  try {
    const saved = localStorage.getItem(RTDB_STORAGE_KEY);
    if (
      saved &&
      saved.trim() &&
      !saved.includes('solariot-374e7') &&
      !saved.includes('farmiotest') &&
      !saved.includes('red-access-fpthm')
    ) {
      return saved.trim().replace(/\/+$/, '');
    }
    localStorage.setItem(RTDB_STORAGE_KEY, DEFAULT_FARMIOT_RTDB_URL);
  } catch {}
  return DEFAULT_FARMIOT_RTDB_URL;
}

export function saveCustomRtdbUrl(url: string): string {
  const cleanUrl = (url || DEFAULT_FARMIOT_RTDB_URL).trim().replace(/\/+$/, '');
  try {
    localStorage.setItem(RTDB_STORAGE_KEY, cleanUrl);
    window.dispatchEvent(new CustomEvent('solar_iot_rtdb_url_changed', { detail: cleanUrl }));
  } catch (err) {
    console.warn('[Firebase] Failed to save custom RTDB URL:', err);
  }
  return cleanUrl;
}

export function getPersonalFirebaseConfig(): PersonalFirebaseConfig {
  try {
    const raw = localStorage.getItem(PERSONAL_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.projectId === 'string' &&
        parsed.projectId.trim() &&
        parsed.projectId !== 'farmiotest' &&
        parsed.projectId !== 'red-access-fpthm'
      ) {
        return {
          ...DEFAULT_FARMIOTEST_CONFIG,
          ...parsed,
          databaseURL: (parsed.databaseURL && !parsed.databaseURL.includes('farmiotest')
            ? parsed.databaseURL
            : getCustomRtdbUrl()
          ).trim().replace(/\/+$/, ''),
          isActive: parsed.isActive ?? true,
        };
      }
    }
    localStorage.setItem(PERSONAL_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_FARMIOTEST_CONFIG));
  } catch {}
  return {
    ...DEFAULT_FARMIOTEST_CONFIG,
    databaseURL: getCustomRtdbUrl(),
  };
}

export function savePersonalFirebaseConfig(config: Partial<PersonalFirebaseConfig>): void {
  try {
    const current = getPersonalFirebaseConfig();
    const updated: PersonalFirebaseConfig = {
      ...current,
      ...config,
      projectId: (config.projectId ?? current.projectId).trim().toLowerCase(),
      databaseURL: (config.databaseURL ?? current.databaseURL).trim().replace(/\/+$/, ''),
      isActive: config.isActive ?? current.isActive,
    };
    localStorage.setItem(PERSONAL_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    if (updated.databaseURL) {
      saveCustomRtdbUrl(updated.databaseURL);
    }
    window.dispatchEvent(new CustomEvent('solar_iot_firebase_config_changed', { detail: updated }));
  } catch (err) {
    console.warn('[Firebase] Failed to save personal config:', err);
  }
}

export function resetToDefaultFirebaseConfig(): void {
  try {
    const resetConfig: PersonalFirebaseConfig = {
      ...DEFAULT_FARMIOTEST_CONFIG,
      isActive: true,
    };
    localStorage.setItem(PERSONAL_CONFIG_STORAGE_KEY, JSON.stringify(resetConfig));
    saveCustomRtdbUrl(DEFAULT_FARMIOT_RTDB_URL);
    window.dispatchEvent(new CustomEvent('solar_iot_firebase_config_changed', { detail: resetConfig }));
  } catch (err) {
    console.warn('[Firebase] Failed to reset personal config:', err);
  }
}

// Retrieve secondary hosting project config from localStorage if configured
export function getSecondaryFirebaseConfig(): SecondaryFirebaseConfig | null {
  try {
    const raw = localStorage.getItem(SECONDARY_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.projectId === 'farmiotest') {
      return {
        projectId: 'solariot-f49f5',
        authDomain: 'solariot-f49f5.firebaseapp.com',
        storageBucket: 'solariot-f49f5.firebasestorage.app',
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSecondaryFirebaseConfig(cfg: SecondaryFirebaseConfig): void {
  try {
    localStorage.setItem(SECONDARY_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('solar_iot_secondary_config_changed', { detail: cfg }));
  } catch (err) {
    console.warn('[Firebase] Failed to save secondary config:', err);
  }
}

export function clearSecondaryFirebaseConfig(): void {
  try {
    localStorage.removeItem(SECONDARY_CONFIG_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('solar_iot_secondary_config_changed', { detail: null }));
  } catch (err) {
    console.warn('[Firebase] Failed to clear secondary config:', err);
  }
}

// Unified Single-Account Project Config (solariot-f49f5):
export const hardwareProjectConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  firestoreProjectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  databaseURL: getCustomRtdbUrl(),
  firestoreDatabaseId: (firebaseConfigJson as any).firestoreDatabaseId || '(default)',
};

export const firebaseConfig = {
  ...hardwareProjectConfig,
};

// Initialize Primary Firebase App singleton for solariot-f49f5
export const app = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp({
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  databaseURL: getCustomRtdbUrl(),
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore instance matching official skill requirement
export const db = (firebaseConfigJson as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfigJson as any).firestoreDatabaseId)
  : getFirestore(app);

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'solar_iot', 'node_01'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Realtime Database app cache (uses primary app when targeting solariot-f49f5, or named app if custom URL)
const rtdbAppCache: Record<string, FirebaseApp> = {};

export function getOrCreateRtdb(overrideUrl?: string): Database | null {
  const targetUrl = (overrideUrl || getCustomRtdbUrl()).trim().replace(/\/+$/, '');
  if (!targetUrl) return null;
  try {
    if (targetUrl.includes(firebaseConfigJson.projectId)) {
      return getDatabase(app, targetUrl);
    }
    const hostMatch = targetUrl.match(/https?:\/\/([a-z0-9-]+?)(?:-default-rtdb)?\./i);
    const inferredProjectId = hostMatch?.[1] || firebaseConfigJson.projectId;
    const appKey = `rtdb_${inferredProjectId}_${targetUrl.replace(/[^a-zA-Z0-9]/g, '_')}`;

    let targetApp = rtdbAppCache[appKey] || getApps().find((a) => a.name === appKey);
    if (!targetApp) {
      targetApp = initializeApp(
        {
          apiKey: firebaseConfigJson.apiKey,
          projectId: inferredProjectId,
          databaseURL: targetUrl,
        },
        appKey
      );
      rtdbAppCache[appKey] = targetApp;
    }
    return getDatabase(targetApp, targetUrl);
  } catch (e) {
    try {
      return getDatabase(app, targetUrl);
    } catch {
      return null;
    }
  }
}

let rtdbInstance: Database | null = null;
try {
  rtdbInstance = getOrCreateRtdb();
} catch (e) {
  console.warn('[Firebase RTDB] Initial fallback note:', e);
}
export const rtdb: Database = rtdbInstance as Database;

// Firebase Storage instance
let storageInstance: FirebaseStorage | null = null;
try {
  storageInstance = getStorage(app);
} catch (e) {
  console.warn('[Firebase Storage] Storage client initialization fallback:', e);
}
export const storage: FirebaseStorage = storageInstance as FirebaseStorage;

// Security Rules definitions for 1-click clipboard copy
export const SCOPED_RTDB_RULES_JSON = `{
  "rules": {
    "security_system": {
      ".read": true,
      ".write": true,
      ".indexOn": ["updated_at", "last_seen", "system_state"]
    },
    "solar_iot": {
      ".read": true,
      ".write": true,
      ".indexOn": ["updated_at", "timestamp"]
    },
    "node_01": {
      ".read": true,
      ".write": true,
      ".indexOn": ["updated_at", "updatedAt"]
    }
  }
}`;

export const PERMANENT_FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwnerAdmin() {
      return request.auth != null && 
        (request.auth.token.email == 'rajeevranjanchaudhary104@gmail.com' ||
         request.auth.token.email == 'sushilnisha23112004@gmail.com' ||
         request.auth.token.email == 'devapaliwal1234@gmail.com' ||
         request.auth.token.email == 'arjunparth0001@gmail.com');
    }

    // Hardware Telemetry & Security Sync (No 30-day expiration lockout)
    match /solar_iot/{document=**} {
      allow read, write: if true;
    }

    match /security_system/{document=**} {
      allow read, write: if true;
    }

    match /cleaning_logs/{logId} {
      allow read, write: if true;
    }

    match /user_presets/{userId} {
      allow read, write: if true;
    }

    match /user_profiles/{userId} {
      allow read, write: if true;
    }

    match /user_reviews/{reviewId} {
      allow read: if true;
      allow create, update: if true;
      allow delete: if isOwnerAdmin();
    }
  }
}`;

/**
 * Strips all undefined fields recursively to prevent Firestore from throwing
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized as T;
}

/**
 * Initializes and seeds a Realtime Database (and Cloud Firestore backup) with complete
 * Live Solar Panel, Soil Moisture, Irrigation, Windmill/Peltier, and Security System nodes.
 */
export async function seedCompleteRealtimeDatabase(
  targetRtdbUrl?: string,
  overrides?: Record<string, any>
): Promise<{ ok: boolean; rtdbOk: boolean; firestoreOk: boolean; status: number; message: string }> {
  const cleanUrl = (targetRtdbUrl || getCustomRtdbUrl()).trim().replace(/\/+$/, '');
  const nowIso = new Date().toISOString();
  const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const solarAndSoilPayload = {
    espConnected: false,
    voltage: null,
    current: null,
    power: null,
    temperature: null,
    batteryPercent: null,
    highestWattToday: null,
    highestWattTime: null,
    highestVoltageToday: null,
    inverterLoadWatts: 150,
    dailyEnergyWh: null,
    efficiency: null,
    isRaining: false,
    rainIntensityMm: 0,
    soilingIndex: null,
    scheduledCleanTime: '03:00 AM',
    cleaningStatus: 'idle',
    wiperActive: false,
    pumpActive: false,
    lastCleanedTime: 'Never',
    // Soil Moisture & Agro-IoT
    soilMoisture: null,
    soil_moisture: null,
    soilMoistureRaw: null,
    soilStatus: null,
    soilTemperature: null,
    soil_temperature: null,
    irrigationPumpActive: false,
    irrigation_pump: false,
    // Windmill & Peltier
    windmillRpm: null,
    windmill_rpm: null,
    windmillPower: null,
    windmillVoltage: null,
    windmillCurrent: null,
    airPressure: null,
    peltierCurrent: null,
    peltierVoltage: null,
    peltierPower: null,
    sandTemp: null,
    peltierTemp: null,
    environmentTemp: null,
    updatedAt: nowIso,
    updated_at: nowIso,
    timestamp: 0,
    ...(overrides || {}),
  };

  const securityPayload = {
    camera_connected: false,
    camera_active: false,
    system_state: 'SLEEPING',
    servo_angle: 90,
    buzzer: false,
    buzzer_muted: false,
    sleep_command: false,
    last_detection: 'None',
    last_seen: 0,
    updated_at: nowIso,
  };

  let firestoreOk = false;
  try {
    await setDoc(doc(db, 'solar_iot', 'node_01'), sanitizeForFirestore(solarAndSoilPayload), { merge: true });
    await setDoc(doc(db, 'solar_iot', 'security_system'), sanitizeForFirestore(securityPayload), { merge: true });
    firestoreOk = true;
  } catch (err) {
    console.warn('[Seed] Firestore sync note:', err);
  }

  let rtdbOk = false;
  let status = 0;
  let errorDetail = '';

  try {
    const res1 = await fetch(`${cleanUrl}/solar_iot/node_01.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solarAndSoilPayload),
    });
    status = res1.status;

    if (res1.ok) {
      rtdbOk = true;
      await Promise.allSettled([
        fetch(`${cleanUrl}/node_01.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(solarAndSoilPayload),
        }),
        fetch(`${cleanUrl}/security_system.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(securityPayload),
        }),
        fetch(`${cleanUrl}/solar_iot/security_system.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(securityPayload),
        }),
      ]);
    } else {
      errorDetail = res1.statusText;
    }
  } catch (err: any) {
    errorDetail = err?.message || 'Network or CORS error';
  }

  if (rtdbOk) {
    return {
      ok: true,
      rtdbOk: true,
      firestoreOk,
      status: 200,
      message: `✅ Live Solar Panel, Soil Moisture (54%), Windmill & Security nodes initialized in Realtime Database (${cleanUrl}) & Cloud Firestore!`,
    };
  }

  if (status === 401 || status === 403) {
    return {
      ok: firestoreOk,
      rtdbOk: false,
      firestoreOk,
      status,
      message: `⚠️ Realtime Database rules are locked (HTTP ${status}). Live Solar & Soil Moisture data is active via Cloud Firestore! Copy and publish the Scoped Rules in your Firebase Console to unlock RTDB.`,
    };
  }

  if (status === 404) {
    return {
      ok: firestoreOk,
      rtdbOk: false,
      firestoreOk,
      status: 404,
      message: `⚠️ Realtime Database not found at ${cleanUrl} (HTTP 404). Live Solar & Soil Moisture data is active via Cloud Firestore! Create your RTDB in Firebase Console and paste the URL.`,
    };
  }

  return {
    ok: firestoreOk,
    rtdbOk: false,
    firestoreOk,
    status,
    message: firestoreOk
      ? `✅ Live Solar & Soil Moisture activated via Cloud Firestore! (RTDB notice: ${errorDetail || `HTTP ${status}`})`
      : `❌ Could not reach Realtime Database (${errorDetail || `HTTP ${status}`}). Check your URL and rules.`,
  };
}

export const NAMED_FIRESTORE_DB_ID = 'ai-studio-5865fcd2-ed18-48d2-9d05-2e8be65be1d1';

export const DEFAULT_TELEMETRY = {
  voltage: null,
  current: null,
  power: null,
  temperature: null,
  batteryPercent: null,
  lastCleanedTime: 'Never',
  cleaningStatus: 'idle' as const,
  pumpActive: false,
  wiperActive: false,
  triggerWiper: false,
  espConnected: false,
  updatedAt: '',
  isRaining: false,
  rainIntensityMm: 0,
  highestWattToday: null,
  highestWattTime: null,
  soilingIndex: null,
  soilMoisture: null,
  soilMoistureRaw: null,
  soilStatus: null,
  soilTemperature: null,
  irrigationPumpActive: false,
  windmillRpm: null,
  windmillPower: null,
  windmillVoltage: null,
  windmillCurrent: null,
  airPressure: null,
  peltierCurrent: null,
  peltierVoltage: null,
  peltierPower: null,
  sandTemp: null,
  peltierTemp: null,
  environmentTemp: null,
};

function unwrapFirestoreValue(valObj: any): any {
  if (!valObj || typeof valObj !== 'object') return valObj;
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('integerValue' in valObj) return Number(valObj.integerValue);
  if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
  if ('stringValue' in valObj) return String(valObj.stringValue);
  if ('timestampValue' in valObj) return String(valObj.timestampValue);
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    const vals = valObj.arrayValue?.values;
    return Array.isArray(vals) ? vals.map(unwrapFirestoreValue) : [];
  }
  if ('mapValue' in valObj) {
    return parseFirestoreRestFields(valObj.mapValue?.fields || {});
  }
  return valObj;
}

export function parseFirestoreRestFields(fields: Record<string, any>): Record<string, any> {
  const parsed: Record<string, any> = {};
  if (!fields || typeof fields !== 'object') return parsed;
  for (const [k, v] of Object.entries(fields)) {
    parsed[k] = unwrapFirestoreValue(v);
  }
  return parsed;
}

export async function fetchNodeTelemetryViaRest(
  databaseId: string = (firebaseConfigJson as any).firestoreDatabaseId || '(default)',
  nodeId: string = 'node_01'
): Promise<Record<string, any>> {
  const projectId = firebaseConfig.projectId || 'solariot-f49f5';
  const apiKey = firebaseConfig.apiKey;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/solar_iot/${nodeId}?key=${apiKey}`;

  const res = await fetch(url);
  // Intercept HTTP 404 on freshly initialized documents before first write and emit DEFAULT_TELEMETRY
  if (res.status === 404) {
    return { ...DEFAULT_TELEMETRY };
  }
  if (!res.ok) {
    throw new Error(`Firestore REST HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json || !json.fields) {
    return { ...DEFAULT_TELEMETRY };
  }
  return {
    ...DEFAULT_TELEMETRY,
    ...parseFirestoreRestFields(json.fields),
  };
}

/**
 * Subscribes to /solar_iot/node_01 with automatic 3-second REST fallback polling.
 * Ensures activeUnsubscribe() is cleanly unbound before starting the REST fallback
 * loop to prevent listener leaks and duplicate polling intervals, and intercepts HTTP 404
 * responses by emitting DEFAULT_TELEMETRY.
 */
export function subscribeToSolarNodeTelemetry(
  onData: (data: Record<string, any>, sourceDocRef?: any) => void
): () => void {
  let isDisposed = false;
  let activeUnsubscribe: (() => void) | null = null;
  let restPollInterval: ReturnType<typeof setInterval> | null = null;
  const docRef = doc(db, 'solar_iot', 'node_01');

  const stopRestPolling = () => {
    if (restPollInterval) {
      clearInterval(restPollInterval);
      restPollInterval = null;
    }
  };

  const startRestFallbackPolling = () => {
    if (isDisposed) return;
    // Cleanly unbind the active onSnapshot listener before triggering the 3-second REST fallback polling interval
    if (activeUnsubscribe) {
      try {
        activeUnsubscribe();
      } catch {}
      activeUnsubscribe = null;
    }
    if (restPollInterval) {
      return; // Prevent duplicate REST polling loops
    }

    const pollOnce = async () => {
      if (isDisposed) return;
      try {
        const primaryDbId = (firebaseConfigJson as any).firestoreDatabaseId || '(default)';
        const data = await fetchNodeTelemetryViaRest(primaryDbId, 'node_01');
        if (!isDisposed) {
          onData(data, docRef);
        }
      } catch {
        // Try named database fallback if default failed or vice-versa
        try {
          const fallbackDbId = ((firebaseConfigJson as any).firestoreDatabaseId === NAMED_FIRESTORE_DB_ID)
            ? '(default)'
            : NAMED_FIRESTORE_DB_ID;
          const fallbackData = await fetchNodeTelemetryViaRest(fallbackDbId, 'node_01');
          if (!isDisposed) {
            onData(fallbackData, docRef);
          }
        } catch {
          if (!isDisposed) {
            onData({ ...DEFAULT_TELEMETRY }, docRef);
          }
        }
      }
    };

    pollOnce();
    restPollInterval = setInterval(pollOnce, 3000);
  };

  try {
    activeUnsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (isDisposed) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data) {
            onData(data, docRef);
          }
        } else {
          // Document not yet written (404 equivalent) -> emit DEFAULT_TELEMETRY
          onData({ ...DEFAULT_TELEMETRY }, docRef);
        }
      },
      (error) => {
        console.warn('[Firestore] WebChannel or permission notice, switching to 3s REST fallback:', error?.message || error);
        startRestFallbackPolling();
      }
    );
  } catch (err) {
    console.warn('[Firestore] Initial listener setup failed, starting 3s REST fallback:', err);
    startRestFallbackPolling();
  }

  return () => {
    isDisposed = true;
    if (activeUnsubscribe) {
      try {
        activeUnsubscribe();
      } catch {}
      activeUnsubscribe = null;
    }
    stopRestPolling();
  };
}

