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
    username: 'admin1',
    name: 'Admin 1',
    role: 'admin',
    adminTitle: 'Admin 1 (Utama)',
  },
  {
    id: 'adm-2',
    username: 'admin2',
    name: 'Admin 2',
    role: 'admin',
    adminTitle: 'Admin 2 (Kesiswaan)',
  },
  {
    id: 'adm-3',
    username: 'admin3',
    name: 'Admin 3',
    role: 'admin',
    adminTitle: 'Admin 3 (IT)',
  },
];

// Guru BK
export const INITIAL_GURU_BK: User[] = [
  {
    id: 'bk-1',
    username: 'gurubk1',
    name: 'Guru BK 1',
    role: 'guru_bk',
  },
  {
    id: 'bk-2',
    username: 'gurubk2',
    name: 'Guru BK 2',
    role: 'guru_bk',
  },
];

// 32 Real Wali Kelas from Image
export const INITIAL_WALI_KELAS: User[] = [
  { id: 'wk-7a', username: 'wk-7a', name: 'Tri Jumiati, S.Pd.', role: 'wali_kelas', assignedClass: '7A', nip: '199206262024212026' },
  { id: 'wk-7b', username: 'wk-7b', name: 'Sahril, S.Pd.', role: 'wali_kelas', assignedClass: '7B', nip: '198003312023211006' },
  { id: 'wk-7c', username: 'wk-7c', name: 'Greis Tumundo, M.Pd.', role: 'wali_kelas', assignedClass: '7C', nip: '197606162006042041' },
  { id: 'wk-7d', username: 'wk-7d', name: 'Dea Talitha Vashti Yumna, S.Pd.', role: 'wali_kelas', assignedClass: '7D', nip: '199807102024212020' },
  { id: 'wk-7e', username: 'wk-7e', name: 'Emerentiana Tulak Andi, S.Pd.', role: 'wali_kelas', assignedClass: '7E', nip: '200101232025212010' },
  { id: 'wk-7f', username: 'wk-7f', name: 'Fri Maulayanti, S.Kom.', role: 'wali_kelas', assignedClass: '7F', nip: '197802172022212002' },
  { id: 'wk-7g', username: 'wk-7g', name: 'Nida Amalia, S.Pd.', role: 'wali_kelas', assignedClass: '7G', nip: '199603222022212001' },
  { id: 'wk-7h', username: 'wk-7h', name: 'Aprillia, S.Pd.', role: 'wali_kelas', assignedClass: '7H', nip: '199904042024212009' },
  { id: 'wk-7i', username: 'wk-7i', name: 'Fani Rizki Aprianto, S.Pd.', role: 'wali_kelas', assignedClass: '7I', nip: '199004162025211012' },
  { id: 'wk-7j', username: 'wk-7j', name: 'Sukriani, S.Pd.', role: 'wali_kelas', assignedClass: '7J', nip: '197007152022212004' },
  { id: 'wk-7k', username: 'wk-7k', name: 'Khumayda Shofiyul Khaliyah, M.Pd.', role: 'wali_kelas', assignedClass: '7K', nip: '199410172024212009' },
  { id: 'wk-8a', username: 'wk-8a', name: 'Dewi Rezkyana Bahtiar, S.Pd.', role: 'wali_kelas', assignedClass: '8A', nip: '199806112024212007' },
  { id: 'wk-8b', username: 'wk-8b', name: 'Santi Dwi Safitri, S.Pd.', role: 'wali_kelas', assignedClass: '8B', nip: '198108282009032012' },
  { id: 'wk-8c', username: 'wk-8c', name: 'Yuslikhatun Arofati, S.Pd.', role: 'wali_kelas', assignedClass: '8C', nip: '196704181997022002' },
  { id: 'wk-8d', username: 'wk-8d', name: 'Kornelia Kondolele, S.Pd.', role: 'wali_kelas', assignedClass: '8D', nip: '198010062024212004' },
  { id: 'wk-8e', username: 'wk-8e', name: 'Anissa Mentari, S.Pd.', role: 'wali_kelas', assignedClass: '8E', nip: '199606122023212014' },
  { id: 'wk-8f', username: 'wk-8f', name: 'Charlyne Sterly Warouw, S.Pd. M.M.', role: 'wali_kelas', assignedClass: '8F', nip: '199110042025212050' },
  { id: 'wk-8g', username: 'wk-8g', name: 'Resi Mandalia, S.Pd.', role: 'wali_kelas', assignedClass: '8G', nip: '199204262023212019' },
  { id: 'wk-8h', username: 'wk-8h', name: 'Arfiana Herawati, S.Pd.', role: 'wali_kelas', assignedClass: '8H', nip: '198011162009032009' },
  { id: 'wk-8i', username: 'wk-8i', name: 'Diar Ramadhani, S.Pd.', role: 'wali_kelas', assignedClass: '8I', nip: '20260100020001' },
  { id: 'wk-8j', username: 'wk-8j', name: 'Aulia Indarti Iasah, S.Pd.', role: 'wali_kelas', assignedClass: '8J', nip: '199701102025212034' },
  { id: 'wk-8k', username: 'wk-8k', name: 'Heny Mardiana Nur, S.Pd.', role: 'wali_kelas', assignedClass: '8K', nip: '197512102022212002' },
  { id: 'wk-9a', username: 'wk-9a', name: 'Mendang Pasaribu, S.Pd.', role: 'wali_kelas', assignedClass: '9A', nip: '199306192023212011' },
  { id: 'wk-9b', username: 'wk-9b', name: 'Muhammad Ansar .B., S.Pd.', role: 'wali_kelas', assignedClass: '9B', nip: '197404142014071004' },
  { id: 'wk-9c', username: 'wk-9c', name: 'Riezko Dwi Gusfarda, S.Kom.', role: 'wali_kelas', assignedClass: '9C', nip: '199608252024211003' },
  { id: 'wk-9d', username: 'wk-9d', name: 'Idris Palulla, S.Pd.', role: 'wali_kelas', assignedClass: '9D', nip: '197212192001121001' },
  { id: 'wk-9e', username: 'wk-9e', name: 'Indrawati, S.Pd.', role: 'wali_kelas', assignedClass: '9E', nip: '199003312023211006' },
  { id: 'wk-9f', username: 'wk-9f', name: 'Indra Novita Yuliana, S.Pd.', role: 'wali_kelas', assignedClass: '9F', nip: '198111162005022005' },
  { id: 'wk-9g', username: 'wk-9g', name: 'Wiwit Putri Mustikaningtyas, S.Pd.', role: 'wali_kelas', assignedClass: '9G', nip: '199111082023212010' },
  { id: 'wk-9h', username: 'wk-9h', name: 'Rizki Paramita Yulisna, S.Pd.', role: 'wali_kelas', assignedClass: '9H', nip: '198802152024212006' },
  { id: 'wk-9i', username: 'wk-9i', name: 'Atik Sri Hayati, S.Pd.', role: 'wali_kelas', assignedClass: '9I', nip: '196810231991032009' },
  { id: 'wk-9j', username: 'wk-9j', name: 'Lukito, S.Ag.', role: 'wali_kelas', assignedClass: '9J', nip: '196806222005011003' },
];

// Sample Students (Cleared - only CAPITAL LETTER real student data is retained)
export const INITIAL_STUDENTS: User[] = [];

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
