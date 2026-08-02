import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, KAIHEntry, MonthlyReportConfig, BKCounselingNote } from '../types';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || metaEnv.SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.SUPABASE_PUBLISHABLE_KEY || metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || metaEnv.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function handleSupabaseError(error: unknown, action: string) {
  console.warn(`[Supabase ${action}]`, error);
}

// ================= USERS =================
export async function supabaseSaveUsers(users: User[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = users.map((u) => ({
      id: u.id,
      data: u,
      username: u.username,
      name: u.name,
      role: u.role,
      assigned_class: u.assignedClass || null,
      nisn: u.nisn || null,
      nip: u.nip || null,
      agama: u.agama || 'Islam',
      admin_title: u.adminTitle || null,
      avatar_url: u.avatarUrl || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('kaih_users').upsert(payload, { onConflict: 'id' });
    if (error) {
      handleSupabaseError(error, 'Save Users');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, 'Save Users');
    return false;
  }
}

export async function supabaseDeleteUser(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('kaih_users').delete().eq('id', userId);
    if (error) handleSupabaseError(error, 'Delete User');
    return !error;
  } catch (err) {
    handleSupabaseError(err, 'Delete User');
    return false;
  }
}

export async function supabaseFetchUsers(): Promise<User[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('kaih_users').select('*');
    if (error) {
      handleSupabaseError(error, 'Fetch Users');
      return null;
    }
    if (!data) return null;

    return data.map((row) => {
      if (row.data) {
        const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        if (parsed && parsed.id && parsed.name) {
          return parsed as User;
        }
      }
      return {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        assignedClass: row.assigned_class || undefined,
        nisn: row.nisn || undefined,
        nip: row.nip || undefined,
        agama: row.agama || 'Islam',
        adminTitle: row.admin_title || undefined,
        avatarUrl: row.avatar_url || undefined,
      } as User;
    });
  } catch (err) {
    handleSupabaseError(err, 'Fetch Users');
    return null;
  }
}

// ================= LOGS =================
export async function supabaseSaveLogs(logs: KAIHEntry[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = logs.map((l) => ({
      id: l.id,
      student_id: l.studentId,
      date: l.date,
      fill_timestamp: l.fillTimestamp,
      data_json: JSON.stringify(l),
      data: l,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('kaih_logs').upsert(payload, { onConflict: 'id' });
    if (error) {
      handleSupabaseError(error, 'Save Logs');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, 'Save Logs');
    return false;
  }
}

export async function supabaseFetchLogs(): Promise<KAIHEntry[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('kaih_logs').select('*');
    if (error) {
      handleSupabaseError(error, 'Fetch Logs');
      return null;
    }
    if (!data) return null;

    return data
      .map((row) => {
        try {
          if (row.data) return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          if (row.data_json) return typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
          return null;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as KAIHEntry[];
  } catch (err) {
    handleSupabaseError(err, 'Fetch Logs');
    return null;
  }
}

// ================= SCHOOL CONFIG =================
export async function supabaseSaveSchoolConfig(config: MonthlyReportConfig): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = {
      id: 'main_config',
      data_json: JSON.stringify(config),
      data: config,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('kaih_school_config').upsert(payload, { onConflict: 'id' });
    if (error) {
      handleSupabaseError(error, 'Save School Config');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, 'Save School Config');
    return false;
  }
}

export async function supabaseFetchSchoolConfig(): Promise<MonthlyReportConfig | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('kaih_school_config').select('*').eq('id', 'main_config').single();
    if (error) {
      handleSupabaseError(error, 'Fetch School Config');
      return null;
    }
    if (!data) return null;
    try {
      if (data.data) return typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      if (data.data_json) return typeof data.data_json === 'string' ? JSON.parse(data.data_json) : data.data_json;
      return null;
    } catch {
      return null;
    }
  } catch (err) {
    handleSupabaseError(err, 'Fetch School Config');
    return null;
  }
}

// ================= BK NOTES =================
export async function supabaseSaveBKNotes(notes: BKCounselingNote[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = notes.map((n) => ({
      id: n.id,
      student_id: n.studentId,
      guru_bk_id: n.guruBkId,
      date: n.date,
      catatan: n.catatan,
      tindakan_lanjut: n.tindakanLanjut,
      data: n,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('kaih_bk_notes').upsert(payload, { onConflict: 'id' });
    if (error) {
      handleSupabaseError(error, 'Save BK Notes');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, 'Save BK Notes');
    return false;
  }
}

export async function supabaseFetchBKNotes(): Promise<BKCounselingNote[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('kaih_bk_notes').select('*');
    if (error) {
      handleSupabaseError(error, 'Fetch BK Notes');
      return null;
    }
    if (!data) return null;
    return data.map((row) => {
      if (row.data) return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      return {
        id: row.id,
        studentId: row.student_id,
        guruBkId: row.guru_bk_id,
        date: row.date,
        catatan: row.catatan,
        tindakanLanjut: row.tindakan_lanjut,
      };
    });
  } catch (err) {
    handleSupabaseError(err, 'Fetch BK Notes');
    return null;
  }
}

// ================= CUSTOM PASSWORDS =================
export async function supabaseSaveCustomPassword(userId: string, pass: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = {
      id: userId,
      password: pass,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('kaih_passwords').upsert(payload, { onConflict: 'id' });
    if (error) {
      handleSupabaseError(error, 'Save Custom Password');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, 'Save Custom Password');
    return false;
  }
}

export async function supabaseFetchCustomPasswords(): Promise<Record<string, string> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('kaih_passwords').select('*');
    if (error || !data) return null;
    const map: Record<string, string> = {};
    data.forEach((row) => {
      if (row.id && row.password) {
        map[row.id] = row.password;
      }
    });
    return map;
  } catch {
    return null;
  }
}

// ================= REALTIME SUBSCRIPTIONS =================
export function subscribeToSupabaseRealtime(onDataChanged: () => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('kaih-supabase-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => {
      onDataChanged();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

