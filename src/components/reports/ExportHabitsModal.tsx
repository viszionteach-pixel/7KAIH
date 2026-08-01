import React, { useState, useRef } from 'react';
import { X, Download, Printer, FileSpreadsheet, FileText, Calendar, Filter, Users, CheckCircle2, Award, ClipboardCheck, TrendingUp, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, KAIHEntry, ClassName, MonthlyReportConfig } from '../../types';
import { ALL_CLASSES } from '../../data/initialData';
import { SchoolLogo } from '../SchoolLogo';
import { getStoredSchoolConfig } from '../../services/storage';

interface ExportHabitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  allLogs: KAIHEntry[];
  defaultClass?: ClassName | 'ALL';
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ExportHabitsModal: React.FC<ExportHabitsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  allLogs,
  defaultClass = 'ALL',
}) => {
  const [selectedClass, setSelectedClass] = useState<ClassName | 'ALL'>(defaultClass);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [reportMode, setReportMode] = useState<'SUMMARY' | 'DETAIL'>('SUMMARY');

  const printRef = useRef<HTMLDivElement>(null);
  const schoolConfig = getStoredSchoolConfig();

  if (!isOpen) return null;

  // Filter students
  const students = allUsers.filter((u) => {
    if (u.role !== 'siswa') return false;
    if (selectedClass !== 'ALL' && u.assignedClass !== selectedClass) return false;
    return true;
  });

  const monthName = MONTH_NAMES[selectedMonth - 1] || 'Juli';
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  // Filter logs by month/year and selected students
  const studentIds = new Set(students.map((s) => s.id));
  const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const monthLogs = allLogs.filter(
    (l) => studentIds.has(l.studentId) && l.date.startsWith(monthPrefix)
  );

  // Summary per student
  const studentSummaries = students.map((st) => {
    const stLogs = monthLogs.filter((l) => l.studentId === st.id);
    const filledDays = stLogs.length;
    const totalCompleted = stLogs.reduce((acc, curr) => acc + curr.completedCount, 0);
    const maxPossible = daysInMonth * 7;
    const avgPercentage = maxPossible > 0 ? Math.round((totalCompleted / maxPossible) * 100) : 0;

    let predicate = 'Perlu Pembinaan (D)';
    if (avgPercentage >= 85) predicate = 'Sangat Baik (A)';
    else if (avgPercentage >= 70) predicate = 'Baik (B)';
    else if (avgPercentage >= 55) predicate = 'Cukup (C)';

    return {
      student: st,
      filledDays,
      totalCompleted,
      avgPercentage,
      predicate,
    };
  });

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM

    if (reportMode === 'SUMMARY') {
      csvContent += 'No,Nama Siswa,Kelas,Agama,Jumlah Hari Terisi,Total Kebiasaan Terisi,Kepatuhan (%),Predikat Karakter\n';
      studentSummaries.forEach((s, idx) => {
        csvContent += `"${idx + 1}","${s.student.name}","${s.student.assignedClass || '-'}","${s.student.agama || 'Islam'}","${s.filledDays}/${daysInMonth} Hari","${s.totalCompleted}","${s.avgPercentage}%","${s.predicate}"\n`;
      });
    } else {
      csvContent += 'No,Tanggal,Nama Siswa,Kelas,Bangun Pagi,Beribadah,Berolahraga,Makan Sehat,Gemar Belajar,Bermasyarakat,Tidur Cepat,Capaian (%)\n';
      let idx = 1;
      monthLogs.forEach((l) => {
        const st = students.find((s) => s.id === l.studentId);
        const name = st ? st.name : 'Siswa';
        const cls = st?.assignedClass || '-';
        const bp = l.bangunPagi?.checked ? `Selesai (${l.bangunPagi.jamBangun || '-'})` : 'Belum';
        const ib = l.beribadah?.checked ? 'Selesai' : 'Belum';
        const ol = l.berolahraga?.checked ? `Selesai (${l.berolahraga.jenisOlahraga || '-'})` : 'Belum';
        const ms = l.makanSehat?.checked ? 'Selesai' : 'Belum';
        const gb = l.gemarBelajar?.checked ? `Selesai (${l.gemarBelajar.mataPelajaran || '-'})` : 'Belum';
        const bm = l.bermasyarakat?.checked ? 'Selesai' : 'Belum';
        const tc = l.tidurCepat?.checked ? `Selesai (${l.tidurCepat.jamTidur || '-'})` : 'Belum';

        csvContent += `"${idx++}","${l.date}","${name}","${cls}","${bp}","${ib}","${ol}","${ms}","${gb}","${bm}","${tc}","${l.scorePercentage}%"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_KAIH_${selectedClass}_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel
  const handleExportExcel = () => {
    let excelData = [];
    if (reportMode === 'SUMMARY') {
      excelData = studentSummaries.map((s, idx) => ({
        'No': idx + 1,
        'Nama Siswa': s.student.name,
        'Kelas': s.student.assignedClass || '-',
        'Agama': s.student.agama || 'Islam',
        'Hari Mengisi': `${s.filledDays}/${daysInMonth} Hari`,
        'Total Kebiasaan Terisi': s.totalCompleted,
        'Kepatuhan (%)': `${s.avgPercentage}%`,
        'Predikat Karakter': s.predicate,
      }));
    } else {
      excelData = monthLogs.map((l, idx) => {
        const st = students.find((s) => s.id === l.studentId);
        return {
          'No': idx + 1,
          'Tanggal': l.date,
          'Nama Siswa': st ? st.name : 'Siswa',
          'Kelas': st?.assignedClass || '-',
          'Bangun Pagi': l.bangunPagi?.checked ? `Selesai (${l.bangunPagi.jamBangun || '-'})` : 'Belum',
          'Beribadah': l.beribadah?.checked ? 'Selesai' : 'Belum',
          'Berolahraga': l.berolahraga?.checked ? `Selesai (${l.berolahraga.jenisOlahraga || '-'})` : 'Belum',
          'Makan Sehat': l.makanSehat?.checked ? 'Selesai' : 'Belum',
          'Gemar Belajar': l.gemarBelajar?.checked ? `Selesai (${l.gemarBelajar.mataPelajaran || '-'})` : 'Belum',
          'Bermasyarakat': l.bermasyarakat?.checked ? 'Selesai' : 'Belum',
          'Tidur Cepat': l.tidurCepat?.checked ? `Selesai (${l.tidurCepat.jamTidur || '-'})` : 'Belum',
          'Capaian (%)': `${l.scorePercentage}%`,
        };
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.sheet_add_aoa(worksheet, [
      ['LAPORAN REKAPITULASI PEMBIASAAN KARAKTER 7 KAIH'],
      [schoolConfig.namaSekolah || 'SMP NEGERI 10 BALIKPAPAN'],
      [`Periode: ${monthName} ${selectedYear}`, `Filter Kelas: ${selectedClass}`],
      [],
    ], { origin: 'A1' });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap KAIH');
    XLSX.writeFile(workbook, `Rekap_KAIH_${selectedClass}_${monthName}_${selectedYear}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto print:static print:block print:p-0 print:m-0 print:bg-white print:overflow-visible print:w-full print:h-auto print:inset-auto print:z-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col print:static print:block print:p-0 print:m-0 print:bg-white print:overflow-visible print:max-h-none print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none">
        {/* Controls Bar */}
        <div className="sticky top-0 z-20 bg-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <SchoolLogo size="sm" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">Export & Cetak Laporan 7 KAIH</h3>
              <p className="text-xs text-slate-300">
                Laporan Kepatuhan Pembiasaan Karakter Siswa (CSV, Excel, & PDF)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              title="Unduh File CSV (.csv)"
            >
              <FileText className="w-4 h-4" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              title="Unduh File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-sm"
              title="Cetak atau Simpan PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Configuration Panel */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter Kelas:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as any)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kelas ({allUsers.filter((u) => u.role === 'siswa').length} Siswa)</option>
              {ALL_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" /> Bulan:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" /> Tahun:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-purple-600" /> Tipe Tampilan:
            </label>
            <select
              value={reportMode}
              onChange={(e) => setReportMode(e.target.value as any)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="SUMMARY">Ringkasan Karakter Per Siswa</option>
              <option value="DETAIL">Detail Log Presensi Harian</option>
            </select>
          </div>
        </div>

        {/* Print Printable Canvas */}
        <div ref={printRef} className="printable-paper-canvas p-8 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:m-0 print:w-full">
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 5mm 8mm;
              }
              html, body {
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }
              /* Hide all background dashboard elements outside the print canvas */
              body * {
                visibility: hidden !important;
              }
              /* Show ONLY the printable canvas and its child elements */
              .printable-paper-canvas,
              .printable-paper-canvas * {
                visibility: visible !important;
              }
              .printable-paper-canvas {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
                font-size: 9.5px !important;
                line-height: 1.2 !important;
              }
              .printable-paper-canvas table th {
                padding: 3px 4px !important;
                font-size: 9px !important;
                line-height: 1.15 !important;
              }
              .printable-paper-canvas table td {
                padding: 2.2px 4px !important;
                font-size: 9px !important;
                line-height: 1.15 !important;
              }
              .printable-paper-canvas .print\\:hidden {
                display: none !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .signature-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>

          {/* Kop Surat Header */}
          <div className="border-b-2 border-slate-900 pb-2 mb-2.5 print:pb-1.5 print:mb-2 flex items-center justify-between gap-2">
            {/* Left Logo */}
            <div className="w-16 sm:w-20 shrink-0 flex justify-start">
              <SchoolLogo customLogoUrl={schoolConfig.logoUrl} size="lg" className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 print:w-12 print:h-12" />
            </div>

            {/* Center Text */}
            <div className="text-center flex-1 px-2">
              <h4 className="text-xs print:text-[9.5px] font-extrabold uppercase tracking-widest text-slate-700 leading-tight">
                PEMERINTAH KOTA BALIKPAPAN
              </h4>
              <h3 className="text-sm print:text-[11px] font-black uppercase text-slate-900 leading-tight">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </h3>
              <h2 className="text-base sm:text-lg print:text-[13px] font-black uppercase text-blue-900 tracking-tight leading-tight">
                {schoolConfig.namaSekolah || 'SMP NEGERI 10 BALIKPAPAN'}
              </h2>
              <p className="text-[10px] print:text-[8.5px] text-slate-600 mt-0.5 leading-tight">
                {schoolConfig.alamatSekolah || 'Jl. Strat 3 No. 45, Gunung Samarinda, Kec. Balikpapan Utara, Kota Balikpapan, Kalimantan Timur 76125'}
              </p>
            </div>

            {/* Right Spacer */}
            <div className="w-16 sm:w-20 shrink-0" aria-hidden="true" />
          </div>

          {/* Document Title */}
          <div className="text-center mb-2.5 print:mb-2">
            <h2 className="text-sm sm:text-base print:text-[12px] font-extrabold text-slate-900 uppercase tracking-wide leading-tight">
              REKAPITULASI MONITORING 7 KEBIASAAN ANAK INDONESIA HEBAT (KAIH)
            </h2>
            <p className="text-xs print:text-[9.5px] font-bold text-slate-600 uppercase mt-0.5">
              PERIODE: {monthName.toUpperCase()} {selectedYear} • KELAS: {selectedClass === 'ALL' ? 'SEMUA KELAS' : `KELAS ${selectedClass}`}
            </p>
          </div>

          {/* Executive Stats Summary */}
          <div className="grid grid-cols-3 gap-2 mb-2.5 p-2.5 print:p-2 print:mb-2 bg-slate-50 border border-slate-300 rounded-xl text-xs print:text-[8.5px] print:rounded-md">
            <div>
              <span className="text-slate-500 block font-semibold text-[10px] print:text-[8px]">Total Siswa Terdaftar:</span>
              <strong className="text-sm print:text-[10px] text-slate-900 font-bold">{students.length} Siswa</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[10px] print:text-[8px]">Total Presensi Terisi:</span>
              <strong className="text-sm print:text-[10px] text-blue-700 font-bold">{monthLogs.length} Log Presensi</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[10px] print:text-[8px]">Rata-rata Capaian KAIH:</span>
              <strong className="text-sm print:text-[10px] text-emerald-700 font-bold">
                {studentSummaries.length > 0
                  ? Math.round(studentSummaries.reduce((acc, s) => acc + s.avgPercentage, 0) / studentSummaries.length)
                  : 0}%
              </strong>
            </div>
          </div>

          {/* Table */}
          {reportMode === 'SUMMARY' ? (
            <table className="w-full text-xs print:text-[8px] border-collapse border border-slate-400 mb-3 print:mb-2">
              <thead>
                <tr className="bg-[#1e293b] text-white font-bold uppercase text-center text-[10px] print:text-[8px]">
                  <th className="border border-slate-500 p-1.5 print:py-1 print:px-0.5 w-7">NO</th>
                  <th className="border border-slate-500 p-1.5 print:py-1 print:px-1 text-left">NAMA SISWA</th>
                  <th className="border border-slate-500 p-1.5 print:py-1 print:px-0.5 w-12">KELAS</th>
                  <th className="border border-slate-500 p-1.5 print:py-1 print:px-0.5 w-14">AGAMA</th>
                  <th className="border border-slate-500 p-1.5 print:py-1 print:px-0.5 w-20">HARI MENGISI</th>
                  <th className="border border-slate-500 p-1.5 print:py-1 print:px-0.5 w-16">TOTAL KAIH</th>
                  <th className="border border-slate-500 p-1.5 print:py-1 print:px-0.5 w-20">CAPAIAN (%)</th>
                  <th className="border border-slate-500 p-1.5 print:py-1 print:px-1 w-28">PREDIKAT</th>
                </tr>
              </thead>
              <tbody>
                {studentSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-slate-500 italic">
                      Tidak ada data siswa atau presensi untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  studentSummaries.map((s, idx) => (
                    <tr key={s.student.id} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="border border-slate-300 p-1.5 print:py-[1.5px] print:px-0.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 p-1.5 print:py-[1.5px] print:px-1 font-bold text-slate-900 uppercase">{s.student.name}</td>
                      <td className="border border-slate-300 p-1.5 print:py-[1.5px] print:px-0.5 text-center font-semibold">{s.student.assignedClass || '-'}</td>
                      <td className="border border-slate-300 p-1.5 print:py-[1.5px] print:px-0.5 text-center">{s.student.agama || 'Islam'}</td>
                      <td className="border border-slate-300 p-1.5 print:py-[1.5px] print:px-0.5 text-center font-medium">{s.filledDays}/{daysInMonth} Hari</td>
                      <td className="border border-slate-300 p-1.5 print:py-[1.5px] print:px-0.5 text-center">{s.totalCompleted}</td>
                      <td className="border border-slate-300 p-1.5 print:py-[1.5px] print:px-0.5 text-center font-bold text-blue-700">{s.avgPercentage}%</td>
                      <td className="border border-slate-300 p-1.5 print:py-[1.5px] print:px-1 text-center font-medium text-slate-800">{s.predicate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[10px] print:text-[8px] border-collapse border border-slate-400 mb-3 print:mb-2">
              <thead>
                <tr className="bg-slate-800 text-white font-bold uppercase text-center">
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5 w-6">No</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5 w-14">Tanggal</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5 text-left">Nama Siswa</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5 w-8">Kelas</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Bangun Pagi</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Beribadah</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Berolahraga</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Makan Sehat</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Gemar Belajar</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Bermasyarakat</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Tidur Cepat</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5 w-8">Skor %</th>
                </tr>
              </thead>
              <tbody>
                {monthLogs.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-slate-500 italic">
                      Tidak ada log presensi harian pada periode ini.
                    </td>
                  </tr>
                ) : (
                  monthLogs.map((l, idx) => {
                    const st = students.find((s) => s.id === l.studentId);
                    return (
                      <tr key={l.id} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center font-mono">{l.date}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 font-bold text-slate-900">{st ? st.name : '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center">{st?.assignedClass || '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center">{l.bangunPagi?.checked ? '✓' : '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center">{l.beribadah?.checked ? '✓' : '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center">{l.berolahraga?.checked ? '✓' : '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center">{l.makanSehat?.checked ? '✓' : '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center">{l.gemarBelajar?.checked ? '✓' : '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center">{l.bermasyarakat?.checked ? '✓' : '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center">{l.tidurCepat?.checked ? '✓' : '-'}</td>
                        <td className="border border-slate-300 p-1 print:py-[1.5px] print:px-0.5 text-center font-bold">{l.scorePercentage}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Signatures */}
          <div className="signature-block pt-2.5 print:pt-2 border-t border-slate-300 flex items-start justify-between text-xs print:text-[9px] leading-tight">
            <div className="text-center w-52 print:w-48">
              <p className="text-slate-600 mb-0.5">Mengetahui,</p>
              <p className="font-bold text-slate-800">
                {selectedClass !== 'ALL' ? `Wali Kelas ${selectedClass}` : 'Penanggung Jawab KAIH'}
              </p>
              <div className="h-12 print:h-10 flex items-center justify-center my-0.5">
                <span className="text-[10px] print:text-[8px] text-slate-400 italic">[ Tanda Tangan ]</span>
              </div>
              <p className="font-bold text-slate-900 underline">
                {schoolConfig.namaWaliKelas || currentUser.name}
              </p>
              <p className="text-[10px] print:text-[8px] text-slate-500">NIP. {schoolConfig.nipWaliKelas || '19750814 200212 2 003'}</p>
            </div>

            <div className="text-center w-60 print:w-56">
              <p className="text-slate-600 mb-0.5">Balikpapan, {daysInMonth} {monthName} {selectedYear}</p>
              <p className="font-bold text-slate-800">Kepala {schoolConfig.namaSekolah || 'SMP Negeri 10 Balikpapan'}</p>
              <div className="h-12 print:h-10 flex items-center justify-center my-0.5 relative">
                {schoolConfig.stempelUrl ? (
                  <img
                    src={schoolConfig.stempelUrl}
                    alt="Stempel Resmi Sekolah"
                    className="max-h-10 print:max-h-8 max-w-full object-contain drop-shadow-sm opacity-90"
                  />
                ) : (
                  <span className="text-[10px] print:text-[8px] text-slate-400 italic">[ Tanda Tangan & Stempel Resmi ]</span>
                )}
              </div>
              <p className="font-bold text-slate-900 underline">{schoolConfig.namaKepalaSekolah}</p>
              <p className="text-[10px] print:text-[8px] text-slate-500">NIP. {schoolConfig.nipKepalaSekolah || '19680512 199403 1 005'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
