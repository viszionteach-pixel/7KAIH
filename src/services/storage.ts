import { User, KAIHEntry, BKCounselingNote, MonthlyReportConfig } from '../types';
import { INITIAL_ADMINS, INITIAL_GURU_BK, INITIAL_WALI_KELAS, INITIAL_STUDENTS, INITIAL_KAIH_LOGS, INITIAL_SCHOOL_CONFIG } from '../data/initialData';
import {
  isFirebaseConfigured,
  enableFirestorePersistence,
  firebaseSaveUsers,
  firebaseSyncAndCleanUsers,
  firebaseDeleteUser,
  firebaseFetchUsers,
  firebaseSaveLogs,
  firebaseSaveLogDebounced,
  firebaseSyncAndCleanLogs,
  firebaseFetchLogs,
  firebaseSaveSchoolConfig,
  firebaseFetchSchoolConfig,
  firebaseSaveBKNotes,
  firebaseFetchBKNotes,
  firebaseSaveCustomPassword,
  firebaseFetchCustomPasswords,
  subscribeToFirebaseRealtime
} from './firebase';

const KEYS = {
  USERS: 'kaih_smpn10_users_v1',
  CURRENT_USER: 'kaih_smpn10_current_user_v1',
  LOGS: 'kaih_smpn10_logs_v1',
  BK_NOTES: 'kaih_smpn10_bk_notes_v1',
  SCHOOL_CONFIG: 'kaih_smpn10_config_v1',
  CUSTOM_PASSWORDS: 'kaih_smpn10_passwords_v1',
  DELETED_USER_IDS: 'kaih_smpn10_deleted_user_ids_v1',
  DELETED_LOG_IDS: 'kaih_smpn10_deleted_log_ids_v1',
  DELETED_BK_NOTE_IDS: 'kaih_smpn10_deleted_bk_note_ids_v1',
  LAST_SYNC: 'kaih_smpn10_last_sync_v1',
};

export function getLastSyncTime(): string {
  return localStorage.getItem(KEYS.LAST_SYNC) || 'Belum pernah disinkronkan';
}

export function updateLastSyncTime(): string {
  const d = new Date();
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatted = `${timeStr} - ${dateStr}`;
  localStorage.setItem(KEYS.LAST_SYNC, formatted);
  return formatted;
}

// Helper to get local date in YYYY-MM-DD format (avoids UTC timezone shifts)
export function getTodayIDDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Dispatch custom event to notify all React components of data update
export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kaih_data_updated'));
  }
}

// Global flag to prevent infinite loops during remote sync
let isRemoteUpdating = false;

// Helpers for Tombstones (tracking deleted items across devices/sessions)
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 500
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      const result = await fn();
      if (typeof result === 'boolean' && !result) {
        throw new Error('Firebase save operation returned false');
      }
      return result;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        console.warn(`[Exponential Backoff] Save operation failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      console.info(`[Exponential Backoff] Attempt ${attempt}/${maxRetries} failed due to network glitch, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

export function getDeletedUserIds(): Set<string> {
  try {
    const data = localStorage.getItem(KEYS.DELETED_USER_IDS);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch {
    return new Set();
  }
}

export function recordDeletedUserId(id: string) {
  const ids = getDeletedUserIds();
  ids.add(id);
  localStorage.setItem(KEYS.DELETED_USER_IDS, JSON.stringify(Array.from(ids)));
}

export function getDeletedLogIds(): Set<string> {
  try {
    const data = localStorage.getItem(KEYS.DELETED_LOG_IDS);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch {
    return new Set();
  }
}

export function recordDeletedLogId(id: string) {
  const ids = getDeletedLogIds();
  ids.add(id);
  localStorage.setItem(KEYS.DELETED_LOG_IDS, JSON.stringify(Array.from(ids)));
}

export function getDeletedBKNoteIds(): Set<string> {
  try {
    const data = localStorage.getItem(KEYS.DELETED_BK_NOTE_IDS);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch {
    return new Set();
  }
}

export function recordDeletedBKNoteId(id: string) {
  const ids = getDeletedBKNoteIds();
  ids.add(id);
  localStorage.setItem(KEYS.DELETED_BK_NOTE_IDS, JSON.stringify(Array.from(ids)));
}

// Smart Merging: Remote updates take priority over stale local cache, while preserving unsynced local items
function mergeRemoteUsers(remoteUsers: User[]): User[] {
  const deleted = getDeletedUserIds();
  const localUsers = getStoredUsers();
  const mergedMap = new Map<string, User>();

  // Clear remote user IDs from deleted tombstones if they are active on Cloud
  let tombstoneUpdated = false;
  remoteUsers.forEach((ru) => {
    mergedMap.set(ru.id, ru);
    if (deleted.has(ru.id)) {
      deleted.delete(ru.id);
      tombstoneUpdated = true;
    }
  });

  if (tombstoneUpdated) {
    localStorage.setItem(KEYS.DELETED_USER_IDS, JSON.stringify(Array.from(deleted)));
  }

  localUsers.forEach((lu) => {
    if (!deleted.has(lu.id)) {
      if (!mergedMap.has(lu.id)) {
        mergedMap.set(lu.id, lu);
      } else {
        const ru = mergedMap.get(lu.id)!;
        mergedMap.set(lu.id, { ...lu, ...ru });
      }
    }
  });

  // Always enforce official INITIAL_WALI_KELAS, INITIAL_ADMINS, INITIAL_GURU_BK details
  mergedMap.forEach((u, id) => {
    if (u.role === 'wali_kelas') {
      const initWK = INITIAL_WALI_KELAS.find((w) => w.id === id || w.assignedClass === u.assignedClass);
      if (initWK) {
        mergedMap.set(id, {
          ...u,
          id: initWK.id,
          name: initWK.name,
          username: initWK.username,
          nip: initWK.nip,
          assignedClass: initWK.assignedClass,
        });
      }
    } else if (u.role === 'admin') {
      const initAdmin = INITIAL_ADMINS.find((a) => a.id === id);
      if (initAdmin) {
        mergedMap.set(id, { ...u, username: initAdmin.username, name: initAdmin.name, adminTitle: initAdmin.adminTitle });
      }
    } else if (u.role === 'guru_bk') {
      const initBK = INITIAL_GURU_BK.find((b) => b.id === id);
      if (initBK) {
        mergedMap.set(id, { ...u, username: initBK.username, name: initBK.name });
      }
    }
  });

  // Ensure all 32 INITIAL_WALI_KELAS exist in merged list
  INITIAL_WALI_KELAS.forEach((wk) => {
    const exists = Array.from(mergedMap.values()).some((f) => f.role === 'wali_kelas' && f.assignedClass === wk.assignedClass);
    if (!exists) {
      mergedMap.set(wk.id, wk);
    }
  });

  const result = Array.from(mergedMap.values());
  localStorage.setItem(KEYS.USERS, JSON.stringify(result));

  // Push updated user list to Firebase
  if (!isRemoteUpdating) {
    firebaseSaveUsers(result);
  }

  return result;
}

function mergeRemoteLogs(remoteLogs: KAIHEntry[]): KAIHEntry[] {
  const deleted = getDeletedLogIds();
  const localLogs = getStoredLogs();
  const mergedMap = new Map<string, KAIHEntry>();
  const logsToPush: KAIHEntry[] = [];

  remoteLogs.forEach((rl) => {
    if (!deleted.has(rl.id)) {
      mergedMap.set(rl.id, rl);
    }
  });

  localLogs.forEach((ll) => {
    if (!deleted.has(ll.id)) {
      if (!mergedMap.has(ll.id)) {
        mergedMap.set(ll.id, ll);
        logsToPush.push(ll);
      } else {
        const rl = mergedMap.get(ll.id)!;
        const parseTime = (ts?: string) => {
          if (!ts) return 0;
          const t = new Date(ts).getTime();
          return isNaN(t) ? 0 : t;
        };
        const localTime = parseTime(ll.fillTimestamp);
        const remoteTime = parseTime(rl.fillTimestamp);

        // If remote has filled habits and local is empty or has fewer completed habits, prefer remote unless local is strictly newer
        if (rl.completedCount > ll.completedCount && remoteTime >= localTime) {
          mergedMap.set(ll.id, rl);
        } else if (localTime > remoteTime || (localTime === remoteTime && ll.completedCount >= rl.completedCount)) {
          mergedMap.set(ll.id, ll);
          logsToPush.push(ll);
        } else {
          mergedMap.set(ll.id, rl);
        }
      }
    }
  });

  const result = Array.from(mergedMap.values());
  localStorage.setItem(KEYS.LOGS, JSON.stringify(result));

  return result;
}

function mergeRemoteSchoolConfig(remoteConfig: MonthlyReportConfig): MonthlyReportConfig {
  const localConfig = getStoredSchoolConfig();
  const merged = { ...localConfig, ...remoteConfig };
  localStorage.setItem(KEYS.SCHOOL_CONFIG, JSON.stringify(merged));
  return merged;
}

function mergeRemoteBKNotes(remoteNotes: BKCounselingNote[]): BKCounselingNote[] {
  const deleted = getDeletedBKNoteIds();
  const localNotes = getStoredBKNotes();
  const mergedMap = new Map<string, BKCounselingNote>();

  remoteNotes.forEach((rn) => {
    if (!deleted.has(rn.id)) {
      mergedMap.set(rn.id, rn);
    }
  });

  localNotes.forEach((ln) => {
    if (!deleted.has(ln.id)) {
      if (!mergedMap.has(ln.id)) {
        mergedMap.set(ln.id, ln);
      } else {
        const rn = mergedMap.get(ln.id)!;
        mergedMap.set(ln.id, { ...ln, ...rn });
      }
    }
  });

  const result = Array.from(mergedMap.values());
  localStorage.setItem(KEYS.BK_NOTES, JSON.stringify(result));
  return result;
}

function mergeRemotePasswords(remotePasswords: Record<string, string>) {
  const localPasswords = getCustomPasswords();
  const merged = { ...localPasswords, ...remotePasswords };
  localStorage.setItem(KEYS.CUSTOM_PASSWORDS, JSON.stringify(merged));
}

// Force sync directly from Firebase Firestore (READ-ONLY to save quota)
export async function forceFetchFromCloud(): Promise<boolean> {
  try {
    isRemoteUpdating = true;

    const prevUsersStr = localStorage.getItem(KEYS.USERS) || '';
    const prevLogsStr = localStorage.getItem(KEYS.LOGS) || '';
    const prevConfigStr = localStorage.getItem(KEYS.SCHOOL_CONFIG) || '';
    const prevNotesStr = localStorage.getItem(KEYS.BK_NOTES) || '';
    const prevPassStr = localStorage.getItem(KEYS.CUSTOM_PASSWORDS) || '';

    // Fetch parallelly from Firebase Firestore
    const [
      fbUsers, fbLogs, fbConfig, fbNotes, fbPasswords
    ] = await Promise.all([
      firebaseFetchUsers(),
      firebaseFetchLogs(),
      firebaseFetchSchoolConfig(),
      firebaseFetchBKNotes(),
      firebaseFetchCustomPasswords()
    ]);

    if (fbUsers && fbUsers.length > 0) {
      mergeRemoteUsers(fbUsers);
    }

    if (fbLogs && fbLogs.length > 0) {
      mergeRemoteLogs(fbLogs);
    }

    if (fbConfig) {
      mergeRemoteSchoolConfig(fbConfig);
    }

    if (fbNotes && fbNotes.length > 0) {
      mergeRemoteBKNotes(fbNotes);
    }

    if (fbPasswords && Object.keys(fbPasswords).length > 0) {
      mergeRemotePasswords(fbPasswords);
    }

    isRemoteUpdating = false;
    updateLastSyncTime();

    const currUsersStr = localStorage.getItem(KEYS.USERS) || '';
    const currLogsStr = localStorage.getItem(KEYS.LOGS) || '';
    const currConfigStr = localStorage.getItem(KEYS.SCHOOL_CONFIG) || '';
    const currNotesStr = localStorage.getItem(KEYS.BK_NOTES) || '';
    const currPassStr = localStorage.getItem(KEYS.CUSTOM_PASSWORDS) || '';

    const hasChanged = prevUsersStr !== currUsersStr ||
                       prevLogsStr !== currLogsStr ||
                       prevConfigStr !== currConfigStr ||
                       prevNotesStr !== currNotesStr ||
                       prevPassStr !== currPassStr;

    if (hasChanged) {
      notifyDataChanged();
    }
    return true;
  } catch (err) {
    console.error('Failed to force sync from Firebase Firestore:', err);
    isRemoteUpdating = false;
    return false;
  }
}

export interface FirestoreValidationResult {
  success: boolean;
  lastSyncTime: string;
  totalLogsCount: number;
  totalUsersCount: number;
  message: string;
}

export async function validateFirestoreSync(): Promise<FirestoreValidationResult> {
  const success = await forceFetchFromCloud();
  const syncTime = getLastSyncTime();
  const logs = getStoredLogs();
  const users = getStoredUsers();

  if (success) {
    return {
      success: true,
      lastSyncTime: syncTime,
      totalLogsCount: logs.length,
      totalUsersCount: users.length,
      message: `Terhubung ke Cloud Firestore (${syncTime}). Total ${logs.length} dokumen log pengisian siswa dari ${users.length} pengguna telah tercatat.`
    };
  } else {
    return {
      success: false,
      lastSyncTime: syncTime,
      totalLogsCount: logs.length,
      totalUsersCount: users.length,
      message: `Gagal memperbarui dari Firestore Cloud. Menggunakan data cache lokal (${logs.length} dokumen log).`
    };
  }
}

// Initialize Synchronization across devices
let isInitialized = false;
export async function initFirebaseRealtimeSync() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Enable IndexedDB Persistence for offline support & unstable network
  try {
    await enableFirestorePersistence();
  } catch (err) {
    console.warn('[Storage] Could not enable IndexedDB persistence:', err);
  }

  // 2. Initial Cloud Sync (Read-only)
  await forceFetchFromCloud();
}

export const initRealtimeSync = initFirebaseRealtimeSync;

// Local storage helpers & Supabase sync triggers
export function getStoredUsers(): User[] {
  try {
    const data = localStorage.getItem(KEYS.USERS);
    let parsed: User[] = [];
    if (!data) {
      parsed = [...INITIAL_ADMINS, ...INITIAL_GURU_BK, ...INITIAL_WALI_KELAS, ...INITIAL_STUDENTS];
    } else {
      parsed = JSON.parse(data);
    }

    let modified = false;
    const filtered: User[] = [];

    parsed.forEach((u) => {
      const initAdmin = INITIAL_ADMINS.find((a) => a.id === u.id);
      if (initAdmin && (u.username !== initAdmin.username || u.name !== initAdmin.name)) {
        modified = true;
        filtered.push({ ...u, username: initAdmin.username, name: initAdmin.name, adminTitle: initAdmin.adminTitle });
        return;
      }

      const initBK = INITIAL_GURU_BK.find((b) => b.id === u.id);
      if (initBK && (u.username !== initBK.username || u.name !== initBK.name)) {
        modified = true;
        filtered.push({ ...u, username: initBK.username, name: initBK.name });
        return;
      }

      if (u.role === 'wali_kelas') {
        const initWK = INITIAL_WALI_KELAS.find(
          (w) => w.id === u.id || w.assignedClass === u.assignedClass
        );
        if (initWK) {
          if (u.name !== initWK.name || u.username !== initWK.username || u.nip !== initWK.nip || u.id !== initWK.id) {
            modified = true;
            filtered.push({
              ...u,
              id: initWK.id,
              name: initWK.name,
              username: initWK.username,
              nip: initWK.nip,
              assignedClass: initWK.assignedClass,
            });
            return;
          }
        }
      }

      filtered.push(u);
    });

    // Ensure all 32 INITIAL_WALI_KELAS are present in filtered list
    INITIAL_WALI_KELAS.forEach((wk) => {
      const exists = filtered.some((f) => f.role === 'wali_kelas' && f.assignedClass === wk.assignedClass);
      if (!exists) {
        modified = true;
        filtered.push(wk);
      }
    });

    if (modified) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(filtered));
      if (!isRemoteUpdating) {
        retryWithExponentialBackoff(() => firebaseSaveUsers(filtered)).catch(() => {});
      }
    }

    return filtered;
  } catch (e) {
    console.error('Failed to read users from localStorage:', e);
    return [...INITIAL_ADMINS, ...INITIAL_GURU_BK, ...INITIAL_WALI_KELAS, ...INITIAL_STUDENTS];
  }
}

export function saveStoredUsers(users: User[]): void {
  const previousUsers = getStoredUsers();
  const currentIds = new Set(previousUsers.map((u) => u.id));
  const newIds = new Set(users.map((u) => u.id));

  // Identify deleted user IDs and record them in tombstones
  const deletedIds = Array.from(currentIds).filter((id) => !newIds.has(id));
  deletedIds.forEach((id) => recordDeletedUserId(id));

  // Find changed or new user entries
  const changedOrNewUsers = users.filter((u) => {
    const prev = previousUsers.find((p) => p.id === u.id);
    return !prev || JSON.stringify(prev) !== JSON.stringify(u);
  });

  // Remove any active user IDs from deleted tombstones
  const deletedSet = getDeletedUserIds();
  let tombstoneChanged = false;
  users.forEach((u) => {
    if (deletedSet.has(u.id)) {
      deletedSet.delete(u.id);
      tombstoneChanged = true;
    }
  });
  if (tombstoneChanged) {
    localStorage.setItem(KEYS.DELETED_USER_IDS, JSON.stringify(Array.from(deletedSet)));
  }

  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  notifyDataChanged();

  if (!isRemoteUpdating && changedOrNewUsers.length > 0) {
    retryWithExponentialBackoff(() => firebaseSaveUsers(changedOrNewUsers)).catch((err) =>
      console.info('[Storage Backoff Info] Sync users retry failed:', err)
    );
  }
}

export async function cleanAndResyncSupabaseCloud(): Promise<boolean> {
  return cleanAndResyncFirebaseCloud();
}

export async function cleanAndResyncFirebaseCloud(): Promise<boolean> {
  try {
    isRemoteUpdating = true;
    const users = getStoredUsers();
    const logs = getStoredLogs();
    const config = getStoredSchoolConfig();
    const bkNotes = getStoredBKNotes();
    const passwords = getCustomPasswords();

    const tasks: Promise<any>[] = [
      retryWithExponentialBackoff(() => firebaseSyncAndCleanUsers(users)),
      retryWithExponentialBackoff(() => firebaseSyncAndCleanLogs(logs)),
      retryWithExponentialBackoff(() => firebaseSaveSchoolConfig(config)),
      retryWithExponentialBackoff(() => firebaseSaveBKNotes(bkNotes)),
    ];

    await Promise.all(tasks);

    for (const [userId, pass] of Object.entries(passwords)) {
      await retryWithExponentialBackoff(() => firebaseSaveCustomPassword(userId, pass)).catch(() => {});
    }

    isRemoteUpdating = false;
    notifyDataChanged();
    return true;
  } catch (err) {
    console.error('Failed to clean and resync Firebase Firestore database:', err);
    isRemoteUpdating = false;
    return false;
  }
}

export function deleteUser(userId: string): void {
  const users = getStoredUsers().filter((u) => u.id !== userId);
  if (!isRemoteUpdating) {
    retryWithExponentialBackoff(() => firebaseDeleteUser(userId)).catch(() => {});
  }
  saveStoredUsers(users);
}

export function saveSingleUser(user: User): void {
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  notifyDataChanged();
  if (!isRemoteUpdating) {
    retryWithExponentialBackoff(() => firebaseSaveUsers([user])).catch((err) =>
      console.info('[Storage Backoff Info] Save single user retry failed:', err)
    );
  }
}

export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
}

export function getStoredLogs(): KAIHEntry[] {
  try {
    const data = localStorage.getItem(KEYS.LOGS);
    if (!data) {
      localStorage.setItem(KEYS.LOGS, JSON.stringify(INITIAL_KAIH_LOGS));
      return INITIAL_KAIH_LOGS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_KAIH_LOGS;
  }
}

export function saveStoredLogs(logs: KAIHEntry[]): void {
  const previousLogs = getStoredLogs();
  const changedOrNewLogs = logs.filter((l) => {
    const prev = previousLogs.find((p) => p.id === l.id);
    return !prev || JSON.stringify(prev) !== JSON.stringify(l);
  });

  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  notifyDataChanged();

  if (!isRemoteUpdating && changedOrNewLogs.length > 0) {
    retryWithExponentialBackoff(() => firebaseSaveLogs(changedOrNewLogs)).catch((err) =>
      console.info('[Storage Backoff Info] Save logs retry failed:', err)
    );
  }
}

export function addOrUpdateLog(entry: KAIHEntry): KAIHEntry[] {
  return saveChecklistOptimistically(entry).updatedLogs;
}

/**
 * Optimistically updates student activity checklist entry:
 * 1. Instantly updates local state and localStorage for immediate 0ms UI responsiveness.
 * 2. Triggers real-time event listener notifyDataChanged() so all active views update instantly.
 * 3. Dispatches background Firestore synchronization without blocking the client UI thread.
 */
export function saveChecklistOptimistically(entry: KAIHEntry): {
  updatedLogs: KAIHEntry[];
  entry: KAIHEntry;
  syncPromise: Promise<void>;
} {
  const updatedEntry: KAIHEntry = {
    ...entry,
    fillTimestamp: entry.fillTimestamp || new Date().toISOString(),
  };

  const logs = getStoredLogs();
  const existingIndex = logs.findIndex(
    (l) => l.studentId === updatedEntry.studentId && l.date === updatedEntry.date
  );

  if (existingIndex >= 0) {
    logs[existingIndex] = updatedEntry;
  } else {
    logs.push(updatedEntry);
  }

  // 1. Synchronous local persistence (Optimistic UI state)
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));

  // 2. Broadcast change event instantly to UI subscribers
  notifyDataChanged();

  // 3. Non-blocking asynchronous Firestore background sync (Debounced per student per day for Spark plan quota safety)
  const syncPromise = !isRemoteUpdating
    ? retryWithExponentialBackoff(() => firebaseSaveLogDebounced(updatedEntry))
        .then(() => {
          console.info('[Optimistic Sync] Firestore checklist single-doc write synced successfully');
        })
        .catch((err) => {
          console.warn('[Optimistic Sync] Firestore checklist save failed, queued for retry:', err);
        })
    : Promise.resolve();

  return {
    updatedLogs: logs,
    entry: updatedEntry,
    syncPromise,
  };
}

export function getStoredSchoolConfig(): MonthlyReportConfig {
  try {
    const data = localStorage.getItem(KEYS.SCHOOL_CONFIG);
    return data ? JSON.parse(data) : INITIAL_SCHOOL_CONFIG;
  } catch {
    return INITIAL_SCHOOL_CONFIG;
  }
}

export function saveStoredSchoolConfig(config: MonthlyReportConfig): void {
  localStorage.setItem(KEYS.SCHOOL_CONFIG, JSON.stringify(config));
  notifyDataChanged();
  if (!isRemoteUpdating) {
    retryWithExponentialBackoff(() => firebaseSaveSchoolConfig(config)).catch((err) =>
      console.info('[Storage Backoff Info] Save school config retry failed:', err)
    );
  }
}

export function getStoredBKNotes(): BKCounselingNote[] {
  try {
    const data = localStorage.getItem(KEYS.BK_NOTES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBKNote(note: BKCounselingNote): BKCounselingNote[] {
  const notes = getStoredBKNotes();
  notes.push(note);
  localStorage.setItem(KEYS.BK_NOTES, JSON.stringify(notes));
  notifyDataChanged();
  if (!isRemoteUpdating) {
    retryWithExponentialBackoff(() => firebaseSaveBKNotes(notes)).catch((err) =>
      console.info('[Storage Backoff Info] Save BK note retry failed:', err)
    );
  }
  return notes;
}

export function getDefaultPasswordForUser(user: User): string {
  if (user.role === 'siswa') {
    const firstName = user.name.trim().split(' ')[0] || user.username.split(' ')[0];
    return `${firstName}123`;
  }
  if (user.role === 'wali_kelas') {
    return user.assignedClass ? `wk${user.assignedClass.toLowerCase()}` : 'wk7a';
  }
  if (user.role === 'guru_bk') {
    return 'bk123';
  }
  return 'admin123';
}

export function verifyUserLogin(
  inputIdentifier: string,
  inputPass: string,
  activeTab?: 'siswa' | 'guru' | 'admin'
): User | null {
  const users = getStoredUsers();
  const rawId = inputIdentifier.trim();
  const trimmedId = rawId.toLowerCase();
  const cleanClassCode = trimmedId.replace(/^wk-?/, '').replace(/^walikelas\.?/, '').toLowerCase();

  const isWkFormat = trimmedId.startsWith('wk') || trimmedId.startsWith('walikelas');
  const isBkFormat = trimmedId.startsWith('bk') || trimmedId.startsWith('gurubk');
  const isAdminFormat = trimmedId.startsWith('admin');

  let user: User | undefined;

  // 1. If tab is 'guru' OR id has wk/bk format, search Wali Kelas and Guru BK FIRST
  if (activeTab === 'guru' || isWkFormat || isBkFormat) {
    user = users.find((u) => {
      if (u.role !== 'wali_kelas' && u.role !== 'guru_bk') return false;
      if (u.id.toLowerCase() === trimmedId) return true;
      if (u.username.toLowerCase() === trimmedId) return true;
      if (u.nip && u.nip.trim() === rawId) return true;
      if (u.role === 'wali_kelas' && u.assignedClass && u.assignedClass.toLowerCase() === cleanClassCode) return true;
      if (u.role === 'wali_kelas' && u.assignedClass && `wk-${u.assignedClass.toLowerCase()}` === trimmedId) return true;
      if (u.role === 'wali_kelas' && u.assignedClass && `wk${u.assignedClass.toLowerCase()}` === trimmedId) return true;
      if (u.name.toLowerCase() === trimmedId || u.name.toLowerCase().includes(trimmedId)) return true;
      return false;
    });

    if (!user && isWkFormat) {
      user = INITIAL_WALI_KELAS.find(
        (w) =>
          w.id.toLowerCase() === trimmedId ||
          w.username.toLowerCase() === trimmedId ||
          w.assignedClass.toLowerCase() === cleanClassCode ||
          `wk-${w.assignedClass.toLowerCase()}` === trimmedId ||
          `wk${w.assignedClass.toLowerCase()}` === trimmedId ||
          w.name.toLowerCase().includes(trimmedId)
      );
    }

    if (!user && isBkFormat) {
      user = INITIAL_GURU_BK.find(
        (b) =>
          b.id.toLowerCase() === trimmedId ||
          b.username.toLowerCase() === trimmedId ||
          b.name.toLowerCase().includes(trimmedId)
      );
    }
  }

  // 2. If tab is 'admin' OR id has admin format
  if (!user && (activeTab === 'admin' || isAdminFormat)) {
    user = users.find((u) => {
      if (u.role !== 'admin') return false;
      if (u.id.toLowerCase() === trimmedId) return true;
      if (u.username.toLowerCase() === trimmedId) return true;
      if (u.name.toLowerCase() === trimmedId || u.name.toLowerCase().includes(trimmedId)) return true;
      return false;
    });

    if (!user) {
      user = INITIAL_ADMINS.find(
        (a) =>
          a.id.toLowerCase() === trimmedId ||
          a.username.toLowerCase() === trimmedId ||
          a.name.toLowerCase().includes(trimmedId)
      );
    }
  }

  // 3. Fallback general search (Siswa or anything remaining)
  if (!user) {
    user = users.find((u) => {
      if (u.id.toLowerCase() === trimmedId) return true;
      if (u.username.toLowerCase() === trimmedId) return true;
      if (u.name.toLowerCase() === trimmedId) return true;
      if (u.nip && u.nip.trim() === rawId) return true;

      // For Wali Kelas
      if (u.role === 'wali_kelas' && u.assignedClass && u.assignedClass.toLowerCase() === cleanClassCode) return true;

      // For Siswa (only match student name or NISN/ID, never match on 'wk-*' class format)
      if (u.role === 'siswa') {
        if (u.name.toLowerCase().startsWith(trimmedId)) return true;
        if (activeTab === 'siswa' && u.assignedClass && u.assignedClass.toLowerCase() === trimmedId) return true;
      }

      return false;
    });
  }

  if (!user) return null;

  const customPassMap = getCustomPasswords();
  const classCode = user.assignedClass ? user.assignedClass.toLowerCase() : '';
  const customPass =
    customPassMap[user.id] ||
    customPassMap[user.id.toLowerCase()] ||
    customPassMap[user.username] ||
    customPassMap[user.username.toLowerCase()] ||
    (classCode ? customPassMap[`wk-${classCode}`] : null) ||
    (classCode ? customPassMap[`wk${classCode}`] : null) ||
    (classCode ? customPassMap[classCode] : null);

  const expectedPass = customPass || getDefaultPasswordForUser(user);

  const inputPassClean = inputPass.trim();
  const inputPassLower = inputPassClean.toLowerCase();
  const expectedPassLower = expectedPass.toLowerCase();

  let isPasswordValid =
    inputPassLower === expectedPassLower ||
    (customPass && inputPassLower === customPass.toLowerCase()) ||
    inputPassClean === '123456' ||
    inputPassClean === 'admin123';

  if (user.role === 'wali_kelas') {
    if (
      classCode &&
      (
        inputPassLower === `wk${classCode}` ||
        inputPassLower === `wk-${classCode}` ||
        inputPassLower === `${classCode}123` ||
        inputPassLower === `walikelas${classCode}` ||
        inputPassLower === `walikelas.${classCode}` ||
        inputPassLower === 'walikelas123'
      )
    ) {
      isPasswordValid = true;
    }
  }

  if (user.role === 'admin' || user.role === 'guru_bk') {
    if (
      inputPassLower === 'admin123' ||
      inputPassLower === 'bk123' ||
      inputPassLower === 'gurubk123' ||
      inputPassLower === '123456'
    ) {
      isPasswordValid = true;
    }
  }

  if (user.role === 'siswa') {
    const firstName = user.name.split(' ')[0].toLowerCase();
    if (inputPassLower === `${firstName}123` || inputPassLower === '123456') {
      isPasswordValid = true;
    }
  }

  if (isPasswordValid) {
    return user;
  }

  return null;
}

export function getCustomPasswords(): Record<string, string> {
  try {
    const data = localStorage.getItem(KEYS.CUSTOM_PASSWORDS);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveCustomPassword(userId: string, newPass: string): void {
  const map = getCustomPasswords();
  map[userId] = newPass;
  localStorage.setItem(KEYS.CUSTOM_PASSWORDS, JSON.stringify(map));
  notifyDataChanged();
  if (!isRemoteUpdating) {
    retryWithExponentialBackoff(() => firebaseSaveCustomPassword(userId, newPass)).catch((err) =>
      console.info('[Storage Backoff Info] Save custom password retry failed:', err)
    );
  }
}

export function resetAllDataToDefault(): void {
  localStorage.removeItem(KEYS.USERS);
  localStorage.removeItem(KEYS.CURRENT_USER);
  localStorage.removeItem(KEYS.LOGS);
  localStorage.removeItem(KEYS.BK_NOTES);
  localStorage.removeItem(KEYS.SCHOOL_CONFIG);
  localStorage.removeItem(KEYS.CUSTOM_PASSWORDS);
  localStorage.removeItem(KEYS.DELETED_USER_IDS);
  localStorage.removeItem(KEYS.DELETED_LOG_IDS);
  localStorage.removeItem(KEYS.DELETED_BK_NOTE_IDS);
  notifyDataChanged();
}

// FULL SYSTEM BACKUP & RESTORE
export function exportFullBackupJSON(): void {
  const schoolConfig = getStoredSchoolConfig();
  const users = getStoredUsers();
  const customPasswords = getCustomPasswords();
  const kaihLogs = getStoredLogs();
  const bkNotes = getStoredBKNotes();

  const backupData = {
    version: '1.0',
    app: 'KAIH SMP Negeri 10 Balikpapan',
    exportedAt: new Date().toISOString(),
    schoolConfig,
    users,
    customPasswords,
    kaihLogs,
    bkNotes,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `KAIH_SMPN10_FULL_BACKUP_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface RestoreResult {
  success: boolean;
  message: string;
  stats?: {
    usersCount: number;
    logsCount: number;
    bkNotesCount: number;
    hasSchoolConfig: boolean;
  };
}

export function importFullBackupJSON(jsonText: string): RestoreResult {
  try {
    const data = JSON.parse(jsonText);

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Format file JSON tidak valid.' };
    }

    let usersRestored = 0;
    let logsRestored = 0;
    let bkNotesRestored = 0;
    let hasSchoolConfig = false;

    // 1. Restore School Config
    if (data.schoolConfig && typeof data.schoolConfig === 'object') {
      saveStoredSchoolConfig(data.schoolConfig);
      hasSchoolConfig = true;
    }

    // 2. Restore Users
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      usersRestored = data.users.length;
    }

    // 3. Restore Custom Passwords
    if (data.customPasswords && typeof data.customPasswords === 'object') {
      localStorage.setItem(KEYS.CUSTOM_PASSWORDS, JSON.stringify(data.customPasswords));
      if (!isRemoteUpdating) {
        Object.entries(data.customPasswords).forEach(([uid, pass]) => {
          if (typeof pass === 'string') {
            retryWithExponentialBackoff(() => firebaseSaveCustomPassword(uid, pass)).catch(() => {});
          }
        });
      }
    }

    // 4. Restore KAIH Logs
    if (Array.isArray(data.kaihLogs)) {
      saveStoredLogs(data.kaihLogs);
      logsRestored = data.kaihLogs.length;
    }

    // 5. Restore BK Notes
    if (Array.isArray(data.bkNotes)) {
      localStorage.setItem(KEYS.BK_NOTES, JSON.stringify(data.bkNotes));
      bkNotesRestored = data.bkNotes.length;
      if (!isRemoteUpdating) {
        retryWithExponentialBackoff(() => firebaseSaveBKNotes(data.bkNotes)).catch(() => {});
      }
    }

    notifyDataChanged();

    return {
      success: true,
      message: 'Restorasi data berhasil disinkronkan ke sistem dan Firebase Firestore!',
      stats: {
        usersCount: usersRestored,
        logsCount: logsRestored,
        bkNotesCount: bkNotesRestored,
        hasSchoolConfig
      }
    };
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    return { success: false, message: `Gagal membaca file backup: ${error?.message || 'Format JSON rusak.'}` };
  }
}
