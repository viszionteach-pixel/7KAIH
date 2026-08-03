import { User, KAIHEntry, MonthlyReportConfig, BKCounselingNote } from '../types';

export interface AivenStatusResponse {
  configured: boolean;
  connected: boolean;
  timestamp?: string;
  error?: string;
  connectionStringMasked?: string;
}

// Get saved Aiven URL from localStorage or environment
export function getSavedAivenUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('kaih_aiven_db_url') || '';
}

export function saveAivenUrl(url: string) {
  if (typeof window !== 'undefined') {
    if (!url) {
      localStorage.removeItem('kaih_aiven_db_url');
    } else {
      localStorage.setItem('kaih_aiven_db_url', url.trim());
    }
  }
}

// Check Aiven status
export async function checkAivenStatus(customUrl?: string, save = false): Promise<AivenStatusResponse> {
  try {
    const urlParam = customUrl ? `?url=${encodeURIComponent(customUrl)}&save=${save}` : (getSavedAivenUrl() ? `?url=${encodeURIComponent(getSavedAivenUrl())}&save=${save}` : '');
    const res = await fetch(`/api/aiven/status${urlParam}`);
    if (!res.ok) return { configured: false, connected: false, error: 'API Error' };
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { configured: false, connected: false, error: err.message || 'Koneksi ke server gagal' };
  }
}

// Update Aiven URL on backend
export async function setAivenConfigUrl(url: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    saveAivenUrl(url);
    const res = await fetch('/api/aiven/config-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan URL' };
  }
}

// USERS
export async function aivenFetchUsers(): Promise<User[] | null> {
  try {
    const res = await fetch('/api/aiven/users');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.configured) return null;
    return data.users || [];
  } catch {
    return null;
  }
}

export async function aivenSyncAndCleanUsers(users: User[]): Promise<boolean> {
  try {
    const res = await fetch('/api/aiven/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users, purgeOrphaned: true }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export async function aivenDeleteUser(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/aiven/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

// LOGS
export async function aivenFetchLogs(): Promise<KAIHEntry[] | null> {
  try {
    const res = await fetch('/api/aiven/logs');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.configured) return null;
    return data.logs || [];
  } catch {
    return null;
  }
}

export async function aivenSyncAndCleanLogs(logs: KAIHEntry[]): Promise<boolean> {
  try {
    const res = await fetch('/api/aiven/logs/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs, purgeOrphaned: true }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

// SCHOOL CONFIG
export async function aivenFetchSchoolConfig(): Promise<MonthlyReportConfig | null> {
  try {
    const res = await fetch('/api/aiven/school-config');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.configured) return null;
    return data.config || null;
  } catch {
    return null;
  }
}

export async function aivenSaveSchoolConfig(config: MonthlyReportConfig): Promise<boolean> {
  try {
    const res = await fetch('/api/aiven/school-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// BK NOTES
export async function aivenFetchBKNotes(): Promise<BKCounselingNote[] | null> {
  try {
    const res = await fetch('/api/aiven/bk-notes');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.configured) return null;
    return data.notes || [];
  } catch {
    return null;
  }
}

export async function aivenSaveBKNotes(notes: BKCounselingNote[]): Promise<boolean> {
  try {
    const res = await fetch('/api/aiven/bk-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// CUSTOM PASSWORDS
export async function aivenFetchCustomPasswords(): Promise<Record<string, string> | null> {
  try {
    const res = await fetch('/api/aiven/passwords');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.configured) return null;
    return data.passwords || {};
  } catch {
    return null;
  }
}

export async function aivenSaveCustomPassword(userId: string, pass: string): Promise<boolean> {
  try {
    const res = await fetch('/api/aiven/passwords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password: pass }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface AivenStats {
  usersCount: number;
  logsCount: number;
  configCount: number;
  bkNotesCount: number;
  passwordsCount: number;
}

export async function aivenFetchStats(): Promise<AivenStats | null> {
  try {
    const res = await fetch('/api/aiven/stats');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.configured || !data.stats) return null;
    return data.stats;
  } catch {
    return null;
  }
}
