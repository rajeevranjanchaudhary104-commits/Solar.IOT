import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Suppress transient backend connection retry notices from logging to console.error
try {
  setLogLevel('silent');
} catch {
  // ignore if not supported in environment
}

// Use the provisioned project config
export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  // Database URL used for Firebase Realtime Database / REST access by ESP32 / ESP-01:
  databaseURL: `https://${firebaseConfigJson.projectId}-default-rtdb.firebaseio.com`,
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId || '(default)',
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore instance matching official skill requirement
export const db = firebaseConfigJson.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);


