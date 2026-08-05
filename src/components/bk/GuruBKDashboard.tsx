import React, { useState, useEffect } from 'react';
import {
  Users, AlertTriangle, Search, Filter, MessageSquare, CheckCircle2,
  BookOpen, Award, FileText, Plus, HeartHandshake, FileSpreadsheet
} from 'lucide-react';
import { User, KAIHEntry, BKCounselingNote, ClassName } from '../../types';
import { getStoredUsers, getStoredLogs, getStoredBKNotes, saveBKNote, getStoredSchoolConfig, forceFetchFromCloud } from '../../services/storage';
import { ALL_CLASSES } from '../../data/initialData';
import { DailyBarChart } from '../charts/DailyBarChart';
import { MonthlyLineChart } from '../charts/MonthlyLineChart';
import { MonthlyReportModal } from '../reports/MonthlyReportModal';
import { ExportHabitsModal } from '../reports/ExportHabitsModal';

interface GuruBKDashboardProps {
  currentUser: User;
}

export const GuruBKDashboard: React.FC<GuruBKDashboardProps> = ({ currentUser }) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allLogs, setAllLogs] = useState<KAIHEntry[]>([]);
  const [bkNotes, setBkNotes] = useState<BKCounselingNote[]>([]);

  const [selectedStudentForReport, setSelectedStudentForReport] = useState<User | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [noteModalStudent, setNoteModalStudent] = useState<User | null>(null);
  const [newCatatan, setNewCatatan] = useState('');
  const [newTindakan, setNewTindakan] = useState('');

  useEffect(() => {
    const loadData = () => {
      setAllUsers(getStoredUsers());
      setAllLogs(getStoredLogs());
      setBkNotes(getStoredBKNotes());
    };
    loadData();

    forceFetchFromCloud().then(() => {
      loadData();
    });

    window.addEventListener('kaih_data_updated', loadData);
    return () => {
      window.removeEventListener('kaih_data_updated', loadData);
    };
  }, []);

  const allStudents = React.useMemo(() => {
    return allUsers.filter((u) => u.role === 'siswa');
  }, [allUsers]);

  const normalizeClass = (cls?: string) => {
    if (!cls) return '';
    return cls.replace(/\s+/g, '').toUpperCase();
  };

  const getStudentLog = React.useCallback((student: User): KAIHEntry | undefined => {
    if (!student) return undefined;
    const sId = student.id ? student.id.trim().toLowerCase() : '';
    const sUsername = student.username ? student.username.trim().toLowerCase() : '';
    const sName = student.name ? student.name.trim().toLowerCase() : '';
    const sNisn = student.nisn ? student.nisn.trim().toLowerCase() : '';

    return allLogs.find((l) => {
      if (!l.date || l.date.trim() !== selectedDate.trim()) return false;
      const target = l.studentId ? l.studentId.trim().toLowerCase() : '';
      const logStudentName = (l as any).studentName ? (l as any).studentName.trim().toLowerCase() : '';
      const logId = l.id ? l.id.toLowerCase() : '';

      if (
        (sId && target === sId) ||
        (sUsername && target === sUsername) ||
        (sName && target === sName) ||
        (sNisn && target === sNisn) ||
        (logStudentName && sName && (logStudentName === sName || logStudentName.includes(sName))) ||
        (l.id && sId && logId.includes(sId))
      ) {
        return true;
      }

      return false;
    });
  }, [allLogs, selectedDate]);

  // Filter students by class and search
  const filteredStudents = React.useMemo(() => {
    const sTerm = searchTerm.toLowerCase();

    return allStudents.filter((student) => {
      const matchesClass =
        selectedClassFilter === 'ALL' ||
        (student.assignedClass &&
          normalizeClass(student.assignedClass) === normalizeClass(selectedClassFilter));
      const matchesSearch =
        !sTerm ||
        student.name.toLowerCase().includes(sTerm) ||
        (student.assignedClass && student.assignedClass.toLowerCase().includes(sTerm));

      if (!matchesClass || !matchesSearch) return false;

      if (showLowOnly) {
        const log = getStudentLog(student);
        const score = log ? log.scorePercentage : 0;
        return score < 50;
      }

      return true;
    });
  }, [allStudents, selectedClassFilter, searchTerm, showLowOnly, getStudentLog]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClassFilter, showLowOnly, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = React.useMemo(() => {
    if (pageSize >= 9999) return filteredStudents;
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Identify low compliance students (< 50% score) for alert banner
  const lowComplianceStudents = React.useMemo(() => {
    return allStudents.filter((student) => {
      const log = getStudentLog(student);
      return !log || log.scorePercentage < 50;
    });
  }, [allStudents, getStudentLog]);

  // Add BK Note
  const handleAddBKNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteModalStudent || !newCatatan.trim()) return;

    const note: BKCounselingNote = {
      id: `bk-${Date.now()}`,
      studentId: noteModalStudent.id,
      guruBkId: currentUser.id,
      date: selectedDate,
      catatan: newCatatan,
      tindakanLanjut: newTindakan,
    };

    const updated = saveBKNote(note);
    setBkNotes(updated);
    setNoteModalStudent(null);
    setNewCatatan('');
    setNewTindakan('');
  };

  const schoolConfig = getStoredSchoolConfig();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-purple-800">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
            <HeartHandshake className="w-3.5 h-3.5" /> Portal Bimbingan & Konseling (BK)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Monitoring Karakter Seluruh 32 Kelas
          </h1>
          <p className="text-xs sm:text-sm text-purple-200 max-w-xl">
            Guru BK: <strong>{currentUser.name}</strong> • Memantau kebiasaan karakter siswa Kelas 7, 8, dan 9 SMPN 10 Balikpapan secara menyeluruh.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/90 p-3 rounded-xl border border-slate-700 shrink-0">
          <span className="text-xs font-bold text-slate-300">Tanggal:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-600 outline-none"
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Siswa Terdaftar</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{allStudents.length} Siswa</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">32 Kelas (7A-7K, 8A-8K, 9A-9J)</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perlu Pembinaan BK (&lt;50%)</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{lowComplianceStudents.length} Siswa</h3>
            <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Prioritas Pendampingan BK</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan Pembinaan BK</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">{bkNotes.length} Catatan</h3>
            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Tersimpan dalam sistem</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Global Monthly Line Chart */}
      <MonthlyLineChart logs={allLogs} title="Grafik Tren Kepatuhan Karakter Siswa Seluruh Sekolah (0-100%)" />

      {/* Student List & Class Filtering */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Monitoring Kepatuhan Siswa Per Kelas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Guru BK dapat memfilter kelas mana saja dari 32 kelas SMPN 10 Balikpapan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter class dropdown */}
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
            >
              <option value="ALL">-- Semua 32 Kelas --</option>
              {ALL_CLASSES.map((cls) => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>

            {/* Export Button */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Export Rekap KAIH untuk Konseling BK (CSV / Excel / PDF)"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV / PDF
            </button>

            {/* Filter low compliance only */}
            <button
              onClick={() => setShowLowOnly(!showLowOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                showLowOnly
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {showLowOnly ? '✓ Menampilkan <50% Kepatuhan' : 'Filter Kepatuhan Low (<50%)'}
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari siswa/kelas..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
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
                <th className="py-3.5 px-6">Kelas</th>
                <th className="py-3.5 px-6">Agama</th>
                <th className="py-3.5 px-6 text-center">Status {selectedDate}</th>
                <th className="py-3.5 px-6 text-center">Capaian %</th>
                <th className="py-3.5 px-6 text-right">Aksi BK & Laporan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada siswa ditemukan
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, idx) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + idx + 1;
                  const studentLog = getStudentLog(student);
                  const isLow = !studentLog || studentLog.scorePercentage < 50;

                  return (
                    <tr key={student.id} className={`hover:bg-purple-50/50 transition-colors ${isLow ? 'bg-rose-50/30' : ''}`}>
                      <td className="py-4 px-6 font-bold text-slate-400">{absoluteIndex}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">{student.name}</td>
                      <td className="py-4 px-6 font-bold text-purple-700">{student.assignedClass}</td>
                      <td className="py-4 px-6 font-medium text-slate-700">{student.agama || 'Islam'}</td>
                      <td className="py-4 px-6 text-center">
                        {studentLog ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 font-bold rounded-full text-[11px] ${
                            studentLog.scorePercentage >= 50
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {studentLog.completedCount}/7 KAIH
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 font-bold rounded-full text-[11px]">
                            Belum Mengisi
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center font-extrabold text-sm">
                        {studentLog ? (
                          <span className={studentLog.scorePercentage < 50 ? 'text-rose-600' : 'text-emerald-600'}>
                            {studentLog.scorePercentage}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => setNoteModalStudent(student)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs"
                          title="Tambah Catatan Pembinaan BK"
                        >
                          <Plus className="w-3.5 h-3.5" /> Catatan BK
                        </button>

                        <button
                          onClick={() => setSelectedStudentForReport(student)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs"
                          title="Cetak Laporan Bulanan"
                        >
                          <FileText className="w-3.5 h-3.5" /> Laporan
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredStudents.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span>Tampilkan per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={20}>20 siswa</option>
                <option value={50}>50 siswa</option>
                <option value={100}>100 siswa</option>
                <option value={9999}>Semua siswa ({filteredStudents.length})</option>
              </select>
              <span className="text-slate-500 text-[11px] ml-2">
                Menampilkan {Math.min((currentPage - 1) * pageSize + 1, filteredStudents.length)} - {Math.min(currentPage * pageSize, filteredStudents.length)} dari {filteredStudents.length} siswa
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                &laquo; Prev
              </button>
              <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded-lg text-xs font-extrabold">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                Next &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Counseling Note Modal */}
      {noteModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-purple-600" />
              Catatan Pembinaan BK - {noteModalStudent.name} (Kelas {noteModalStudent.assignedClass})
            </h3>

            <form onSubmit={handleAddBKNote} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Pembimbingan BK:</label>
                <textarea
                  rows={3}
                  value={newCatatan}
                  onChange={(e) => setNewCatatan(e.target.value)}
                  placeholder="Isi catatan konseling, motivasi, atau kedisiplinan..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rencana Tindakan Lanjut:</label>
                <input
                  type="text"
                  value={newTindakan}
                  onChange={(e) => setNewTindakan(e.target.value)}
                  placeholder="Tindak lanjut (misal: Konseling individu / Panggil Orang Tua)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNoteModalStudent(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Habits Modal */}
      <ExportHabitsModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        allLogs={allLogs}
        defaultClass={selectedClassFilter as any}
      />

      {/* Monthly Report Modal */}
      {selectedStudentForReport && (
        <MonthlyReportModal
          student={selectedStudentForReport}
          logs={allLogs.filter((l) => {
            if (!l.studentId || !selectedStudentForReport) return false;
            const target = l.studentId.trim().toLowerCase();
            return (
              target === selectedStudentForReport.id.trim().toLowerCase() ||
              (selectedStudentForReport.username && target === selectedStudentForReport.username.trim().toLowerCase()) ||
              (selectedStudentForReport.name && target === selectedStudentForReport.name.trim().toLowerCase())
            );
          })}
          month={Number(selectedDate.split('-')[1]) || 7}
          year={Number(selectedDate.split('-')[0]) || 2026}
          config={{
            ...schoolConfig,
            namaWaliKelas: allUsers.find((u) => u.role === 'wali_kelas' && u.assignedClass === selectedStudentForReport.assignedClass)?.name || schoolConfig.namaWaliKelas,
            nipWaliKelas: allUsers.find((u) => u.role === 'wali_kelas' && u.assignedClass === selectedStudentForReport.assignedClass)?.nip || schoolConfig.nipWaliKelas,
          }}
          isOpen={Boolean(selectedStudentForReport)}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}
    </div>
  );
};
