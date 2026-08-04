import React, { useState, useEffect } from 'react';
import {
  Sun, Sparkles, Dumbbell, Apple, BookOpen, Users, Moon,
  CheckCircle2, Clock, Calendar, Save, AlertCircle, FileText, Check, Award
} from 'lucide-react';
import { User, KAIHEntry, Agama, SholatWaktuStatus, NonIslamIbadah } from '../../types';
import { getStoredLogs, addOrUpdateLog, getStoredSchoolConfig, getStoredUsers } from '../../services/storage';
import { DailyPieChart } from '../charts/DailyPieChart';
import { DailyBarChart } from '../charts/DailyBarChart';
import { MonthlyLineChart } from '../charts/MonthlyLineChart';
import { MonthlyReportModal } from '../reports/MonthlyReportModal';

interface StudentDashboardProps {
  currentUser: User;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [logs, setLogs] = useState<KAIHEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<KAIHEntry | null>(null);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Form State
  const [bangunPagiChecked, setBangunPagiChecked] = useState(false);
  const [jamBangun, setJamBangun] = useState('05:00');
  const [bangunNotes, setBangunNotes] = useState('');

  const [beribadahChecked, setBeribadahChecked] = useState(false);
  const [selectedAgama, setSelectedAgama] = useState<Agama>(currentUser.agama || 'Islam');
  const [sholatIslam, setSholatIslam] = useState<SholatWaktuStatus>({
    subuh: { checked: false, time: '05:00' },
    dzuhur: { checked: false, time: '12:15' },
    ashar: { checked: false, time: '15:30' },
    maghrib: { checked: false, time: '18:20' },
    isya: { checked: false, time: '19:30' },
  });
  const [nonIslamData, setNonIslamData] = useState<NonIslamIbadah>({
    saatTeduhChecked: false,
    bacaKitabChecked: false,
    ibadahGerejaChecked: false,
    catatanRenungan: '',
  });

  const [olahragaChecked, setOlahragaChecked] = useState(false);
  const [jenisOlahraga, setJenisOlahraga] = useState('');
  const [durasiOlahraga, setDurasiOlahraga] = useState(20);
  const [olahragaNotes, setOlahragaNotes] = useState('');

  const [makanChecked, setMakanChecked] = useState(false);
  const [menuMakanan, setMenuMakanan] = useState('');
  const [makanNotes, setMakanNotes] = useState('');

  const [belajarChecked, setBelajarChecked] = useState(false);
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [topikBelajar, setTopikBelajar] = useState('');
  const [durasiBelajar, setDurasiBelajar] = useState(45);
  const [belajarNotes, setBelajarNotes] = useState('');

  const [masyarakatChecked, setMasyarakatChecked] = useState(false);
  const [kegiatanMasyarakat, setKegiatanMasyarakat] = useState('');
  const [masyarakatNotes, setMasyarakatNotes] = useState('');

  const [tidurChecked, setTidurChecked] = useState(false);
  const [jamTidur, setJamTidur] = useState('21:00');
  const [tidurNotes, setTidurNotes] = useState('');

  const isLoadedRef = React.useRef(false);
  const isSelfSavingRef = React.useRef(false);

  // Load logs on mount and when date changes or when data updates remotely
  useEffect(() => {
    isLoadedRef.current = false;
    const loadLogs = () => {
      const allLogs = getStoredLogs();
      const uId = currentUser.id ? currentUser.id.trim().toLowerCase() : '';
      const uUsername = currentUser.username ? currentUser.username.trim().toLowerCase() : '';
      const uName = currentUser.name ? currentUser.name.trim().toLowerCase() : '';

      const myLogs = allLogs.filter((l) => {
        if (!l.studentId) return false;
        const target = l.studentId.trim().toLowerCase();
        return (
          target === uId ||
          (uUsername && target === uUsername) ||
          (uName && target === uName) ||
          (l.id && uId && l.id.toLowerCase().includes(uId))
        );
      });
      setLogs(myLogs);

      // Skip resetting form controls if the update was triggered by local student edits
      if (isSelfSavingRef.current) {
        return;
      }

      const existing = myLogs.find((l) => l.date === selectedDate);
      if (existing) {
        setCurrentEntry(existing);
        setBangunPagiChecked(existing.bangunPagi?.checked || false);
        setJamBangun(existing.bangunPagi?.jamBangun || '05:00');
        setBangunNotes(existing.bangunPagi?.keterangan || '');

        setBeribadahChecked(existing.beribadah?.checked || false);
        setSelectedAgama(existing.beribadah?.agama || currentUser.agama || 'Islam');
        if (existing.beribadah?.sholatIslam) {
          setSholatIslam(existing.beribadah.sholatIslam);
        }
        if (existing.beribadah?.nonIslamData) {
          setNonIslamData(existing.beribadah.nonIslamData);
        }

        setOlahragaChecked(existing.berolahraga?.checked || false);
        setJenisOlahraga(existing.berolahraga?.jenisOlahraga || '');
        setDurasiOlahraga(existing.berolahraga?.durasiMenit || 20);
        setOlahragaNotes(existing.berolahraga?.keterangan || '');

        setMakanChecked(existing.makanSehat?.checked || false);
        setMenuMakanan(existing.makanSehat?.menuMakanan || '');
        setMakanNotes(existing.makanSehat?.keterangan || '');

        setBelajarChecked(existing.gemarBelajar?.checked || false);
        setMataPelajaran(existing.gemarBelajar?.mataPelajaran || '');
        setTopikBelajar(existing.gemarBelajar?.topikDipelajari || '');
        setDurasiBelajar(existing.gemarBelajar?.durasiMenit || 45);
        setBelajarNotes(existing.gemarBelajar?.keterangan || '');

        setMasyarakatChecked(existing.bermasyarakat?.checked || false);
        setKegiatanMasyarakat(existing.bermasyarakat?.kegiatan || '');
        setMasyarakatNotes(existing.bermasyarakat?.keterangan || '');

        setTidurChecked(existing.tidurCepat?.checked || false);
        setJamTidur(existing.tidurCepat?.jamTidur || '21:00');
        setTidurNotes(existing.tidurCepat?.keterangan || '');
      } else {
        setCurrentEntry(null);
        // reset defaults
        setBangunPagiChecked(false);
        setBeribadahChecked(false);
        setOlahragaChecked(false);
        setMakanChecked(false);
        setBelajarChecked(false);
        setMasyarakatChecked(false);
        setTidurChecked(false);
      }

      setTimeout(() => {
        isLoadedRef.current = true;
      }, 400);
    };

    loadLogs();
    const handleDataUpdated = () => {
      if (isSelfSavingRef.current) return;
      loadLogs();
    };

    window.addEventListener('kaih_data_updated', handleDataUpdated);
    return () => {
      window.removeEventListener('kaih_data_updated', handleDataUpdated);
    };
  }, [currentUser.id, selectedDate]);

  // Build current KAIH entry object
  const buildCurrentEntry = (): KAIHEntry => {
    let completedCount = 0;
    if (bangunPagiChecked) completedCount++;
    if (beribadahChecked) completedCount++;
    if (olahragaChecked) completedCount++;
    if (makanChecked) completedCount++;
    if (belajarChecked) completedCount++;
    if (masyarakatChecked) completedCount++;
    if (tidurChecked) completedCount++;

    const pct = Math.round((completedCount / 7) * 100);
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    return {
      id: currentEntry?.id || `log-${currentUser.id}-${selectedDate}`,
      studentId: currentUser.id,
      date: selectedDate,
      fillTimestamp: new Date().toISOString(),
      bangunPagi: {
        checked: bangunPagiChecked,
        jamBangun,
        fillTime: nowTime,
        keterangan: bangunNotes,
      },
      beribadah: {
        checked: beribadahChecked,
        agama: selectedAgama,
        sholatIslam: selectedAgama === 'Islam' ? sholatIslam : undefined,
        nonIslamData: selectedAgama !== 'Islam' ? nonIslamData : undefined,
        keterangan: 'Telah melaksanakan ibadah harian.',
      },
      berolahraga: {
        checked: olahragaChecked,
        jenisOlahraga,
        durasiMenit: Number(durasiOlahraga),
        keterangan: olahragaNotes,
      },
      makanSehat: {
        checked: makanChecked,
        menuMakanan,
        keterangan: makanNotes,
      },
      gemarBelajar: {
        checked: belajarChecked,
        mataPelajaran,
        topikDipelajari: topikBelajar,
        durasiMenit: Number(durasiBelajar),
        keterangan: belajarNotes,
      },
      bermasyarakat: {
        checked: masyarakatChecked,
        kegiatan: kegiatanMasyarakat,
        keterangan: masyarakatNotes,
      },
      tidurCepat: {
        checked: tidurChecked,
        jamTidur,
        fillTime: nowTime,
        keterangan: tidurNotes,
      },
      completedCount,
      scorePercentage: pct,
    };
  };

  // Realtime Auto-Sync on any checklist toggle/input change (debounced)
  useEffect(() => {
    if (!isLoadedRef.current) return;
    const timer = setTimeout(() => {
      isSelfSavingRef.current = true;
      const newEntry = buildCurrentEntry();
      const updated = addOrUpdateLog(newEntry);
      setLogs(updated.filter((l) => l.studentId === currentUser.id));
      setCurrentEntry(newEntry);
      setTimeout(() => {
        isSelfSavingRef.current = false;
      }, 150);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    bangunPagiChecked, jamBangun, bangunNotes,
    beribadahChecked, selectedAgama, sholatIslam, nonIslamData,
    olahragaChecked, jenisOlahraga, durasiOlahraga, olahragaNotes,
    makanChecked, menuMakanan, makanNotes,
    belajarChecked, mataPelajaran, topikBelajar, durasiBelajar, belajarNotes,
    masyarakatChecked, kegiatanMasyarakat, masyarakatNotes,
    tidurChecked, jamTidur, tidurNotes
  ]);

  // Handle Manual Save Button Click (shows toast)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    isSelfSavingRef.current = true;
    const newEntry = buildCurrentEntry();
    const updated = addOrUpdateLog(newEntry);
    setLogs(updated.filter((l) => l.studentId === currentUser.id));
    setCurrentEntry(newEntry);

    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      isSelfSavingRef.current = false;
    }, 3000);
  };

  const schoolConfig = getStoredSchoolConfig();
  const currentMonthNum = Number(selectedDate.split('-')[1]) || 7;
  const currentYearNum = Number(selectedDate.split('-')[0]) || 2026;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Banner */}
      {isSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-xs font-bold">Data 7 KAIH Berhasil Disimpan & Sinkron ke Firestore!</span>
        </div>
      )}

      {/* Hero Student Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-800">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" /> Portal Siswa Kelas {currentUser.assignedClass}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Halo, {currentUser.name}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 max-w-xl">
            Mari lengkapi 7 Kebiasaan Anak Indonesia Hebat hari ini. Karakter hebat dimulai dari disiplin kecil setiap harinya!
          </p>
        </div>

        {/* Date Selector & Report Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-800/90 p-3 rounded-xl border border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-extrabold rounded-lg transition-all shadow-md w-full sm:w-auto justify-center"
          >
            <FileText className="w-4 h-4" />
            <span>Laporan Bulanan PDF / Excel</span>
          </button>
        </div>
      </div>

      {/* Daily & Monthly Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Donut/Pie Chart */}
        <DailyPieChart
          completedCount={currentEntry?.completedCount || 0}
          title="Grafik Bulat (7 KAIH Hari Ini)"
        />

        {/* Daily Bar Chart */}
        <div className="lg:col-span-2 flex">
          <DailyBarChart entry={currentEntry} title="Grafik Batang (Status 7 Kebiasaan Hari Ini)" />
        </div>
      </div>

      {/* Monthly Line Chart */}
      <MonthlyLineChart logs={logs} studentName={currentUser.name} />

      {/* 7 KAIH Checklist Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              Checklist 7 KAIH Tanggal {selectedDate}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Tersimpan & Realtime Sinkron ke Firestore Database (Dapat Dipantau Wali Kelas & Guru BK)
              </span>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 self-start sm:self-center">
            Terisi: {currentEntry?.completedCount || 0} / 7 Aktivitas
          </span>
        </div>

        <form onSubmit={handleSaveForm} className="space-y-6">
          {/* 1. Bangun Pagi */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bangunPagiChecked}
                  onChange={(e) => setBangunPagiChecked(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500 text-white rounded-lg">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">1. Bangun Pagi</h3>
                    <p className="text-[11px] text-slate-500">Realtime waktu bangun & merapikan tempat tidur</p>
                  </div>
                </div>
              </label>

              <div className="flex items-center gap-2 text-xs font-medium bg-white px-3 py-1 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Jam Bangun:</span>
                <input
                  type="time"
                  value={jamBangun}
                  onChange={(e) => setJamBangun(e.target.value)}
                  className="font-bold text-slate-800 border-none bg-transparent outline-none"
                />
              </div>
            </div>

            <input
              type="text"
              value={bangunNotes}
              onChange={(e) => setBangunNotes(e.target.value)}
              placeholder="Catatan tambahan (misal: Merapikan seprai, minum air hangat)"
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 2. Beribadah */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beribadahChecked}
                  onChange={(e) => setBeribadahChecked(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">2. Beribadah Tepat Waktu</h3>
                    <p className="text-[11px] text-slate-500">Sesuai ajaran agama masing-masing</p>
                  </div>
                </div>
              </label>

              {/* Religion Selector */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-slate-600">Agama:</span>
                <select
                  value={selectedAgama}
                  onChange={(e) => setSelectedAgama(e.target.value as Agama)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Khonghucu">Khonghucu</option>
                </select>
              </div>
            </div>

            {/* Sub-form based on Religion */}
            {selectedAgama === 'Islam' ? (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-emerald-800 mb-2">Checklist 5 Waktu Sholat & Jam Pelaksanaan:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const).map((waktu) => {
                    const st = sholatIslam[waktu];
                    return (
                      <div key={waktu} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <label className="flex items-center gap-1.5 font-bold capitalize text-slate-700 cursor-pointer mb-1">
                          <input
                            type="checkbox"
                            checked={st.checked}
                            onChange={(e) => {
                              setSholatIslam((prev) => ({
                                ...prev,
                                [waktu]: { ...prev[waktu], checked: e.target.checked },
                              }));
                            }}
                            className="rounded text-emerald-600"
                          />
                          <span>{waktu}</span>
                        </label>
                        <input
                          type="time"
                          value={st.time}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSholatIslam((prev) => ({
                              ...prev,
                              [waktu]: { ...prev[waktu], time: val },
                            }));
                          }}
                          className="w-full text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none font-semibold text-slate-800"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-emerald-800 mb-2">Ibadah & Renungan ({selectedAgama}):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nonIslamData.saatTeduhChecked}
                      onChange={(e) => setNonIslamData({ ...nonIslamData, saatTeduhChecked: e.target.checked })}
                    />
                    <span>Saat Teduh / Meditasi</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nonIslamData.bacaKitabChecked}
                      onChange={(e) => setNonIslamData({ ...nonIslamData, bacaKitabChecked: e.target.checked })}
                    />
                    <span>Baca Kitab Suci</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nonIslamData.ibadahGerejaChecked}
                      onChange={(e) => setNonIslamData({ ...nonIslamData, ibadahGerejaChecked: e.target.checked })}
                    />
                    <span>Ibadah Gereja / Pura / Vihara</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={nonIslamData.catatanRenungan}
                  onChange={(e) => setNonIslamData({ ...nonIslamData, catatanRenungan: e.target.value })}
                  placeholder="Catatan ayat / ringkasan renungan hari ini"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>
            )}
          </div>

          {/* 3. Berolahraga */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={olahragaChecked}
                  onChange={(e) => setOlahragaChecked(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">3. Berolahraga</h3>
                    <p className="text-[11px] text-slate-500">Menjaga kebugaran jasmani harian</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={jenisOlahraga}
                onChange={(e) => setJenisOlahraga(e.target.value)}
                placeholder="Jenis Olahraga (cth: Lari Pagi, Senam, Badminton)"
                className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500">Durasi (Menit):</span>
                <input
                  type="number"
                  value={durasiOlahraga}
                  onChange={(e) => setDurasiOlahraga(Number(e.target.value))}
                  className="w-16 font-bold text-slate-800 border-none bg-transparent outline-none"
                />
              </div>
              <input
                type="text"
                value={olahragaNotes}
                onChange={(e) => setOlahragaNotes(e.target.value)}
                placeholder="Catatan tambahan"
                className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* 4. Makan Sehat */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={makanChecked}
                  onChange={(e) => setMakanChecked(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded border-slate-300 focus:ring-green-500"
                />
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-600 text-white rounded-lg">
                    <Apple className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">4. Makan Sehat dan Bergizi</h3>
                    <p className="text-[11px] text-slate-500">4 Sehat 5 Sempurna & Sarapan Pagi</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={menuMakanan}
                onChange={(e) => setMenuMakanan(e.target.value)}
                placeholder="Menu Makanan (cth: Nasi, Sayur Bening, Tempe, Telur, Buah Pisang)"
                className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
              <input
                type="text"
                value={makanNotes}
                onChange={(e) => setMakanNotes(e.target.value)}
                placeholder="Catatan tambahan"
                className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* 5. Gemar Belajar */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={belajarChecked}
                  onChange={(e) => setBelajarChecked(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 text-white rounded-lg">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">5. Gemar Belajar</h3>
                    <p className="text-[11px] text-slate-500">Membaca buku, mengulang materi, tugas sekolah</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={mataPelajaran}
                onChange={(e) => setMataPelajaran(e.target.value)}
                placeholder="Mata Pelajaran (cth: IPA, Matematika)"
                className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
              <input
                type="text"
                value={topikBelajar}
                onChange={(e) => setTopikBelajar(e.target.value)}
                placeholder="Topik / Materi (cth: Bab Ekosistem Lingkungan)"
                className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500">Durasi:</span>
                <input
                  type="number"
                  value={durasiBelajar}
                  onChange={(e) => setDurasiBelajar(Number(e.target.value))}
                  className="w-16 font-bold text-slate-800 border-none bg-transparent outline-none"
                />
                <span>menit</span>
              </div>
            </div>
          </div>

          {/* 6. Bermasyarakat */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={masyarakatChecked}
                  onChange={(e) => setMasyarakatChecked(e.target.checked)}
                  className="w-5 h-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-600 text-white rounded-lg">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">6. Bermasyarakat</h3>
                    <p className="text-[11px] text-slate-500">Membantu orang tua & kegiatan sosial RT/lingkungan</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={kegiatanMasyarakat}
                onChange={(e) => setKegiatanMasyarakat(e.target.value)}
                placeholder="Kegiatan Sosial / Rumah (cth: Membantu ibu memasak, menyapu rumah)"
                className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
              <input
                type="text"
                value={masyarakatNotes}
                onChange={(e) => setMasyarakatNotes(e.target.value)}
                placeholder="Catatan tambahan"
                className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* 7. Tidur Cepat */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tidurChecked}
                  onChange={(e) => setTidurChecked(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-700 text-white rounded-lg">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">7. Tidur Cepat</h3>
                    <p className="text-[11px] text-slate-500">Realtime jam tidur malam (sebelum jam 21:30)</p>
                  </div>
                </div>
              </label>

              <div className="flex items-center gap-2 text-xs font-medium bg-white px-3 py-1 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Jam Tidur:</span>
                <input
                  type="time"
                  value={jamTidur}
                  onChange={(e) => setJamTidur(e.target.value)}
                  className="font-bold text-slate-800 border-none bg-transparent outline-none"
                />
              </div>
            </div>

            <input
              type="text"
              value={tidurNotes}
              onChange={(e) => setTidurNotes(e.target.value)}
              placeholder="Catatan tambahan (misal: Matikan HP jam 21:00)"
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
            />
          </div>

          {/* Submit Save Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Data 7 KAIH Hari Ini</span>
            </button>
          </div>
        </form>
      </div>

      {/* Monthly Report Modal */}
      {showReportModal && (
        <MonthlyReportModal
          student={currentUser}
          logs={logs}
          month={currentMonthNum}
          year={currentYearNum}
          config={{
            ...schoolConfig,
            namaWaliKelas: getStoredUsers().find((u) => u.role === 'wali_kelas' && u.assignedClass === currentUser.assignedClass)?.name || schoolConfig.namaWaliKelas,
            nipWaliKelas: getStoredUsers().find((u) => u.role === 'wali_kelas' && u.assignedClass === currentUser.assignedClass)?.nip || schoolConfig.nipWaliKelas,
          }}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};
