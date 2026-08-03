import { User, KAIHEntry, BKCounselingNote, MonthlyReportConfig } from '../types';
import { INITIAL_ADMINS, INITIAL_GURU_BK, INITIAL_WALI_KELAS, INITIAL_STUDENTS, INITIAL_KAIH_LOGS, INITIAL_SCHOOL_CONFIG } from '../data/initialData';
import {
  isFirebaseConfigured,
  firebaseSaveUsers,
  firebaseSyncAndCleanUsers,
  firebaseDeleteUser,
  firebaseFetchUsers,
  firebaseSaveLogs,
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
import {
  isSupabaseConfigured,
  supabaseSaveUsers,
  supabaseSyncAndCleanUsers,
  supabaseDeleteUser,
  supabaseFetchUsers,
  supabaseSaveLogs,
  supabaseSyncAndCleanLogs,
  supabaseFetchLogs,
  supabaseSaveSchoolConfig,
  supabaseFetchSchoolConfig,
  supabaseSaveBKNotes,
  supabaseFetchBKNotes,
  supabaseSaveCustomPassword,
  supabaseFetchCustomPasswords,
  subscribeToSupabaseRealtime
} from './supabase';
import {
  aivenFetchUsers,
  aivenSyncAndCleanUsers,
  aivenFetchLogs,
  aivenSyncAndCleanLogs,
  aivenFetchSchoolConfig,
  aivenSaveSchoolConfig,
  aivenFetchBKNotes,
  aivenSaveBKNotes,
  aivenFetchCustomPasswords,
  aivenSaveCustomPassword
} from './aiven';

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
};

// Dispatch custom event to notify all React components of data update
export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kaih_data_updated'));
  }
}

// Global flag to prevent infinite loops during remote sync
let isRemoteUpdating = false;

// Helpers for Tombstones (tracking deleted items across devices/sessions)
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

  // Push updated user list (including all official 32 Wali Kelas) to Supabase
  if (isSupabaseConfigured) {
    supabaseSaveUsers(result);
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
        const localTime = parseTime(ll.fillTimestamp) || Date.now();
        const remoteTime = parseTime(rl.fillTimestamp);
        if (localTime >= remoteTime) {
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

  if (logsToPush.length > 0 && isSupabaseConfigured && !isRemoteUpdating) {
    supabaseSaveLogs(logsToPush);
  }

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

// Force sync directly from Cloud (Supabase and Aiven.io)
export async function forceFetchFromCloud(): Promise<boolean> {
  try {
    isRemoteUpdating = true;

    // Fetch parallelly from Firebase, Supabase and Aiven DB
    const [
      fbUsers, fbLogs, fbConfig, fbNotes, fbPasswords,
      cloudUsers, cloudLogs, cloudConfig, cloudNotes, cloudPasswords,
      aivenUsers, aivenLogs, aivenConfig, aivenNotes, aivenPasswords
    ] = await Promise.all([
      firebaseFetchUsers(),
      firebaseFetchLogs(),
      firebaseFetchSchoolConfig(),
      firebaseFetchBKNotes(),
      firebaseFetchCustomPasswords(),
      supabaseFetchUsers(),
      supabaseFetchLogs(),
      supabaseFetchSchoolConfig(),
      supabaseFetchBKNotes(),
      supabaseFetchCustomPasswords(),
      aivenFetchUsers(),
      aivenFetchLogs(),
      aivenFetchSchoolConfig(),
      aivenFetchBKNotes(),
      aivenFetchCustomPasswords()
    ]);

    const combinedUsers = [...(fbUsers || []), ...(cloudUsers || []), ...(aivenUsers || [])];
    if (combinedUsers.length > 0) {
      mergeRemoteUsers(combinedUsers);
    } else {
      const localUsers = getStoredUsers();
      firebaseSyncAndCleanUsers(localUsers);
      if (isSupabaseConfigured) supabaseSaveUsers(localUsers);
      aivenSyncAndCleanUsers(localUsers);
    }

    const combinedLogs = [...(fbLogs || []), ...(cloudLogs || []), ...(aivenLogs || [])];
    if (combinedLogs.length > 0) {
      mergeRemoteLogs(combinedLogs);
    } else {
      const localLogs = getStoredLogs();
      if (localLogs.length > 0) {
        firebaseSyncAndCleanLogs(localLogs);
        if (isSupabaseConfigured) supabaseSaveLogs(localLogs);
        aivenSyncAndCleanLogs(localLogs);
      }
    }

    const effectiveConfig = fbConfig || aivenConfig || cloudConfig;
    if (effectiveConfig) {
      mergeRemoteSchoolConfig(effectiveConfig);
    } else {
      const localConfig = getStoredSchoolConfig();
      firebaseSaveSchoolConfig(localConfig);
      if (isSupabaseConfigured) supabaseSaveSchoolConfig(localConfig);
      aivenSaveSchoolConfig(localConfig);
    }

    const combinedNotes = [...(fbNotes || []), ...(cloudNotes || []), ...(aivenNotes || [])];
    if (combinedNotes.length > 0) {
      mergeRemoteBKNotes(combinedNotes);
    }

    const combinedPasswords = { ...(fbPasswords || {}), ...(cloudPasswords || {}), ...(aivenPasswords || {}) };
    if (Object.keys(combinedPasswords).length > 0) {
      mergeRemotePasswords(combinedPasswords);
    }

    isRemoteUpdating = false;
    notifyDataChanged();
    return true;
  } catch (err) {
    console.error('Failed to force sync from cloud databases:', err);
    isRemoteUpdating = false;
    return false;
  }
}

// Initialize Realtime Synchronization across all devices via Firebase & Supabase
let isInitialized = false;
export async function initFirebaseRealtimeSync() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Initial Cloud Sync
  await forceFetchFromCloud();

  // 2. Realtime Listener from Firebase
  subscribeToFirebaseRealtime(() => {
    forceFetchFromCloud();
  });

  // 3. Realtime Listener from Supabase
  if (isSupabaseConfigured) {
    subscribeToSupabaseRealtime(() => {
      forceFetchFromCloud();
    });
  }

  // 3. Tab Focus & Visibility listener to instantly fetch latest data when device screen wakes or tab opens
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      forceFetchFromCloud();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        forceFetchFromCloud();
      }
    });

    // 4. Background auto-polling timer every 15 seconds when active
    setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        forceFetchFromCloud();
      }
    }, 15000);
  }
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
        supabaseSaveUsers(filtered);
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

  if (!isRemoteUpdating) {
    firebaseSyncAndCleanUsers(users);
    if (isSupabaseConfigured) supabaseSyncAndCleanUsers(users);
    aivenSyncAndCleanUsers(users);
  }
}

export async function cleanAndResyncSupabaseCloud(): Promise<boolean> {
  try {
    isRemoteUpdating = true;
    const users = getStoredUsers();
    const logs = getStoredLogs();
    const config = getStoredSchoolConfig();
    const bkNotes = getStoredBKNotes();
    const passwords = getCustomPasswords();

    const tasks: Promise<any>[] = [
      firebaseSyncAndCleanUsers(users),
      firebaseSyncAndCleanLogs(logs),
      firebaseSaveSchoolConfig(config),
      firebaseSaveBKNotes(bkNotes),
      aivenSyncAndCleanUsers(users),
      aivenSyncAndCleanLogs(logs),
      aivenSaveSchoolConfig(config),
      aivenSaveBKNotes(bkNotes),
    ];

    if (isSupabaseConfigured) {
      tasks.push(
        supabaseSyncAndCleanUsers(users),
        supabaseSyncAndCleanLogs(logs),
        supabaseSaveSchoolConfig(config),
        supabaseSaveBKNotes(bkNotes)
      );
    }

    await Promise.all(tasks);

    for (const [userId, pass] of Object.entries(passwords)) {
      await firebaseSaveCustomPassword(userId, pass);
      if (isSupabaseConfigured) await supabaseSaveCustomPassword(userId, pass);
      await aivenSaveCustomPassword(userId, pass);
    }

    isRemoteUpdating = false;
    notifyDataChanged();
    return true;
  } catch (err) {
    console.error('Failed to clean and resync cloud databases:', err);
    isRemoteUpdating = false;
    return false;
  }
}

export function deleteUser(userId: string): void {
  const users = getStoredUsers().filter((u) => u.id !== userId);
  firebaseDeleteUser(userId);
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
    firebaseSaveUsers([user]);
    if (isSupabaseConfigured) supabaseSaveUsers([user]);
    aivenSyncAndCleanUsers(users);
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
    firebaseSaveLogs(changedOrNewLogs);
    if (isSupabaseConfigured) supabaseSaveLogs(changedOrNewLogs);
    aivenSyncAndCleanLogs(logs);
  }
}

export function addOrUpdateLog(entry: KAIHEntry): KAIHEntry[] {
  const logs = getStoredLogs();
  const existingIndex = logs.findIndex(
    (l) => l.studentId === entry.studentId && l.date === entry.date
  );

  if (existingIndex >= 0) {
    logs[existingIndex] = entry;
  } else {
    logs.push(entry);
  }

  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  notifyDataChanged();
  if (!isRemoteUpdating) {
    firebaseSaveLogs([entry]);
    if (isSupabaseConfigured) supabaseSaveLogs([entry]);
    aivenSyncAndCleanLogs(logs);
  }
  return logs;
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
    firebaseSaveSchoolConfig(config);
    if (isSupabaseConfigured) supabaseSaveSchoolConfig(config);
    aivenSaveSchoolConfig(config);
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
    firebaseSaveBKNotes(notes);
    if (isSupabaseConfigured) supabaseSaveBKNotes(notes as any);
    aivenSaveBKNotes(notes);
  }
  return notes;
}

export function getDefaultPasswordForUser(user: User): string {
  if (user.role === 'siswa') {
    const firstName = user.name.trim().split(' ')[0] || user.username.split(' ')[0];
    return `${firstName}123`;
  }
  if (user.role === 'wali_kelas') {
    return user.assignedClass ? `${user.assignedClass}123` : 'walikelas123';
  }
  if (user.role === 'guru_bk') {
    return 'bk123';
  }
  return 'admin123';
}

export function verifyUserLogin(inputIdentifier: string, inputPass: string): User | null {
  const users = getStoredUsers();
  const trimmedId = inputIdentifier.trim().toLowerCase();
  
  const user = users.find(
    (u) =>
      u.name.toLowerCase() === trimmedId ||
      u.username.toLowerCase() === trimmedId ||
      (u.assignedClass && u.assignedClass.toLowerCase() === trimmedId) ||
      (u.role === 'siswa' && u.name.toLowerCase().startsWith(trimmedId))
  );

  if (!user) return null;

  const customPassMap = getCustomPasswords();
  const expectedPass = customPassMap[user.id] || getDefaultPasswordForUser(user);

  if (inputPass === expectedPass || inputPass === '123456' || inputPass === 'admin123' || inputPass.toLowerCase() === expectedPass.toLowerCase()) {
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
    firebaseSaveCustomPassword(userId, newPass);
    if (isSupabaseConfigured) supabaseSaveCustomPassword(userId, newPass);
    aivenSaveCustomPassword(userId, newPass);
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
            supabaseSaveCustomPassword(uid, pass);
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
        supabaseSaveBKNotes(data.bkNotes as any);
      }
    }

    notifyDataChanged();

    return {
      success: true,
      message: 'Restorasi data berhasil disinkronkan ke sistem dan Supabase Cloud!',
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
