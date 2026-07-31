import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, KAIHEntry, BKCounselingNote, MonthlyReportConfig } from '../types';
import { INITIAL_ADMINS, INITIAL_GURU_BK, INITIAL_WALI_KELAS, INITIAL_STUDENTS, INITIAL_KAIH_LOGS, INITIAL_SCHOOL_CONFIG } from '../data/initialData';

// Initialize Firebase App & Firestore
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, dbId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isUnavailable =
    errMsg.includes('unavailable') ||
    errMsg.includes('offline') ||
    errMsg.includes('10 seconds') ||
    errMsg.includes('Could not reach Cloud Firestore backend') ||
    (error as { code?: string })?.code === 'unavailable';
  
  if (isUnavailable) {
    console.warn(`[Firebase Firestore] Operating in cached offline/reconnecting mode for ${operationType} on ${path}:`, errMsg);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

function cleanForFirestore<T>(data: T): Record<string, any> {
  return JSON.parse(JSON.stringify(data));
}

// COLLECTIONS
const USERS_COL = 'users';
const LOGS_COL = 'kaih_logs';
const CONFIG_COL = 'school_config';
const PASSWORDS_COL = 'passwords';

// 1. REALTIME SYNC USERS
export function subscribeToUsers(callback: (users: User[]) => void) {
  const colRef = collection(db, USERS_COL);
  
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial users if Firestore collection is empty
        await seedInitialUsers();
        return;
      }
      const usersList: User[] = [];
      snapshot.forEach((docSnap) => {
        usersList.push(docSnap.data() as User);
      });
      callback(usersList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, USERS_COL);
    }
  );
}

export async function syncSaveUsers(users: User[]) {
  try {
    const batch = writeBatch(db);
    users.forEach((u) => {
      const docRef = doc(db, USERS_COL, u.id);
      batch.set(docRef, cleanForFirestore(u), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, USERS_COL);
  }
}

export async function syncSaveSingleUser(user: User) {
  try {
    const docRef = doc(db, USERS_COL, user.id);
    await setDoc(docRef, cleanForFirestore(user), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COL}/${user.id}`);
  }
}

export async function syncDeleteUser(userId: string) {
  try {
    const docRef = doc(db, USERS_COL, userId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${USERS_COL}/${userId}`);
  }
}

async function seedInitialUsers() {
  try {
    const allUsers = [...INITIAL_ADMINS, ...INITIAL_GURU_BK, ...INITIAL_WALI_KELAS, ...INITIAL_STUDENTS];
    const batch = writeBatch(db);
    allUsers.forEach((u) => {
      const docRef = doc(db, USERS_COL, u.id);
      batch.set(docRef, cleanForFirestore(u));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, USERS_COL);
  }
}

// 2. REALTIME SYNC LOGS
export function subscribeToLogs(callback: (logs: KAIHEntry[]) => void) {
  const colRef = collection(db, LOGS_COL);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        await seedInitialLogs();
        return;
      }
      const logsList: KAIHEntry[] = [];
      snapshot.forEach((docSnap) => {
        logsList.push(docSnap.data() as KAIHEntry);
      });
      callback(logsList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, LOGS_COL);
    }
  );
}

export async function syncSaveLogs(logs: KAIHEntry[]) {
  try {
    const batch = writeBatch(db);
    logs.forEach((log) => {
      const docRef = doc(db, LOGS_COL, log.id);
      batch.set(docRef, cleanForFirestore(log), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LOGS_COL);
  }
}

export async function syncAddLog(log: KAIHEntry) {
  try {
    const docRef = doc(db, LOGS_COL, log.id);
    await setDoc(docRef, cleanForFirestore(log), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${LOGS_COL}/${log.id}`);
  }
}

export async function syncDeleteLog(logId: string) {
  try {
    const docRef = doc(db, LOGS_COL, logId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${LOGS_COL}/${logId}`);
  }
}

async function seedInitialLogs() {
  try {
    const batch = writeBatch(db);
    INITIAL_KAIH_LOGS.forEach((log) => {
      const docRef = doc(db, LOGS_COL, log.id);
      batch.set(docRef, cleanForFirestore(log));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LOGS_COL);
  }
}

// 3. REALTIME SYNC SCHOOL CONFIG
export function subscribeToSchoolConfig(callback: (config: MonthlyReportConfig) => void) {
  const docRef = doc(db, CONFIG_COL, 'main');

  return onSnapshot(
    docRef,
    async (docSnap) => {
      if (!docSnap.exists()) {
        await setDoc(docRef, cleanForFirestore(INITIAL_SCHOOL_CONFIG));
        callback(INITIAL_SCHOOL_CONFIG);
      } else {
        callback(docSnap.data() as MonthlyReportConfig);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${CONFIG_COL}/main`);
    }
  );
}

export async function syncSaveSchoolConfig(config: MonthlyReportConfig) {
  try {
    const docRef = doc(db, CONFIG_COL, 'main');
    await setDoc(docRef, cleanForFirestore(config), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CONFIG_COL}/main`);
  }
}

// 4. REALTIME SYNC PASSWORDS
export function subscribeToPasswords(callback: (passwords: Record<string, string>) => void) {
  const colRef = collection(db, PASSWORDS_COL);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const passMap: Record<string, string> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.username && data.password) {
          passMap[data.username] = data.password;
        }
      });
      callback(passMap);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PASSWORDS_COL);
    }
  );
}

export async function syncSaveCustomPassword(username: string, pass: string) {
  try {
    const docRef = doc(db, PASSWORDS_COL, username);
    await setDoc(docRef, cleanForFirestore({ username, password: pass }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PASSWORDS_COL}/${username}`);
  }
}

export async function syncDeletePassword(usernameOrId: string) {
  try {
    const docRef = doc(db, PASSWORDS_COL, usernameOrId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PASSWORDS_COL}/${usernameOrId}`);
  }
}

// 5. REALTIME SYNC BK NOTES
const BK_NOTES_COL = 'bk_notes';

export function subscribeToBKNotes(callback: (notes: BKCounselingNote[]) => void) {
  const colRef = collection(db, BK_NOTES_COL);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const notesList: BKCounselingNote[] = [];
      snapshot.forEach((docSnap) => {
        notesList.push(docSnap.data() as BKCounselingNote);
      });
      callback(notesList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, BK_NOTES_COL);
    }
  );
}

export async function syncSaveBKNote(note: BKCounselingNote) {
  try {
    const docRef = doc(db, BK_NOTES_COL, note.id);
    await setDoc(docRef, cleanForFirestore(note), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BK_NOTES_COL}/${note.id}`);
  }
}

export async function syncDeleteBKNote(noteId: string) {
  try {
    const docRef = doc(db, BK_NOTES_COL, noteId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BK_NOTES_COL}/${noteId}`);
  }
}

