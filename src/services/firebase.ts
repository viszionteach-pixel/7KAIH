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
  getDocsFromCache,
  getDocFromCache,
  writeBatch,
  onSnapshot,
  getDocFromServer,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence
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

const targetDatabaseId = metaEnv.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || "(default)";

export const db = (() => {
  try {
    return initializeFirestore(
      app,
      { experimentalAutoDetectLongPolling: true },
      targetDatabaseId
    );
  } catch {
    return getFirestore(app, targetDatabaseId);
  }
})();

export const isFirebaseConfigured = true;

// Enable Firestore IndexedDB Persistence for offline support
export async function enableFirestorePersistence(): Promise<boolean> {
  if (!db) return false;
  try {
    if (typeof enableMultiTabIndexedDbPersistence === 'function') {
      await enableMultiTabIndexedDbPersistence(db);
    } else if (typeof enableIndexedDbPersistence === 'function') {
      await enableIndexedDbPersistence(db);
    }
    console.log('[Firestore Persistence] IndexedDB persistence enabled successfully.');
    return true;
  } catch (err: any) {
    if (err?.code === 'failed-precondition') {
      console.info('[Firestore Persistence] Multiple tabs open; persistence active in primary tab');
    } else if (err?.code === 'unimplemented') {
      console.info('[Firestore Persistence] Current browser does not support IndexedDB persistence');
    } else {
      console.info('[Firestore Persistence Info]', err?.message || err);
    }
    return false;
  }
}

// Helper to test connection on boot
async function testConnection() {
  try {
    if (db) {
      await getDocFromServer(doc(db, 'kaih_school_config', 'main'));
      console.log('Successfully connected to Firebase Firestore!');
    }
  } catch (error) {
    console.info('Firebase connection ready or initializing:', error);
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

// Fetch helper with IndexedDB cache fallback on timeout or error
async function fetchDocsWithFallback(colRef: any) {
  // First check if IndexedDB cache already has documents for immediate response
  try {
    const cacheSnap = await getDocsFromCache(colRef);
    if (cacheSnap && !cacheSnap.empty) {
      // Background sync to keep cache fresh
      getDocs(colRef).catch(() => {});
      return cacheSnap;
    }
  } catch {}

  // If cache is empty, fetch from server with a generous 30s timeout (essential for 1,100+ documents on mobile 4G)
  try {
    return await withTimeout(getDocs(colRef), 30000);
  } catch (err) {
    // Secondary attempt from cache in case server timed out or went offline mid-request
    try {
      const cacheSnap = await getDocsFromCache(colRef);
      if (cacheSnap) return cacheSnap;
    } catch {}
    throw err;
  }
}

async function fetchDocWithFallback(docRef: any) {
  try {
    const cacheSnap = await getDocFromCache(docRef);
    if (cacheSnap && cacheSnap.exists()) {
      getDoc(docRef).catch(() => {});
      return cacheSnap;
    }
  } catch {}

  try {
    return await withTimeout(getDoc(docRef), 20000);
  } catch (err) {
    try {
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap && cacheSnap.exists()) return cacheSnap;
    } catch {}
    throw err;
  }
}

// Helper to chunk batch operations (max 100 operations per batch for fast mobile processing)
async function commitDocsInBatches<T>(
  items: T[],
  processItem: (batch: ReturnType<typeof writeBatch>, item: T) => void
): Promise<boolean> {
  if (!db) return false;
  if (items.length === 0) return true;
  try {
    const chunkSize = 100;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => processItem(batch, item));
      await withTimeout(batch.commit(), 30000);
    }
    return true;
  } catch (err) {
    console.info('[Firebase Chunked Batch Save Info]', err);
    return false;
  }
}

// ================= USERS =================
export async function firebaseSaveUsers(users: User[]): Promise<boolean> {
  if (!db) return false;
  if (users.length === 0) return true;
  return commitDocsInBatches(users, (batch, u) => {
    const userRef = doc(db, 'kaih_users', u.id);
    batch.set(userRef, { ...u, updatedAt: new Date().toISOString() }, { merge: true });
  });
}

export async function firebaseSyncAndCleanUsers(activeUsers: User[]): Promise<boolean> {
  if (!db) return false;
  try {
    const activeIds = new Set(activeUsers.map((u) => u.id));
    let existingDocs: any[] = [];
    try {
      const snapshot = await fetchDocsWithFallback(collection(db, 'kaih_users'));
      if (snapshot && snapshot.docs) {
        existingDocs = snapshot.docs;
      }
    } catch {
      // If fetching remote fails, proceed to save active users directly
    }
    
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
    console.info('[Firebase Sync and Clean Users Info]', err);
    return false;
  }
}

export async function firebaseDeleteUser(userId: string): Promise<boolean> {
  if (!db) return false;
  try {
    await withTimeout(deleteDoc(doc(db, 'kaih_users', userId)));
    return true;
  } catch (err) {
    console.info('[Firebase Delete User Info]', err);
    return false;
  }
}

export async function firebaseFetchUsers(): Promise<User[] | null> {
  if (!db) return null;
  try {
    const snapshot = await fetchDocsWithFallback(collection(db, 'kaih_users'));
    if (snapshot.empty) return null;
    const users: User[] = snapshot.docs.map((d) => {
      const data = d.data() as any;
      return (data.data ? data.data : data) as User;
    });
    return users;
  } catch (err) {
    console.info('[Firebase Fetch Users Info]', err);
    return null;
  }
}

// ================= LOGS =================
export async function firebaseSaveLogs(logs: KAIHEntry[]): Promise<boolean> {
  if (!db) return false;
  if (logs.length === 0) return true;
  return commitDocsInBatches(logs, (batch, log) => {
    const logRef = doc(db, 'kaih_logs', log.id);
    batch.set(logRef, { ...log, updatedAt: new Date().toISOString() }, { merge: true });
  });
}

export async function firebaseSyncAndCleanLogs(activeLogs: KAIHEntry[]): Promise<boolean> {
  if (!db) return false;
  try {
    const activeIds = new Set(activeLogs.map((l) => l.id));
    let existingDocs: any[] = [];
    try {
      const snapshot = await fetchDocsWithFallback(collection(db, 'kaih_logs'));
      if (snapshot && snapshot.docs) {
        existingDocs = snapshot.docs;
      }
    } catch {
      // If fetching remote fails, proceed to save active logs directly
    }

    if (existingDocs.length > 0) {
      const orphanedDocs = existingDocs.filter((d) => !activeIds.has(d.id));
      if (orphanedDocs.length > 0) {
        await commitDocsInBatches(orphanedDocs, (batch, d) => {
          batch.delete(d.ref);
        });
      }
    }
    return await firebaseSaveLogs(activeLogs);
  } catch (err) {
    console.info('[Firebase Sync and Clean Logs Info]', err);
    return false;
  }
}

export async function firebaseFetchLogs(): Promise<KAIHEntry[] | null> {
  if (!db) return null;
  try {
    const snapshot = await fetchDocsWithFallback(collection(db, 'kaih_logs'));
    if (snapshot.empty) return null;
    const logs: KAIHEntry[] = snapshot.docs.map((d) => {
      const data = d.data() as any;
      return (data.data ? data.data : data) as KAIHEntry;
    });
    return logs;
  } catch (err) {
    console.info('[Firebase Fetch Logs Info]', err);
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
    console.info('[Firebase Save School Config Info]', err);
    return false;
  }
}

export async function firebaseFetchSchoolConfig(): Promise<MonthlyReportConfig | null> {
  if (!db) return null;
  try {
    const docSnap = await fetchDocWithFallback(doc(db, 'kaih_school_config', 'main'));
    if (!docSnap.exists()) return null;
    const data = docSnap.data() as any;
    return data.config as MonthlyReportConfig;
  } catch (err) {
    console.info('[Firebase Fetch School Config Info]', err);
    return null;
  }
}

// ================= BK NOTES =================
export async function firebaseSaveBKNotes(notes: BKCounselingNote[]): Promise<boolean> {
  if (!db) return false;
  if (notes.length === 0) return true;
  return commitDocsInBatches(notes, (batch, note) => {
    const noteRef = doc(db, 'kaih_bk_notes', note.id);
    batch.set(noteRef, { ...note, updatedAt: new Date().toISOString() }, { merge: true });
  });
}

export async function firebaseFetchBKNotes(): Promise<BKCounselingNote[] | null> {
  if (!db) return null;
  try {
    const snapshot = await fetchDocsWithFallback(collection(db, 'kaih_bk_notes'));
    if (snapshot.empty) return null;
    const notes: BKCounselingNote[] = snapshot.docs.map((d) => d.data() as BKCounselingNote);
    return notes;
  } catch (err) {
    console.info('[Firebase Fetch BK Notes Info]', err);
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
    console.info('[Firebase Save Custom Password Info]', err);
    return false;
  }
}

export async function firebaseFetchCustomPasswords(): Promise<Record<string, string> | null> {
  if (!db) return null;
  try {
    const snapshot = await fetchDocsWithFallback(collection(db, 'kaih_passwords'));
    if (snapshot.empty) return null;
    const map: Record<string, string> = {};
    snapshot.docs.forEach((d) => {
      const data = d.data() as any;
      if (data && data.userId && data.password) {
        map[data.userId] = data.password;
      }
    });
    return map;
  } catch (err) {
    console.info('[Firebase Fetch Custom Passwords Info]', err);
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
        console.info('[Firebase Realtime Listener Info]', err?.message || err);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

// ================= DIAGNOSTICS SUITE =================
export interface FirestoreDiagnosticResult {
  timestamp: string;
  isAppInitialized: boolean;
  projectId: string;
  databaseId: string;
  dbInitialized: boolean;
  onlineStatus: boolean;
  collections: {
    name: string;
    accessible: boolean;
    docCount: number;
    latencyMs: number;
    fromCache: boolean;
    error?: string;
  }[];
  writeTest: {
    successful: boolean;
    latencyMs: number;
    error?: string;
  };
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
}

export async function runFirestoreDiagnostics(): Promise<FirestoreDiagnosticResult> {
  console.group('%c🔥 [Firestore Diagnostics Suite]', 'color: #f59e0b; font-weight: bold; font-size: 14px;');
  
  const projectId = firebaseConfig.projectId || 'Unknown';
  console.log(`%c[Firebase Config]`, 'color: #3b82f6; font-weight: bold;', {
    appName: app.name,
    projectId,
    databaseId: targetDatabaseId,
    authDomain: firebaseConfig.authDomain,
    apiKeyProvided: !!firebaseConfig.apiKey,
    online: navigator.onLine
  });

  const collectionsToTest = [
    'kaih_users',
    'kaih_logs',
    'kaih_school_config',
    'kaih_bk_notes',
    'kaih_passwords'
  ];

  const results: FirestoreDiagnosticResult['collections'] = [];

  for (const colName of collectionsToTest) {
    const colStart = Date.now();
    try {
      const colRef = collection(db, colName);
      const snap = await fetchDocsWithFallback(colRef);
      const latency = Date.now() - colStart;
      const fromCache = snap?.metadata?.fromCache ?? false;
      const docCount = snap?.size ?? 0;
      
      results.push({
        name: colName,
        accessible: true,
        docCount,
        latencyMs: latency,
        fromCache,
      });

      console.log(`%c✔ Collection '${colName}'`, 'color: #10b981;', {
        docCount,
        latencyMs: `${latency}ms`,
        source: fromCache ? 'IndexedDB Cache' : 'Cloud Firestore Server'
      });
    } catch (err: any) {
      const latency = Date.now() - colStart;
      results.push({
        name: colName,
        accessible: false,
        docCount: 0,
        latencyMs: latency,
        fromCache: false,
        error: err?.message || String(err)
      });
      console.warn(`%c❌ Collection '${colName}' failed`, 'color: #ef4444;', {
        latencyMs: `${latency}ms`,
        error: err?.message || err
      });
    }
  }

  // Write ping test
  let writeTestResult = { successful: false, latencyMs: 0, error: undefined as string | undefined };
  const writeStart = Date.now();
  try {
    const testDocRef = doc(db, '_diagnostics', 'ping');
    await withTimeout(setDoc(testDocRef, { ping: true, timestamp: new Date().toISOString() }), 5000);
    writeTestResult = {
      successful: true,
      latencyMs: Date.now() - writeStart,
      error: undefined
    };
    console.log(`%c✔ Diagnostic Write Ping Test`, 'color: #10b981;', `${writeTestResult.latencyMs}ms`);
  } catch (err: any) {
    writeTestResult = {
      successful: false,
      latencyMs: Date.now() - writeStart,
      error: err?.message || String(err)
    };
    console.info(`%c⚠️ Diagnostic Write Ping Test Info`, 'color: #f59e0b;', err?.message || err);
  }

  const accessibleCount = results.filter((r) => r.accessible).length;
  let overallStatus: FirestoreDiagnosticResult['overallStatus'] = 'HEALTHY';
  if (accessibleCount === 0) {
    overallStatus = 'DISCONNECTED';
  } else if (accessibleCount < results.length || !writeTestResult.successful) {
    overallStatus = 'DEGRADED';
  }

  console.table(
    results.map((r) => ({
      Collection: r.name,
      Status: r.accessible ? '✅ OK' : '❌ Failed',
      'Docs Count': r.docCount,
      'Latency (ms)': r.latencyMs,
      Source: r.fromCache ? 'Cache' : 'Server',
      Error: r.error || '-'
    }))
  );

  console.log(
    `%cOverall Firestore Status: ${overallStatus}`,
    `color: ${overallStatus === 'HEALTHY' ? '#10b981' : overallStatus === 'DEGRADED' ? '#f59e0b' : '#ef4444'}; font-weight: bold; font-size: 12px;`
  );
  console.groupEnd();

  const fullResult: FirestoreDiagnosticResult = {
    timestamp: new Date().toISOString(),
    isAppInitialized: !!app,
    projectId,
    databaseId: targetDatabaseId,
    dbInitialized: !!db,
    onlineStatus: navigator.onLine,
    collections: results,
    writeTest: writeTestResult,
    overallStatus
  };

  return fullResult;
}

// Bind to window for instant console execution
if (typeof window !== 'undefined') {
  (window as any).runFirestoreDiagnostics = runFirestoreDiagnostics;
}


