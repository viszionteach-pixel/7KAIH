import { createClient } from '@supabase/supabase-js';
import { User, KAIHEntry, BKCounselingNote, MonthlyReportConfig } from '../types';
import {
  INITIAL_ADMINS,
  INITIAL_GURU_BK,
  INITIAL_WALI_KELAS,
  INITIAL_STUDENTS,
  INITIAL_KAIH_LOGS,
  INITIAL_SCHOOL_CONFIG,
} from '../data/initialData';

// -----------------------------------------------------------------------------
// Supabase client
// -----------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing configuration. Pastikan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY tersedia.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

// Table names
const USERS_TBL = 'kaih_users';
const LOGS_TBL = 'kaih_logs';
const CONFIG_TBL = 'kaih_school_config';
const PASSWORDS_TBL = 'kaih_passwords';
const BK_NOTES_TBL = 'kaih_bk_notes';

const nowISO = () => new Date().toISOString();

function logError(context: string, error: unknown) {
  const msg = error instanceof Error ? error.message : JSON.stringify(error);
  console.error(`[Supabase] ${context}:`, msg);
}

// -----------------------------------------------------------------------------
// 1. USERS
// -----------------------------------------------------------------------------
async function seedInitialUsers() {
  const allUsers = [
    ...INITIAL_ADMINS,
    ...INITIAL_GURU_BK,
    ...INITIAL_WALI_KELAS,
    ...INITIAL_STUDENTS,
  ];
  const rows = allUsers.map((u) => ({ id: u.id, data: u, updated_at: nowISO() }));
  const { error } = await supabase.from(USERS_TBL).upsert(rows);
  if (error) logError('seedInitialUsers', error);
}

export function subscribeToUsers(callback: (users: User[]) => void) {
  const fetchAll = async () => {
    const { data, error } = await supabase.from(USERS_TBL).select('data');
    if (error) {
      logError('subscribeToUsers.fetch', error);
      return;
    }
    if (!data || data.length === 0) {
      await seedInitialUsers();
      return; // realtime event will re-trigger fetchAll
    }
    callback(data.map((r) => r.data as User));
  };

  fetchAll();

  const channel = supabase
    .channel('kaih_users_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: USERS_TBL }, fetchAll)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function syncSaveUsers(users: User[]) {
  const rows = users.map((u) => ({ id: u.id, data: u, updated_at: nowISO() }));
  const { error } = await supabase.from(USERS_TBL).upsert(rows);
  if (error) logError('syncSaveUsers', error);
}

export async function syncSaveSingleUser(user: User) {
  const { error } = await supabase
    .from(USERS_TBL)
    .upsert({ id: user.id, data: user, updated_at: nowISO() });
  if (error) logError('syncSaveSingleUser', error);
}

export async function syncDeleteUser(userId: string) {
  const { error } = await supabase.from(USERS_TBL).delete().eq('id', userId);
  if (error) logError('syncDeleteUser', error);
}

// -----------------------------------------------------------------------------
// 2. LOGS
// -----------------------------------------------------------------------------
async function seedInitialLogs() {
  const rows = INITIAL_KAIH_LOGS.map((log) => ({
    id: log.id,
    student_id: log.studentId,
    date: log.date,
    data: log,
    updated_at: nowISO(),
  }));
  const { error } = await supabase.from(LOGS_TBL).upsert(rows);
  if (error) logError('seedInitialLogs', error);
}

export function subscribeToLogs(callback: (logs: KAIHEntry[]) => void) {
  const fetchAll = async () => {
    const { data, error } = await supabase.from(LOGS_TBL).select('data');
    if (error) {
      logError('subscribeToLogs.fetch', error);
      return;
    }
    if (!data || data.length === 0) {
      await seedInitialLogs();
      return;
    }
    callback(data.map((r) => r.data as KAIHEntry));
  };

  fetchAll();

  const channel = supabase
    .channel('kaih_logs_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: LOGS_TBL }, fetchAll)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function syncSaveLogs(logs: KAIHEntry[]) {
  const rows = logs.map((log) => ({
    id: log.id,
    student_id: log.studentId,
    date: log.date,
    data: log,
    updated_at: nowISO(),
  }));
  const { error } = await supabase.from(LOGS_TBL).upsert(rows);
  if (error) logError('syncSaveLogs', error);
}

export async function syncAddLog(log: KAIHEntry) {
  const { error } = await supabase.from(LOGS_TBL).upsert({
    id: log.id,
    student_id: log.studentId,
    date: log.date,
    data: log,
    updated_at: nowISO(),
  });
  if (error) logError('syncAddLog', error);
}

export async function syncDeleteLog(logId: string) {
  const { error } = await supabase.from(LOGS_TBL).delete().eq('id', logId);
  if (error) logError('syncDeleteLog', error);
}

// -----------------------------------------------------------------------------
// 3. SCHOOL CONFIG (single row keyed 'main')
// -----------------------------------------------------------------------------
export function subscribeToSchoolConfig(callback: (config: MonthlyReportConfig) => void) {
  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from(CONFIG_TBL)
      .select('data')
      .eq('id', 'main')
      .maybeSingle();
    if (error) {
      logError('subscribeToSchoolConfig.fetch', error);
      return;
    }
    if (!data) {
      const { error: insErr } = await supabase
        .from(CONFIG_TBL)
        .upsert({ id: 'main', data: INITIAL_SCHOOL_CONFIG, updated_at: nowISO() });
      if (insErr) logError('subscribeToSchoolConfig.seed', insErr);
      callback(INITIAL_SCHOOL_CONFIG);
      return;
    }
    callback(data.data as MonthlyReportConfig);
  };

  fetchConfig();

  const channel = supabase
    .channel('kaih_config_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: CONFIG_TBL }, fetchConfig)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function syncSaveSchoolConfig(config: MonthlyReportConfig) {
  const { error } = await supabase
    .from(CONFIG_TBL)
    .upsert({ id: 'main', data: config, updated_at: nowISO() });
  if (error) logError('syncSaveSchoolConfig', error);
}

// -----------------------------------------------------------------------------
// 4. CUSTOM PASSWORDS (keyed by user id)
// -----------------------------------------------------------------------------
export function subscribeToPasswords(callback: (passwords: Record<string, string>) => void) {
  const fetchAll = async () => {
    const { data, error } = await supabase
      .from(PASSWORDS_TBL)
      .select('user_id, password');
    if (error) {
      logError('subscribeToPasswords.fetch', error);
      return;
    }
    const passMap: Record<string, string> = {};
    (data || []).forEach((row: { user_id: string; password: string }) => {
      if (row.user_id && row.password) {
        passMap[row.user_id] = row.password;
      }
    });
    callback(passMap);
  };

  fetchAll();

  const channel = supabase
    .channel('kaih_passwords_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: PASSWORDS_TBL }, fetchAll)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function syncSaveCustomPassword(userId: string, pass: string) {
  const { error } = await supabase
    .from(PASSWORDS_TBL)
    .upsert({ user_id: userId, password: pass, updated_at: nowISO() });
  if (error) logError('syncSaveCustomPassword', error);
}

export async function syncDeletePassword(userId: string) {
  const { error } = await supabase.from(PASSWORDS_TBL).delete().eq('user_id', userId);
  if (error) logError('syncDeletePassword', error);
}

// -----------------------------------------------------------------------------
// 5. BK COUNSELING NOTES
// -----------------------------------------------------------------------------
export function subscribeToBKNotes(callback: (notes: BKCounselingNote[]) => void) {
  const fetchAll = async () => {
    const { data, error } = await supabase.from(BK_NOTES_TBL).select('data');
    if (error) {
      logError('subscribeToBKNotes.fetch', error);
      return;
    }
    callback((data || []).map((r) => r.data as BKCounselingNote));
  };

  fetchAll();

  const channel = supabase
    .channel('kaih_bk_notes_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: BK_NOTES_TBL }, fetchAll)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function syncSaveBKNote(note: BKCounselingNote) {
  const { error } = await supabase.from(BK_NOTES_TBL).upsert({
    id: note.id,
    student_id: note.studentId,
    guru_bk_id: note.guruBkId,
    data: note,
    updated_at: nowISO(),
  });
  if (error) logError('syncSaveBKNote', error);
}

export async function syncDeleteBKNote(noteId: string) {
  const { error } = await supabase.from(BK_NOTES_TBL).delete().eq('id', noteId);
  if (error) logError('syncDeleteBKNote', error);
}
