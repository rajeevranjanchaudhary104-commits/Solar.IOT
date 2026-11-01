import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Built-in Whitelisted Admin & System Owners
 */
export const DEFAULT_OWNER_EMAILS: string[] = [
  'sushilnisha23112004@gmail.com',
  'rajeevranjanchaudhary104@gmail.com',
  'devapaliwal1234@gmail.com',
  'arjunparth0001@gmail.com'
];

export const PRIMARY_OWNER_EMAIL = 'rajeevranjanchaudhary104@gmail.com';
export const MENTOR_TEACHER_EMAIL = 'sushilnisha23112004@gmail.com';
export const MENTOR_TEACHER_NAME = 'Er. Sushil Kumar';
export const MENTOR_TEACHER_ROLE = 'Project Mentor & Faculty Teacher';

export const checkIsMentor = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === MENTOR_TEACHER_EMAIL.toLowerCase();
};

/**
 * Live, mutable list of all authorized owner emails.
 * Initialized with DEFAULT_OWNER_EMAILS and dynamically updated when co-owners are added in Firestore.
 */
export const OWNER_EMAILS: string[] = [...DEFAULT_OWNER_EMAILS];

// Real-time Firestore sync to keep OWNER_EMAILS in sync across all components
if (typeof window !== 'undefined') {
  try {
    onSnapshot(doc(db, 'solar_iot', 'admin_roles'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.coOwners)) {
          const validCoOwners = data.coOwners
            .map((e: string) => String(e).trim().toLowerCase())
            .filter((e: string) => e && e.includes('@'));
          
          const combined = Array.from(new Set([
            ...DEFAULT_OWNER_EMAILS.map((e) => e.trim().toLowerCase()),
            ...validCoOwners
          ]));

          // Mutate in-place so all imported references stay fresh
          OWNER_EMAILS.length = 0;
          OWNER_EMAILS.push(...combined);
        }
      }
    });
  } catch (err) {
    console.warn('admin_roles live sync setup notice:', err);
  }
}

/**
 * Checks whether an email has full administrative / owner permissions in the app.
 * Matches against built-in owner emails as well as any dynamic co-owners added via Firestore.
 */
export const checkIsOwner = (email?: string | null, dynamicCoOwners: string[] = []): boolean => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  
  if (DEFAULT_OWNER_EMAILS.some((e) => e.trim().toLowerCase() === cleanEmail)) return true;
  if (OWNER_EMAILS.some((e) => e.trim().toLowerCase() === cleanEmail)) return true;
  if (dynamicCoOwners.some((e) => e.trim().toLowerCase() === cleanEmail)) return true;

  return false;
};

/**
 * Loads dynamic co-owners list from Firestore doc 'solar_iot/admin_roles'
 */
export const fetchDynamicCoOwners = async (): Promise<string[]> => {
  try {
    const docRef = doc(db, 'solar_iot', 'admin_roles');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.coOwners)) {
        return data.coOwners.map((e: string) => String(e).trim().toLowerCase());
      }
    }
  } catch (err) {
    console.warn('Could not fetch dynamic co-owners:', err);
  }
  return [];
};

/**
 * Adds a new co-owner email to Firestore so they can change anything in the app
 */
export const addCoOwnerEmail = async (newEmail: string, currentList: string[] = []): Promise<string[]> => {
  const cleanEmail = newEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const updated = Array.from(new Set([
    ...currentList.map(e => e.trim().toLowerCase()), 
    cleanEmail
  ]));

  const docRef = doc(db, 'solar_iot', 'admin_roles');
  await setDoc(docRef, {
    coOwners: updated,
    lastUpdatedBy: PRIMARY_OWNER_EMAIL,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // Update in-place immediately for instant responsiveness
  if (!OWNER_EMAILS.includes(cleanEmail)) {
    OWNER_EMAILS.push(cleanEmail);
  }

  return updated;
};

/**
 * Removes a co-owner email from Firestore
 */
export const removeCoOwnerEmail = async (emailToRemove: string, currentList: string[] = []): Promise<string[]> => {
  const cleanEmail = emailToRemove.trim().toLowerCase();
  const updated = currentList.filter((e) => e.trim().toLowerCase() !== cleanEmail);

  const docRef = doc(db, 'solar_iot', 'admin_roles');
  await setDoc(docRef, {
    coOwners: updated,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // Update in-place
  const idx = OWNER_EMAILS.indexOf(cleanEmail);
  if (idx !== -1 && !DEFAULT_OWNER_EMAILS.includes(cleanEmail)) {
    OWNER_EMAILS.splice(idx, 1);
  }

  return updated;
};
