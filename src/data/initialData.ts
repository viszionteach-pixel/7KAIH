import { User, ClassName, KAIHEntry, Agama, MonthlyReportConfig } from '../types';

export const ALL_CLASSES: ClassName[] = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '7J', '7K',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '8J', '8K',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H', '9I', '9J'
];

export const INITIAL_SCHOOL_CONFIG: MonthlyReportConfig = {
  month: 7,
  year: 2026,
  namaWaliKelas: 'Endang Setyowati, S.Pd.',
  nipWaliKelas: '19750814 200212 2 003',
  namaKepalaSekolah: 'Drs. H. Ismail, M.Pd.',
  nipKepalaSekolah: '19680512 199403 1 005',
  namaSekolah: 'SMP NEGERI 10 BALIKPAPAN',
  alamatSekolah: 'Jl. Strat 3 No. 45, Gunung Samarinda, Kec. Balikpapan Utara, Kota Balikpapan, Kalimantan Timur 76125',
  logoUrl: '/logo_smpn10.jpg',
  stempelUrl: '',
};

// 3 Admins
export const INITIAL_ADMINS: User[] = [
  {
    id: 'adm-1',
    username: 'admin.utama',
    name: 'Drs. Bambang Hariyanto, M.Si',
    role: 'admin',
    adminTitle: 'Admin Utama (Konsol 1)',
  },
  {
    id: 'adm-2',
    username: 'admin.kesiswaan',
    name: 'Dra. Hj. Nurul Hidayah',
    role: 'admin',
    adminTitle: 'Admin Kesiswaan (Konsol 2)',
  },
  {
    id: 'adm-3',
    username: 'admin.it',
    name: 'Rahmat Hidayat, S.Pd., M.T.',
    role: 'admin',
    adminTitle: 'Admin IT & Data (Konsol 3)',
  },
];

// Guru BK
export const INITIAL_GURU_BK: User[] = [
  {
    id: 'bk-1',
    username: 'gurubk.utama',
    name: 'Siti Aminah, S.Pd., M.Psi.',
    role: 'guru_bk',
  },
  {
    id: 'bk-2',
    username: 'gurubk.dewi',
    name: 'Dewi Lestari, S.Psi.',
    role: 'guru_bk',
  },
];

// 32 Wali Kelas
export const INITIAL_WALI_KELAS: User[] = ALL_CLASSES.map((cls, idx) => {
  const teacherNames = [
    'Siti Rahmah, S.Pd.', 'Ahmad Fauzi, M.Pd.', 'Tri Astuti, S.Pd.', 'Budi Santoso, S.Pd.',
    'Hj. Maryam, M.Pd.', 'Dedi Kusnadi, S.Pd.', 'Eka Putri, S.Pd.', 'Fajar Nugraha, M.Pd.',
    'Gita Savitri, S.Pd.', 'Hadi Wijaya, S.Pd.', 'Indah Lestari, M.Pd.', 'Joko Widodo, S.Pd.',
    'Kusuma Wardani, S.Pd.', 'Lina Marlina, S.Pd.', 'M. Ridwan, S.Pd.', 'Neneng Hasanah, S.Pd.',
    'Oki Setiana, M.Pd.', 'Pratama Arhan, S.Pd.', 'Qori Sandioriva, S.Pd.', 'Rizky Febian, S.Pd.',
    'Sari Roti, S.Pd.', 'Taufik Hidayat, S.Pd.', 'Umar Bin Khattab, S.Pd.', 'Vina Panduwinata, S.Pd.',
    'Wahyu Hidayat, S.Pd.', 'Xavier Hernandez, S.Pd.', 'Yuni Shara, S.Pd.', 'Zainuddin MZ, S.Pd.',
    'Agus Yudhoyono, S.Pd.', 'Bintang Emon, S.Pd.', 'Cinta Laura, S.Pd.', 'Dono Warkop, S.Pd.'
  ];
  return {
    id: `wk-${cls.toLowerCase()}`,
    username: `walikelas.${cls.toLowerCase()}`,
    name: teacherNames[idx % teacherNames.length],
    role: 'wali_kelas' as const,
    assignedClass: cls,
  };
});

// Sample Students
export const INITIAL_STUDENTS: User[] = [
  // 7A Students
  { id: 'std-7a-1', username: 'Ahmad Fauzi', name: 'Ahmad Fauzi', role: 'siswa', assignedClass: '7A', agama: 'Islam' },
  { id: 'std-7a-2', username: 'Siti Nurhaliza', name: 'Siti Nurhaliza', role: 'siswa', assignedClass: '7A', agama: 'Islam' },
  { id: 'std-7a-3', username: 'Daniel Christian', name: 'Daniel Christian', role: 'siswa', assignedClass: '7A', agama: 'Kristen' },
  { id: 'std-7a-4', username: 'Budi Kurniawan', name: 'Budi Kurniawan', role: 'siswa', assignedClass: '7A', agama: 'Islam' },
  { id: 'std-7a-5', username: 'Maria Yosefina', name: 'Maria Yosefina', role: 'siswa', assignedClass: '7A', agama: 'Katolik' },
  { id: 'std-7a-6', username: 'Putu Wijaya', name: 'Putu Wijaya', role: 'siswa', assignedClass: '7A', agama: 'Hindu' },
  
  // 7B Students
  { id: 'std-7b-1', username: 'Rian Ardianto', name: 'Rian Ardianto', role: 'siswa', assignedClass: '7B', agama: 'Islam' },
  { id: 'std-7b-2', username: 'Clarissa Maharani', name: 'Clarissa Maharani', role: 'siswa', assignedClass: '7B', agama: 'Kristen' },

  // 8A Students
  { id: 'std-8a-1', username: 'Muhammad Rizky', name: 'Muhammad Rizky', role: 'siswa', assignedClass: '8A', agama: 'Islam' },
  { id: 'std-8a-2', username: 'Anisa Rahmawati', name: 'Anisa Rahmawati', role: 'siswa', assignedClass: '8A', agama: 'Islam' },

  // 8B Students
  { id: 'std-8b-1', username: 'Kevin Sanjaya', name: 'Kevin Sanjaya', role: 'siswa', assignedClass: '8B', agama: 'Kristen' },
  
  // 9A Students
  { id: 'std-9a-1', username: 'Fajar Alfian', name: 'Fajar Alfian', role: 'siswa', assignedClass: '9A', agama: 'Islam' },
  { id: 'std-9a-2', username: 'Nabila Syakieb', name: 'Nabila Syakieb', role: 'siswa', assignedClass: '9A', agama: 'Islam' },
  
  // 9J Students
  { id: 'std-9j-1', username: 'Zidane Iqbal', name: 'Zidane Iqbal', role: 'siswa', assignedClass: '9J', agama: 'Islam' },
];

// Helper to generate seed logs for past 10 days
function generateSeedLogs(): KAIHEntry[] {
  const logs: KAIHEntry[] = [];
  const today = new Date('2026-07-31');
  
  INITIAL_STUDENTS.forEach((student) => {
    // Generate logs for past 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Variations in compliance
      const isHighAchiever = student.id === 'std-7a-1' || student.id === 'std-7a-2' || student.id === 'std-9a-1';
      const isLowAchiever = student.id === 'std-7a-4';

      let scoreCount = 0;
      
      const bPagi = isLowAchiever ? (i % 2 === 0) : true;
      if (bPagi) scoreCount++;

      const bIbadah = isLowAchiever ? (i % 3 === 0) : true;
      if (bIbadah) scoreCount++;

      const bOlahraga = isHighAchiever ? true : (i % 2 === 0);
      if (bOlahraga) scoreCount++;

      const bMakan = isLowAchiever ? false : true;
      if (bMakan) scoreCount++;

      const bBelajar = isLowAchiever ? (i % 2 === 0) : true;
      if (bBelajar) scoreCount++;

      const bMasyarakat = i % 2 === 0 || isHighAchiever;
      if (bMasyarakat) scoreCount++;

      const bTidur = isHighAchiever ? true : (i % 2 !== 0);
      if (bTidur) scoreCount++;

      const scorePct = Math.round((scoreCount / 7) * 100);

      logs.push({
        id: `log-${student.id}-${dateStr}`,
        studentId: student.id,
        date: dateStr,
        fillTimestamp: `${dateStr}T06:30:00`,
        bangunPagi: {
          checked: bPagi,
          jamBangun: bPagi ? '04:45' : '06:30',
          fillTime: '06:30',
          keterangan: bPagi ? 'Bangun subuh segarkan badan dan merapikan tempat tidur' : 'Agak terlambat bangun',
        },
        beribadah: {
          checked: bIbadah,
          agama: student.agama || 'Islam',
          sholatIslam: student.agama === 'Islam' ? {
            subuh: { checked: bIbadah, time: '05:00' },
            dzuhur: { checked: bIbadah, time: '12:15' },
            ashar: { checked: bIbadah, time: '15:30' },
            maghrib: { checked: bIbadah, time: '18:20' },
            isya: { checked: bIbadah, time: '19:30' },
          } : undefined,
          nonIslamData: student.agama !== 'Islam' ? {
            saatTeduhChecked: bIbadah,
            bacaKitabChecked: bIbadah,
            ibadahGerejaChecked: i === 0 || i === 6,
            catatanRenungan: 'Renungan pagi tentang kasih dan kedisiplinan.',
          } : undefined,
          keterangan: 'Melaksanakan ibadah dengan khusyuk.',
        },
        berolahraga: {
          checked: bOlahraga,
          jenisOlahraga: bOlahraga ? (i % 2 === 0 ? 'Lari Pagi & Push up' : 'Senam Kesegaran Jasmani') : '',
          durasiMenit: bOlahraga ? 30 : 0,
          keterangan: bOlahraga ? 'Badan terasa segar dan bugar' : 'Tidak sempat berolahraga',
        },
        makanSehat: {
          checked: bMakan,
          menuMakanan: bMakan ? 'Nasi merah, sayur bening bayam, tempe goreng, dan buah pisang' : 'Makan mie instant',
          keterangan: bMakan ? 'Makan tepat waktu 4 sehat 5 sempurna' : 'Makan kurang bergizi',
        },
        gemarBelajar: {
          checked: bBelajar,
          mataPelajaran: bBelajar ? 'IPA & Matematika' : '',
          topikDipelajari: bBelajar ? 'Bab Ekosistem Lingkungan & Persamaan Linear' : '',
          durasiMenit: bBelajar ? 45 : 0,
          keterangan: bBelajar ? 'Membaca buku modul SMPN 10 dan latihan soal' : '',
        },
        bermasyarakat: {
          checked: bMasyarakat,
          kegiatan: bMasyarakat ? 'Membantu orang tua menyapu halaman & menyapa tetangga' : '',
          keterangan: bMasyarakat ? 'Gotong royong di lingkungan rumah' : '',
        },
        tidurCepat: {
          checked: bTidur,
          jamTidur: bTidur ? '21:00' : '23:30',
          fillTime: '21:05',
          keterangan: bTidur ? 'Tidur tepat waktu tanpa gadget' : 'Begadang main hp',
        },
        completedCount: scoreCount,
        scorePercentage: scorePct,
      });
    }
  });

  return logs;
}

export const INITIAL_KAIH_LOGS = generateSeedLogs();
