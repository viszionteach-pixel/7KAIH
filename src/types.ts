export type Role = 'admin' | 'guru_bk' | 'wali_kelas' | 'siswa';

export type ClassLevel = '7' | '8' | '9';

export type ClassName = 
  | '7A' | '7B' | '7C' | '7D' | '7E' | '7F' | '7G' | '7H' | '7I' | '7J' | '7K'
  | '8A' | '8B' | '8C' | '8D' | '8E' | '8F' | '8G' | '8H' | '8I' | '8J' | '8K'
  | '9A' | '9B' | '9C' | '9D' | '9E' | '9F' | '9G' | '9H' | '9I' | '9J';

export type Agama = 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu';

export interface User {
  id: string;
  username: string; // nama lengkap for siswa or username for teachers/admin
  name: string;
  role: Role;
  assignedClass?: ClassName; // For wali_kelas and siswa
  nisn?: string;
  nip?: string;
  agama?: Agama;
  adminTitle?: string; // e.g. "Admin Utama", "Admin Kesiswaan", "Admin Kurikulum & IT"
  avatarUrl?: string;
}

// 7 KAIH Habit details
export interface SholatWaktuStatus {
  subuh: { checked: boolean; time: string };
  dzuhur: { checked: boolean; time: string };
  ashar: { checked: boolean; time: string };
  maghrib: { checked: boolean; time: string };
  isya: { checked: boolean; time: string };
}

export interface NonIslamIbadah {
  saatTeduhChecked: boolean;
  bacaKitabChecked: boolean;
  ibadahGerejaChecked: boolean;
  catatanRenungan: string;
}

export interface KAIHEntry {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  fillTimestamp: string; // ISO String or readable time HH:mm
  
  // 1. Bangun Pagi
  bangunPagi: {
    checked: boolean;
    jamBangun: string; // HH:mm
    fillTime: string; // HH:mm
    keterangan?: string;
  };
  
  // 2. Beribadah
  beribadah: {
    checked: boolean;
    agama: Agama;
    sholatIslam?: SholatWaktuStatus;
    nonIslamData?: NonIslamIbadah;
    keterangan?: string;
  };
  
  // 3. Berolahraga
  berolahraga: {
    checked: boolean;
    jenisOlahraga: string;
    durasiMenit: number;
    keterangan?: string;
  };

  // 4. Makan Sehat & Bergizi
  makanSehat: {
    checked: boolean;
    menuMakanan: string;
    keterangan?: string;
  };

  // 5. Gemar Belajar
  gemarBelajar: {
    checked: boolean;
    mataPelajaran: string;
    topikDipelajari: string;
    durasiMenit: number;
    keterangan?: string;
  };

  // 6. Bermasyarakat
  bermasyarakat: {
    checked: boolean;
    kegiatan: string;
    keterangan?: string;
  };

  // 7. Tidur Cepat
  tidurCepat: {
    checked: boolean;
    jamTidur: string; // HH:mm
    fillTime: string; // HH:mm
    keterangan?: string;
  };

  // Overall calculations
  scorePercentage: number; // 0 - 100%
  completedCount: number; // 0 - 7
}

export interface BKCounselingNote {
  id: string;
  studentId: string;
  guruBkId: string;
  date: string;
  catatan: string;
  tindakanLanjut: string;
}

export interface MonthlyReportConfig {
  month: number; // 1-12
  year: number;
  namaWaliKelas: string;
  nipWaliKelas?: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah?: string;
  namaSekolah?: string;
  alamatSekolah?: string;
  logoUrl?: string;
  stempelUrl?: string;
}
