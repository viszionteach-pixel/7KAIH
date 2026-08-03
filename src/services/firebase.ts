import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';
import { User, KAIHEntry, MonthlyReportConfig, BKCounselingNote } from '../types';

// Suppress internal Firestore connection warnings in browser logs
try {
  setLogLevel('silent');
} catch {}

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || appletConfig.appId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || ""
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const databaseId = (appletConfig as any).firestoreDatabaseId || metaEnv.VITE_FIREBASE_DATABASE_ID;

export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, databaseId);
  } catch {
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
})();

export const isFirebaseConfigured = true;

// Helper to test connection on boot
async function testConnection() {
  try {
    if (db) {
      await getDocFromServer(doc(db, 'kaih_school_config', 'main'));
      console.log('Successfully connected to Firebase Firestore!');
    }
  } catch (error) {
    console.log('Firebase connection ready or initializing:', error);
  }
}
testConnection();

// Helper to prevent Firestore offline/network hangs
function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firebase operation timed out'));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Helper to chunk batch operations (max 400 operations per batch)
async function commitDocsInBatches<T>(
  items: T[],
  processItem: (batch: ReturnType<typeof writeBatch>, item: T) => void
): Promise<boolean> {
  if (!db || items.length === 0) return true;
  try {
    const chunkSize = 400;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => processItem(batch, item));
      await withTimeout(batch.commit());
    }
    return true;
  } catch (err) {
    console.warn('[Firebase Chunked Batch Save Warning]', err);
    return false;
  }
}

// ================= USERS =================
export async function firebaseSaveUsers(users: User[]): Promise<boolean> {
  if (!db || users.length === 0) return false;
  return commitDocsInBatches(users, (batch, u) => {
    const userRef = doc(db, 'kaih_users', u.id);
    batch.set(userRef, { ...u, updatedAt: new Date().toISOString() }, { merge: true });
  });
}

export async function firebaseSyncAndCleanUsers(activeUsers: User[]): Promise<boolean> {
  if (!db) return false;
  try {
    const activeIds = new Set(activeUsers.map((u) => u.id));
    const snapshot = await withTimeout(getDocs(collection(db, 'kaih_users')));
    const existingDocs = snapshot.docs;
    
    if (existingDocs.length > 0) {
      const activeStudents = activeUsers.filter((u) => u.role === 'siswa');
      const existingStudents = existingDocs.filter((d) => (d.data() as User).role === 'siswa');

      let orphanedDocs = existingDocs.filter((d) => !activeIds.has(d.id));
      if (activeStudents.length === 0 && existingStudents.length > 0) {
        orphanedDocs = existingDocs.filter((d) => (d.data() as User).role !== 'siswa' && !activeIds.has(d.id));
      }

      if (orphanedDocs.length > 0) {
        await commitDocsInBatches(orphanedDocs, (batch, d) => {
          batch.delete(d.ref);
        });
      }
    }
    return await firebaseSaveUsers(activeUsers);
  } catch (err) {
    console.warn('[Firebase Sync and Clean Users Warning]', err);
    return false;
  }
}

export async function firebaseDeleteUser(userId: string): Promise<boolean> {
  if (!db) return false;
  try {
    await withTimeout(deleteDoc(doc(db, 'kaih_users', userId)));
    return true;
  } catch (err) {
    console.warn('[Firebase Delete User Warning]', err);
    return false;
  }
}

export async function firebaseFetchUsers(): Promise<User[] | null> {
  if (!db) return null;
  try {
    const snapshot = await withTimeout(getDocs(collection(db, 'kaih_users')));
    if (snapshot.empty) return null;
    const users: User[] = snapshot.docs.map((d) => {
      const data = d.data();
      return (data.data ? data.data : data) as User;
    });
    return users;
  } catch (err) {
    console.warn('[Firebase Fetch Users Warning]', err);
    return null;
  }
}

// ================= LOGS =================
export async function firebaseSaveLogs(logs: KAIHEntry[]): Promise<boolean> {
  if (!db || logs.length === 0) return false;
  return commitDocsInBatches(logs, (batch, log) => {
    const logRef = doc(db, 'kaih_logs', log.id);
    batch.set(logRef, { ...log, updatedAt: new Date().toISOString() }, { merge: true });
  });
}

export async function firebaseSyncAndCleanLogs(activeLogs: KAIHEntry[]): Promise<boolean> {
  if (!db) return false;
  try {
    const activeIds = new Set(activeLogs.map((l) => l.id));
    const snapshot = await withTimeout(getDocs(collection(db, 'kaih_logs')));
    const orphanedDocs = snapshot.docs.filter((d) => !activeIds.has(d.id));

    if (orphanedDocs.length > 0) {
      await commitDocsInBatches(orphanedDocs, (batch, d) => {
        batch.delete(d.ref);
      });
    }
    return await firebaseSaveLogs(activeLogs);
  } catch (err) {
    console.warn('[Firebase Sync and Clean Logs Warning]', err);
    return false;
  }
}

export async function firebaseFetchLogs(): Promise<KAIHEntry[] | null> {
  if (!db) return null;
  try {
    const snapshot = await withTimeout(getDocs(collection(db, 'kaih_logs')));
    if (snapshot.empty) return null;
    const logs: KAIHEntry[] = snapshot.docs.map((d) => {
      const data = d.data();
      return (data.data ? data.data : data) as KAIHEntry;
    });
    return logs;
  } catch (err) {
    console.warn('[Firebase Fetch Logs Warning]', err);
    return null;
  }
}

// ================= SCHOOL CONFIG =================
export async function firebaseSaveSchoolConfig(config: MonthlyReportConfig): Promise<boolean> {
  if (!db) return false;
  try {
    await withTimeout(setDoc(doc(db, 'kaih_school_config', 'main'), { config, updatedAt: new Date().toISOString() }));
    return true;
  } catch (err) {
    console.warn('[Firebase Save School Config Warning]', err);
    return false;
  }
}

export async function firebaseFetchSchoolConfig(): Promise<MonthlyReportConfig | null> {
  if (!db) return null;
  try {
    const docSnap = await withTimeout(getDoc(doc(db, 'kaih_school_config', 'main')));
    if (!docSnap.exists()) return null;
    return docSnap.data().config as MonthlyReportConfig;
  } catch (err) {
    console.warn('[Firebase Fetch School Config Warning]', err);
    return null;
  }
}

// ================= BK NOTES =================
export async function firebaseSaveBKNotes(notes: BKCounselingNote[]): Promise<boolean> {
  if (!db || notes.length === 0) return false;
  return commitDocsInBatches(notes, (batch, note) => {
    const noteRef = doc(db, 'kaih_bk_notes', note.id);
    batch.set(noteRef, { ...note, updatedAt: new Date().toISOString() }, { merge: true });
  });
}

export async function firebaseFetchBKNotes(): Promise<BKCounselingNote[] | null> {
  if (!db) return null;
  try {
    const snapshot = await withTimeout(getDocs(collection(db, 'kaih_bk_notes')));
    if (snapshot.empty) return null;
    const notes: BKCounselingNote[] = snapshot.docs.map((d) => d.data() as BKCounselingNote);
    return notes;
  } catch (err) {
    console.warn('[Firebase Fetch BK Notes Warning]', err);
    return null;
  }
}

// ================= CUSTOM PASSWORDS =================
export async function firebaseSaveCustomPassword(userId: string, pass: string): Promise<boolean> {
  if (!db) return false;
  try {
    await withTimeout(setDoc(doc(db, 'kaih_passwords', userId), { password: pass, userId, updatedAt: new Date().toISOString() }));
    return true;
  } catch (err) {
    console.warn('[Firebase Save Custom Password Warning]', err);
    return false;
  }
}

export async function firebaseFetchCustomPasswords(): Promise<Record<string, string> | null> {
  if (!db) return null;
  try {
    const snapshot = await withTimeout(getDocs(collection(db, 'kaih_passwords')));
    if (snapshot.empty) return null;
    const map: Record<string, string> = {};
    snapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.userId && data.password) {
        map[data.userId] = data.password;
      }
    });
    return map;
  } catch (err) {
    console.warn('[Firebase Fetch Custom Passwords Warning]', err);
    return null;
  }
}

// ================= REALTIME SUBSCRIPTION =================
export function subscribeToFirebaseRealtime(onDataChange: () => void): () => void {
  if (!db) return () => {};
  try {
    const unsub = onSnapshot(
      collection(db, 'kaih_logs'),
      (snapshot) => {
        // Skip firing onDataChange if the snapshot originated from local pending writes
        if (snapshot.metadata.hasPendingWrites) return;
        onDataChange();
      },
      (err) => {
        console.warn('[Firebase Realtime Listener Warning]', err?.message || err);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}
