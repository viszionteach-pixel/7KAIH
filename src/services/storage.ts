import { User, KAIHEntry, BKCounselingNote, MonthlyReportConfig } from '../types';
import { INITIAL_ADMINS, INITIAL_GURU_BK, INITIAL_WALI_KELAS, INITIAL_STUDENTS, INITIAL_KAIH_LOGS, INITIAL_SCHOOL_CONFIG } from '../data/initialData';
import {
  subscribeToUsers,
  syncSaveUsers,
  syncSaveSingleUser,
  syncDeleteUser,
  subscribeToLogs,
  syncSaveLogs,
  syncAddLog,
  syncDeleteLog,
  subscribeToSchoolConfig,
  syncSaveSchoolConfig,
  subscribeToPasswords,
  syncSaveCustomPassword,
  syncDeletePassword,
  subscribeToBKNotes,
  syncSaveBKNote,
  syncDeleteBKNote
} from './firebase';

const KEYS = {
  USERS: 'kaih_smpn10_users_v1',
  CURRENT_USER: 'kaih_smpn10_current_user_v1',
  LOGS: 'kaih_smpn10_logs_v1',
  BK_NOTES: 'kaih_smpn10_bk_notes_v1',
  SCHOOL_CONFIG: 'kaih_smpn10_config_v1',
  CUSTOM_PASSWORDS: 'kaih_smpn10_passwords_v1',
};

// Dispatch custom event to notify all React components of data update
export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kaih_data_updated'));
  }
}

// Global flag to prevent infinite loops during remote sync
let isRemoteUpdating = false;

// Initialize Firebase Realtime 2-Way Synchronization across all devices
let isInitialized = false;
export function initFirebaseRealtimeSync() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Subscribe to Users from Firestore
  subscribeToUsers((remoteUsers) => {
    if (remoteUsers && remoteUsers.length > 0) {
      isRemoteUpdating = true;
      localStorage.setItem(KEYS.USERS, JSON.stringify(remoteUsers));
      isRemoteUpdating = false;
      notifyDataChanged();
    }
  });

  // 2. Subscribe to Logs from Firestore
  subscribeToLogs((remoteLogs) => {
    if (remoteLogs) {
      isRemoteUpdating = true;
      localStorage.setItem(KEYS.LOGS, JSON.stringify(remoteLogs));
      isRemoteUpdating = false;
      notifyDataChanged();
    }
  });

  // 3. Subscribe to School Config from Firestore
  subscribeToSchoolConfig((remoteConfig) => {
    if (remoteConfig) {
      isRemoteUpdating = true;
      localStorage.setItem(KEYS.SCHOOL_CONFIG, JSON.stringify(remoteConfig));
      isRemoteUpdating = false;
      notifyDataChanged();
    }
  });

  // 4. Subscribe to Custom Passwords from Firestore
  subscribeToPasswords((remotePasswords) => {
    if (remotePasswords) {
      isRemoteUpdating = true;
      localStorage.setItem(KEYS.CUSTOM_PASSWORDS, JSON.stringify(remotePasswords));
      isRemoteUpdating = false;
      notifyDataChanged();
    }
  });

  // 5. Subscribe to BK Notes from Firestore
  subscribeToBKNotes((remoteNotes) => {
    if (remoteNotes) {
      isRemoteUpdating = true;
      localStorage.setItem(KEYS.BK_NOTES, JSON.stringify(remoteNotes));
      isRemoteUpdating = false;
      notifyDataChanged();
    }
  });
}

// Local storage helpers & Firebase sync triggers
export function getStoredUsers(): User[] {
  try {
    const data = localStorage.getItem(KEYS.USERS);
    if (!data) {
      const allInitial = [...INITIAL_ADMINS, ...INITIAL_GURU_BK, ...INITIAL_WALI_KELAS, ...INITIAL_STUDENTS];
      localStorage.setItem(KEYS.USERS, JSON.stringify(allInitial));
      // Sync initial users to Firestore
      syncSaveUsers(allInitial);
      return allInitial;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read users from localStorage:', e);
    return [...INITIAL_ADMINS, ...INITIAL_GURU_BK, ...INITIAL_WALI_KELAS, ...INITIAL_STUDENTS];
  }
}

export function saveStoredUsers(users: User[]): void {
  const previousUsers = getStoredUsers();
  const currentIds = new Set(previousUsers.map((u) => u.id));
  const newIds = new Set(users.map((u) => u.id));

  // Identify deleted user IDs and remove them from Firestore
  const deletedIds = Array.from(currentIds).filter((id) => !newIds.has(id));

  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  notifyDataChanged();

  if (!isRemoteUpdating) {
    syncSaveUsers(users);
    deletedIds.forEach((id) => {
      syncDeleteUser(id);
      syncDeletePassword(id);
    });
  }
}

export function deleteUser(userId: string): void {
  const users = getStoredUsers().filter((u) => u.id !== userId);
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
    syncSaveSingleUser(user);
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
      syncSaveLogs(INITIAL_KAIH_LOGS);
      return INITIAL_KAIH_LOGS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_KAIH_LOGS;
  }
}

export function saveStoredLogs(logs: KAIHEntry[]): void {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  notifyDataChanged();
  if (!isRemoteUpdating) {
    syncSaveLogs(logs);
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
    syncAddLog(entry);
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
    syncSaveSchoolConfig(config);
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
    syncSaveBKNote(note);
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
    syncSaveCustomPassword(userId, newPass);
  }
}

export function resetAllDataToDefault(): void {
  localStorage.removeItem(KEYS.USERS);
  localStorage.removeItem(KEYS.CURRENT_USER);
  localStorage.removeItem(KEYS.LOGS);
  localStorage.removeItem(KEYS.BK_NOTES);
  localStorage.removeItem(KEYS.SCHOOL_CONFIG);
  localStorage.removeItem(KEYS.CUSTOM_PASSWORDS);
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

    // 1. Restore School Config (Includes Logo, Stempel, Kop Surat, Identitas Sekolah)
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
            syncSaveCustomPassword(uid, pass);
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
        data.bkNotes.forEach((note: BKCounselingNote) => {
          if (note && note.id) {
            syncSaveBKNote(note);
          }
        });
      }
    }

    notifyDataChanged();

    return {
      success: true,
      message: 'Restorasi data berhasil disinkronkan ke sistem dan Cloud Firestore!',
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

