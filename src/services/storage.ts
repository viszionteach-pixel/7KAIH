import { User, KAIHEntry, BKCounselingNote, MonthlyReportConfig, ClassName } from '../types';
import { INITIAL_ADMINS, INITIAL_GURU_BK, INITIAL_WALI_KELAS, INITIAL_STUDENTS, INITIAL_KAIH_LOGS, INITIAL_SCHOOL_CONFIG } from '../data/initialData';

const KEYS = {
  USERS: 'kaih_smpn10_users_v1',
  CURRENT_USER: 'kaih_smpn10_current_user_v1',
  LOGS: 'kaih_smpn10_logs_v1',
  BK_NOTES: 'kaih_smpn10_bk_notes_v1',
  SCHOOL_CONFIG: 'kaih_smpn10_config_v1',
  CUSTOM_PASSWORDS: 'kaih_smpn10_passwords_v1',
};

// Local storage helpers
export function getStoredUsers(): User[] {
  try {
    const data = localStorage.getItem(KEYS.USERS);
    if (!data) {
      const allInitial = [...INITIAL_ADMINS, ...INITIAL_GURU_BK, ...INITIAL_WALI_KELAS, ...INITIAL_STUDENTS];
      localStorage.setItem(KEYS.USERS, JSON.stringify(allInitial));
      return allInitial;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read users from localStorage:', e);
    return [...INITIAL_ADMINS, ...INITIAL_GURU_BK, ...INITIAL_WALI_KELAS, ...INITIAL_STUDENTS];
  }
}

export function saveStoredUsers(users: User[]): void {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
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
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
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

  saveStoredLogs(logs);
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
  return notes;
}

// Password verification rule:
// Siswa: First name + 123 (e.g., "Ahmad" -> "Ahmad123")
// Wali Kelas: ClassName + 123 or walikelas123 (e.g., "7A123" or "walikelas123")
// BK: bk123 or gurubk123
// Admin: admin123
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
  
  // Find matching user by name or username (case insensitive)
  const user = users.find(
    (u) =>
      u.name.toLowerCase() === trimmedId ||
      u.username.toLowerCase() === trimmedId ||
      (u.assignedClass && u.assignedClass.toLowerCase() === trimmedId) ||
      (u.role === 'siswa' && u.name.toLowerCase().startsWith(trimmedId))
  );

  if (!user) return null;

  // Check stored custom password or default rule
  const customPassMap = getCustomPasswords();
  const expectedPass = customPassMap[user.id] || getDefaultPasswordForUser(user);

  // Accept if password matches OR if testing shortcut matches
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
}

export function resetAllDataToDefault(): void {
  localStorage.removeItem(KEYS.USERS);
  localStorage.removeItem(KEYS.CURRENT_USER);
  localStorage.removeItem(KEYS.LOGS);
  localStorage.removeItem(KEYS.BK_NOTES);
  localStorage.removeItem(KEYS.SCHOOL_CONFIG);
  localStorage.removeItem(KEYS.CUSTOM_PASSWORDS);
}
