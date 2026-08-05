import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, FileText, CheckCircle2, XCircle, Clock, Search,
  Award, ChevronRight, BarChart2, FileSpreadsheet, Printer, Upload, RefreshCw
} from 'lucide-react';
import { User, KAIHEntry, ClassName } from '../../types';
import { getStoredUsers, getStoredLogs, getStoredSchoolConfig, forceFetchFromCloud } from '../../services/storage';
import { DailyPieChart } from '../charts/DailyPieChart';
import { DailyBarChart, HABIT_NAMES } from '../charts/DailyBarChart';
import { MonthlyLineChart } from '../charts/MonthlyLineChart';
import { MonthlyReportModal } from '../reports/MonthlyReportModal';
import { ExportHabitsModal } from '../reports/ExportHabitsModal';
import { StudentImportModal } from '../admin/StudentImportModal';

interface WaliKelasDashboardProps {
  currentUser: User;
}

export const WaliKelasDashboard: React.FC<WaliKelasDashboardProps> = ({ currentUser }) => {
  const assignedClass: ClassName = currentUser.assignedClass || '7A';

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<User | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allLogs, setAllLogs] = useState<KAIHEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await forceFetchFromCloud();
    setAllUsers(getStoredUsers());
    setAllLogs(getStoredLogs());
    setTimeout(() => {
      setIsSyncing(false);
    }, 600);
  };

  useEffect(() => {
    const loadData = () => {
      setAllUsers(getStoredUsers());
      setAllLogs(getStoredLogs());
    };
    loadData();

    // Trigger instant cloud fetch on mount so latest student logs from Firestore are loaded
    forceFetchFromCloud().then(() => {
      loadData();
    });

    window.addEventListener('kaih_data_updated', loadData);
    return () => {
      window.removeEventListener('kaih_data_updated', loadData);
    };
  }, []);

  // Helper to normalize class names (e.g. '7A' vs '7 A')
  const normalizeClass = (cls?: string) => {
    if (!cls) return '';
    return cls.replace(/\s+/g, '').toUpperCase();
  };

  // Helper to match log to student
  const isStudentLog = (log: KAIHEntry, student: User) => {
    if (!student || !log) return false;
    const sId = student.id ? student.id.trim().toLowerCase() : '';
    const sUsername = student.username ? student.username.trim().toLowerCase() : '';
    const sName = student.name ? student.name.trim().toLowerCase() : '';
    const sNisn = student.nisn ? student.nisn.trim().toLowerCase() : '';

    const logStudentId = log.studentId ? log.studentId.trim().toLowerCase() : '';
    const logStudentName = (log as any).studentName ? (log as any).studentName.trim().toLowerCase() : '';
    const logAssignedClass = (log as any).assignedClass ? (log as any).assignedClass.trim().toUpperCase() : '';
    const logId = log.id ? log.id.toLowerCase() : '';

    if (logStudentId) {
      if (sId && logStudentId === sId) return true;
      if (sUsername && logStudentId === sUsername) return true;
      if (sName && logStudentId === sName) return true;
      if (sNisn && logStudentId === sNisn) return true;
    }

    if (logStudentName) {
      if (sName && logStudentName === sName) return true;
      if (sUsername && logStudentName === sUsername) return true;
    }

    if (sId && logId.includes(sId)) return true;
    if (sUsername && logId.includes(sUsername)) return true;

    if (
      logStudentName &&
      sName &&
      (logStudentName.includes(sName) || sName.includes(logStudentName)) &&
      logAssignedClass &&
      normalizeClass(student.assignedClass) === normalizeClass(logAssignedClass)
    ) {
      return true;
    }

    return false;
  };

  // Filter students belonging to this class
  const classStudents = React.useMemo(() => {
    const targetCls = normalizeClass(assignedClass);
    return allUsers.filter(
      (u) => u.role === 'siswa' && u.assignedClass && normalizeClass(u.assignedClass) === targetCls
    );
  }, [allUsers, assignedClass]);

  const filteredStudents = React.useMemo(() => {
    const sTerm = searchTerm.toLowerCase();
    return classStudents.filter((s) => s.name.toLowerCase().includes(sTerm));
  }, [classStudents, searchTerm]);

  // Filter logs for this class
  const classLogs = React.useMemo(() => {
    return allLogs.filter((l) =>
      classStudents.some((s) => isStudentLog(l, s))
    );
  }, [allLogs, classStudents]);

  const dailyClassLogs = React.useMemo(() => {
    return classLogs.filter((l) => l.date && l.date.trim() === selectedDate.trim());
  }, [classLogs, selectedDate]);

  // Daily statistics for this class
  const totalStudents = classStudents.length || 1;
  const filledStudentsCount = dailyClassLogs.length;

  const totalCompletedHabits = dailyClassLogs.reduce((acc, l) => acc + l.completedCount, 0);
  const totalPossibleDailyHabits = totalStudents * 7;
  const dailyAveragePct = Math.round((totalCompletedHabits / totalPossibleDailyHabits) * 100) || 0;
  const averageCompletedCount = Math.round((dailyAveragePct / 100) * 7);

  // Calculate percentage per habit for daily bar chart
  const aggregatedBarData = React.useMemo(() => {
    return HABIT_NAMES.map((h) => {
      let count = 0;
      dailyClassLogs.forEach((l) => {
        const isChecked = Boolean(
          h.key === 'bangunPagi' ? l.bangunPagi?.checked :
          h.key === 'beribadah' ? l.beribadah?.checked :
          h.key === 'berolahraga' ? l.berolahraga?.checked :
          h.key === 'makanSehat' ? l.makanSehat?.checked :
          h.key === 'gemarBelajar' ? l.gemarBelajar?.checked :
          h.key === 'bermasyarakat' ? l.bermasyarakat?.checked :
          l.tidurCepat?.checked
        );
        if (isChecked) count++;
      });

      const pct = Math.round((count / totalStudents) * 100);
      return {
        habit: h.label,
        percentage: pct,
      };
    });
  }, [dailyClassLogs, totalStudents]);

  const schoolConfig = getStoredSchoolConfig();
  const currentMonthNum = Number(selectedDate.split('-')[1]) || 7;
  const currentYearNum = Number(selectedDate.split('-')[0]) || 2026;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-600/40">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-200 border border-amber-300/30 rounded-full text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" /> Konsol Wali Kelas {assignedClass}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Monitoring Karakter Kelas {assignedClass}
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl">
            Wali Kelas: <strong>{currentUser.name}</strong> {currentUser.nip ? `(NIP. ${currentUser.nip})` : ''} • Memantau {classStudents.length} siswa terdaftar di Kelas {assignedClass}.
          </p>
        </div>

        {/* Controls: Sync Button & Date Selector */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl shadow transition-all"
            title="Sikronkan Data Terbaru dari Cloud Firestore"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Cloud'}</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-700">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-lg border border-slate-600 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Siswa Kelas</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{classStudents.length} Siswa</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Kelas {assignedClass} SMPN 10</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sudah Mengisi Hari Ini</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {filledStudentsCount} / {classStudents.length} Siswa
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {Math.round((filledStudentsCount / totalStudents) * 100)}% Kehadiran Presensi
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kepatuhan 7 KAIH Rata-Rata</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{dailyAveragePct}%</h3>
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
              {dailyAveragePct >= 75 ? 'Sangat Baik' : 'Perlu Didorong'}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <BarChart2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Daily & Monthly Charts for Wali Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Pie Chart */}
        <DailyPieChart
          completedCount={averageCompletedCount}
          title={`Grafik Bulat (Kepatuhan Kelas ${assignedClass})`}
        />

        {/* Daily Bar Chart */}
        <div className="lg:col-span-2 flex">
          <DailyBarChart
            aggregatedData={aggregatedBarData}
            title={`Grafik Batang (Rata-Rata 7 KAIH Kelas ${assignedClass})`}
          />
        </div>
      </div>

      {/* Class Monthly Trend */}
      <MonthlyLineChart
        logs={classLogs}
        title={`Grafik Tren Bulanan Kelas ${assignedClass} (0-100%)`}
      />

      {/* Student List & Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              Daftar Presensi & Laporan Siswa Kelas {assignedClass}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik nama siswa untuk mengunduh/mencetak Laporan Bulanan (PDF/Excel) lengkap TTD Wali Kelas & Kepsek.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
              title="Export Laporan Kebiasaan Siswa (CSV / Excel / PDF)"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV / PDF
            </button>

            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" /> Import Excel / PDF
            </button>

            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama siswa..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">No</th>
                <th className="py-3.5 px-6">Nama Siswa</th>
                <th className="py-3.5 px-6">Agama</th>
                <th className="py-3.5 px-6 text-center">Status Tanggal {selectedDate}</th>
                <th className="py-3.5 px-6 text-center">Capaian KAIH</th>
                <th className="py-3.5 px-6 text-right">Aksi Laporan Bulanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada siswa ditemukan di Kelas {assignedClass}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const studentLog = dailyClassLogs.find((l) => isStudentLog(l, student));

                  return (
                    <tr key={student.id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                        <div className="text-[11px] text-slate-500">Password default: {student.name.split(' ')[0]}123</div>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-700">{student.agama || 'Islam'}</td>
                      <td className="py-4 px-6 text-center">
                        {studentLog ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terisi ({studentLog.completedCount}/7)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> Belum Mengisi
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center font-extrabold text-sm">
                        {studentLog ? (
                          <span className={studentLog.scorePercentage >= 80 ? 'text-emerald-600' : 'text-slate-800'}>
                            {studentLog.scorePercentage}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedStudentForReport(student)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors shadow-sm text-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Cetak Laporan</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Report Modal */}
      {selectedStudentForReport && (
        <MonthlyReportModal
          student={selectedStudentForReport}
          logs={allLogs.filter((l) => isStudentLog(l, selectedStudentForReport))}
          month={currentMonthNum}
          year={currentYearNum}
          config={{
            ...schoolConfig,
            namaWaliKelas: currentUser.name,
            nipWaliKelas: currentUser.nip || schoolConfig.nipWaliKelas,
          }}
          isOpen={Boolean(selectedStudentForReport)}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}
      {/* Export Habits Modal */}
      <ExportHabitsModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        allLogs={allLogs}
        defaultClass={assignedClass}
      />

      {/* Student Import Modal */}
      <StudentImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        defaultClass={assignedClass}
        onSuccessImport={(count) => {
          setAllUsers(getStoredUsers());
          alert(`Berhasil mengimpor ${count} siswa baru ke Kelas ${assignedClass}!`);
        }}
      />
    </div>
  );
};
