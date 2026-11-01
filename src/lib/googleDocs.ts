import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { app } from './firebase';
import { AttendanceRecord, WorkerProfile } from '../types/solar';

export const auth = getAuth(app);

// Workspace OAuth Scopes configured for Google Docs & Google Drive
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));

// In-memory token caching (NOT in localStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Local storage key for storing the Google Doc ID
const GOOGLE_DOC_ID_KEY = 'farmiot_worker_attendance_doc_id';
const GOOGLE_DOC_URL_KEY = 'farmiot_worker_attendance_doc_url';

export function getSavedGoogleDocId(): string | null {
  try {
    return localStorage.getItem(GOOGLE_DOC_ID_KEY);
  } catch {
    return null;
  }
}

export function getSavedGoogleDocUrl(): string | null {
  try {
    return localStorage.getItem(GOOGLE_DOC_URL_KEY);
  } catch {
    return null;
  }
}

export function saveGoogleDocDetails(docId: string, docUrl: string) {
  try {
    localStorage.setItem(GOOGLE_DOC_ID_KEY, docId);
    localStorage.setItem(GOOGLE_DOC_URL_KEY, docUrl);
  } catch (err) {
    console.warn('Could not save Google Doc ID to localStorage:', err);
  }
}

// Initialize Auth Listener to manage memory cache
export const initGoogleDocsAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google with Google Docs & Drive scopes
export const signInWithGoogleDocs = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Docs OAuth access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[GoogleDocs] Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const hasGoogleDocsToken = (): boolean => {
  return Boolean(cachedAccessToken);
};

export const signOutGoogleDocs = async () => {
  cachedAccessToken = null;
  await auth.signOut();
};

/**
 * Creates a new Google Doc for Farm.IoT Worker Attendance
 */
export async function createAttendanceGoogleDoc(token: string): Promise<{ documentId: string; url: string }> {
  const title = `Farm.IoT - Worker RFID Attendance Register (${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;
  
  const response = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create Google Doc (HTTP ${response.status})`);
  }

  const docData = await response.json();
  const documentId = docData.documentId;
  const url = `https://docs.google.com/document/d/${documentId}/edit`;

  // Write initial header formatting to document
  const headerContent = 
    `FARM.IOT SMART MICROGRID - WORKER ATTENDANCE REGISTER\n` +
    `Automated RFID Tap & ESP32-CAM Face Verification System\n` +
    `Station ID: Farm.IoT Main Agro-Solar Facility | Gate: Alpha-1\n` +
    `Document Created: ${new Date().toLocaleString()}\n` +
    `========================================================================================\n` +
    `DATE & TIME          | WORKER NAME           | ROLE              | RFID UID    | FACE VERIFY | BUZZER STATUS\n` +
    `--------------------+-----------------------+-------------------+-------------+-------------+--------------\n`;

  await appendTextToGoogleDoc(token, documentId, headerContent);
  saveGoogleDocDetails(documentId, url);
  return { documentId, url };
}

/**
 * Appends plain text to the end of a Google Doc
 */
export async function appendTextToGoogleDoc(token: string, documentId: string, text: string): Promise<boolean> {
  const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            endOfSegmentLocation: {},
            text,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to append to Google Doc (HTTP ${response.status})`);
  }

  return true;
}

/**
 * Appends an attendance log row to Google Docs
 */
export async function logAttendanceToGoogleDoc(
  token: string,
  record: AttendanceRecord
): Promise<{ success: boolean; url: string; documentId: string }> {
  let docId = getSavedGoogleDocId();
  let docUrl = getSavedGoogleDocUrl();

  // If no Google Doc exists yet, create one
  if (!docId) {
    const newDoc = await createAttendanceGoogleDoc(token);
    docId = newDoc.documentId;
    docUrl = newDoc.url;
  }

  const timeStr = `${record.date} ${record.time}`.padEnd(20, ' ');
  const nameStr = record.workerName.padEnd(23, ' ');
  const roleStr = record.role.padEnd(19, ' ');
  const rfidStr = record.rfidUid.padEnd(13, ' ');
  const faceStr = (record.faceMatched ? 'VERIFIED' : 'PENDING').padEnd(13, ' ');
  const buzzerStr = record.buzzerSuppressed ? 'MUTED (OK)' : 'ACTIVE ALARM';

  const row = `${timeStr}| ${nameStr}| ${roleStr}| ${rfidStr}| ${faceStr}| ${buzzerStr}\n`;

  try {
    await appendTextToGoogleDoc(token, docId, row);
    return { success: true, url: docUrl || `https://docs.google.com/document/d/${docId}/edit`, documentId: docId };
  } catch (err: any) {
    // If the doc was deleted on Drive, create a new one and retry once
    if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
      const newDoc = await createAttendanceGoogleDoc(token);
      await appendTextToGoogleDoc(token, newDoc.documentId, row);
      return { success: true, url: newDoc.url, documentId: newDoc.documentId };
    }
    throw err;
  }
}
