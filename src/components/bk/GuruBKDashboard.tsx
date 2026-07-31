import React, { useState, useEffect } from 'react';
import {
  Users, AlertTriangle, Search, Filter, MessageSquare, CheckCircle2,
  BookOpen, Award, FileText, Plus, HeartHandshake
} from 'lucide-react';
import { User, KAIHEntry, BKCounselingNote, ClassName } from '../../types';
import { getStoredUsers, getStoredLogs, getStoredBKNotes, saveBKNote, getStoredSchoolConfig } from '../../services/storage';
import { ALL_CLASSES } from '../../data/initialData';
import { DailyBarChart } from '../charts/DailyBarChart';
import { MonthlyLineChart } from '../charts/MonthlyLineChart';
import { MonthlyReportModal } from '../reports/MonthlyReportModal';

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

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allLogs, setAllLogs] = useState<KAIHEntry[]>([]);
  const [bkNotes, setBkNotes] = useState<BKCounselingNote[]>([]);

  const [selectedStudentForReport, setSelectedStudentForReport] = useState<User | null>(null);
  const [noteModalStudent, setNoteModalStudent] = useState<User | null>(null);
  const [newCatatan, setNewCatatan] = useState('');
  const [newTindakan, setNewTindakan] = useState('');

  useEffect(() => {
    setAllUsers(getStoredUsers());
    setAllLogs(getStoredLogs());
    setBkNotes(getStoredBKNotes());
  }, []);

  const allStudents = allUsers.filter((u) => u.role === 'siswa');

  // Filter students by class and search
  const filteredStudents = allStudents.filter((student) => {
    const matchesClass = selectedClassFilter === 'ALL' || student.assignedClass === selectedClassFilter;
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (student.assignedClass && student.assignedClass.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesClass || !matchesSearch) return false;

    if (showLowOnly) {
      const log = allLogs.find((l) => l.studentId === student.id && l.date === selectedDate);
      const score = log ? log.scorePercentage : 0;
      return score < 50;
    }

    return true;
  });

  // Logs for current date
  const dailyLogs = allLogs.filter((l) => l.date === selectedDate);

  // Identify low compliance students (< 50% score) for alert banner
  const lowComplianceStudents = allStudents.filter((student) => {
    const log = dailyLogs.find((l) => l.studentId === student.id);
    return !log || log.scorePercentage < 50;
  });

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
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada siswa ditemukan
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const studentLog = dailyLogs.find((l) => l.studentId === student.id);
                  const isLow = !studentLog || studentLog.scorePercentage < 50;

                  return (
                    <tr key={student.id} className={`hover:bg-purple-50/50 transition-colors ${isLow ? 'bg-rose-50/30' : ''}`}>
                      <td className="py-4 px-6 font-bold text-slate-400">{idx + 1}</td>
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

      {/* Monthly Report Modal */}
      {selectedStudentForReport && (
        <MonthlyReportModal
          student={selectedStudentForReport}
          logs={allLogs.filter((l) => l.studentId === selectedStudentForReport.id)}
          month={Number(selectedDate.split('-')[1]) || 7}
          year={Number(selectedDate.split('-')[0]) || 2026}
          config={schoolConfig}
          isOpen={Boolean(selectedStudentForReport)}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}
    </div>
  );
};
