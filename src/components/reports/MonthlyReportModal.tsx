import React, { useRef } from 'react';
import { X, Printer, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, KAIHEntry, MonthlyReportConfig } from '../../types';
import { SchoolLogo } from '../SchoolLogo';

interface MonthlyReportModalProps {
  student: User;
  logs: KAIHEntry[];
  month: number;
  year: number;
  config: MonthlyReportConfig;
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  student,
  logs,
  month,
  year,
  config,
  isOpen,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const monthName = MONTH_NAMES[month - 1] || 'Juli';
  const daysInMonth = new Date(year, month, 0).getDate();

  // Map logs by date (YYYY-MM-DD)
  const logMap = new Map<string, KAIHEntry>();
  logs.forEach((l) => {
    const existing = logMap.get(l.date);
    if (!existing) {
      logMap.set(l.date, l);
    } else {
      const newTime = new Date(l.fillTimestamp || 0).getTime();
      const oldTime = new Date(existing.fillTimestamp || 0).getTime();
      if (newTime >= oldTime || l.completedCount >= existing.completedCount) {
        logMap.set(l.date, l);
      }
    }
  });

  // Build rows for all days in month
  const reportDays = Array.from({ length: daysInMonth }, (_, idx) => {
    const dayNum = idx + 1;
    const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const fullDate = `${year}-${monthStr}-${dayStr}`;

    const entry = logMap.get(fullDate);
    return {
      dayNum,
      fullDate,
      entry,
    };
  });

  // Calculate overall monthly stats
  const filledDays = reportDays.filter((r) => r.entry).length;
  const totalCompletedCount = reportDays.reduce((acc, curr) => acc + (curr.entry ? curr.entry.completedCount : 0), 0);
  const maxPossible = daysInMonth * 7;
  const overallPercentage = maxPossible > 0 ? Math.round((totalCompletedCount / maxPossible) * 100) : 0;

  const getPredicate = (pct: number) => {
    if (pct >= 85) return { text: 'Sangat Baik (A)', color: 'text-emerald-700 font-bold' };
    if (pct >= 70) return { text: 'Baik (B)', color: 'text-blue-700 font-bold' };
    if (pct >= 55) return { text: 'Cukup (C)', color: 'text-amber-700 font-bold' };
    return { text: 'Perlu Pembinaan (D)', color: 'text-red-700 font-bold' };
  };

  const pred = getPredicate(overallPercentage);

  // Print PDF function
  const handlePrint = () => {
    window.print();
  };

  // Export Excel function
  const handleExportExcel = () => {
    const excelData = reportDays.map((r) => {
      const e = r.entry;
      return {
        'No / Tgl': `Tgl ${r.dayNum}`,
        'Tanggal Full': r.fullDate,
        'Bangun Pagi': e?.bangunPagi?.checked ? `Selesai (${e.bangunPagi.jamBangun || '-'})` : 'Belum',
        'Beribadah': e?.beribadah?.checked ? 'Selesai' : 'Belum',
        'Berolahraga': e?.berolahraga?.checked ? `Selesai (${e.berolahraga.jenisOlahraga || '-'})` : 'Belum',
        'Makan Sehat': e?.makanSehat?.checked ? 'Selesai' : 'Belum',
        'Gemar Belajar': e?.gemarBelajar?.checked ? `Selesai (${e.gemarBelajar.mataPelajaran || '-'})` : 'Belum',
        'Bermasyarakat': e?.bermasyarakat?.checked ? 'Selesai' : 'Belum',
        'Tidur Cepat': e?.tidurCepat?.checked ? `Selesai (${e.tidurCepat.jamTidur || '-'})` : 'Belum',
        'Capaian (0-100%)': e ? `${e.scorePercentage}%` : '0%',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add title rows
    XLSX.utils.sheet_add_aoa(worksheet, [
      ['LAPORAN BULANAN 7 KAIH (KEBIASAAN ANAK INDONESIA HEBAT)'],
      ['SMP NEGERI 10 BALIKPAPAN'],
      [`Nama Siswa: ${student.name}`, `Kelas: ${student.assignedClass}`, `Bulan: ${monthName} ${year}`],
      [`Wali Kelas: ${config.namaWaliKelas}`, `Kepala Sekolah: ${config.namaKepalaSekolah}`],
      [],
    ], { origin: 'A1' });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan KAIH');
    XLSX.writeFile(workbook, `Laporan_KAIH_${student.name.replace(/\s+/g, '_')}_${student.assignedClass}_${monthName}_${year}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:static print:block print:p-0 print:m-0 print:bg-white print:overflow-visible print:w-full print:h-auto print:inset-auto print:z-auto">
      {/* Container */}
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col print:static print:block print:p-0 print:m-0 print:bg-white print:overflow-visible print:max-h-none print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none">
        {/* Action Header bar (hidden on print) */}
        <div className="sticky top-0 z-20 bg-slate-900 text-white p-4 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <SchoolLogo size="sm" />
            <div>
              <h3 className="font-bold text-sm">Laporan Bulanan 7 KAIH Siswa</h3>
              <p className="text-xs text-slate-300">
                Format Potrait - {student.name} ({student.assignedClass}) - {monthName} {year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              title="Unduh format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              title="Cetak/Simpan PDF Potrait"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Portrait Sheet Area */}
        <div ref={printRef} className="printable-paper-canvas p-8 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:m-0 print:w-full">
          {/* Print CSS Override */}
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
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
              }
              /* Hide all non-printable elements completely so they do not create blank pages */
              body *:not(:has(.printable-paper-canvas)):not(.printable-paper-canvas):not(.printable-paper-canvas *) {
                display: none !important;
              }
              /* Reset layout on ancestor containers leading to printable canvas */
              body *:has(.printable-paper-canvas) {
                display: block !important;
                position: static !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
                overflow: visible !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                width: 100% !important;
                inset: auto !important;
                transform: none !important;
              }
              /* Printable Paper Canvas styling */
              .printable-paper-canvas {
                display: block !important;
                visibility: visible !important;
                position: relative !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
                overflow: visible !important;
                height: auto !important;
                font-size: 9.5px !important;
                line-height: 1.2 !important;
              }
              .printable-paper-canvas * {
                visibility: visible !important;
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
              .printable-paper-canvas .print\\:hidden,
              .print\\:hidden {
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

          {/* Official Kop Surat Header */}
          <div className="border-b-2 border-slate-900 pb-2 mb-2.5 print:pb-1.5 print:mb-2 flex items-center justify-between gap-2">
            {/* Left Logo */}
            <div className="w-16 sm:w-20 shrink-0 flex justify-start">
              <SchoolLogo customLogoUrl={config.logoUrl} size="lg" className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 print:w-12 print:h-12" />
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
                {config.namaSekolah || 'SMP NEGERI 10 BALIKPAPAN'}
              </h2>
              <p className="text-[10px] print:text-[8.5px] text-slate-600 mt-0.5 leading-tight">
                {config.alamatSekolah || 'Jl. Strat 3 No. 45, Gunung Samarinda, Kec. Balikpapan Utara, Kota Balikpapan, Kalimantan Timur'}
              </p>
            </div>

            {/* Right Spacer */}
            <div className="w-16 sm:w-20 shrink-0" aria-hidden="true" />
          </div>

          {/* Title */}
          <div className="text-center mb-2.5 print:mb-2">
            <h2 className="text-sm sm:text-base print:text-[12px] font-extrabold text-slate-900 uppercase tracking-wide leading-tight">
              LAPORAN PEMBIASAAN 7 KEBIASAAN ANAK INDONESIA HEBAT (KAIH)
            </h2>
            <p className="text-xs print:text-[9.5px] font-semibold text-slate-600 uppercase mt-0.5">
              PERIODE BULAN: {monthName} {year}
            </p>
          </div>

          {/* Student Info Box */}
          <div className="grid grid-cols-2 gap-2 text-xs print:text-[8.5px] mb-2.5 print:mb-2 border border-slate-300 rounded-lg p-2.5 print:p-2 bg-slate-50 print:rounded-md">
            <div>
              <p className="mb-0.5"><strong className="text-slate-700">Nama Lengkap Siswa:</strong> {student.name}</p>
              <p className="mb-0.5"><strong className="text-slate-700">Kelas:</strong> {student.assignedClass}</p>
              <p><strong className="text-slate-700">Agama:</strong> {student.agama || 'Islam'}</p>
            </div>
            <div>
              <p className="mb-0.5"><strong className="text-slate-700">Jumlah Hari Terisi:</strong> {filledDays} / {daysInMonth} Hari</p>
              <p className="mb-0.5"><strong className="text-slate-700">Rata-rata Kepatuhan:</strong> <span className={pred.color}>{overallPercentage}%</span></p>
              <p><strong className="text-slate-700">Predikat Karakter:</strong> <span className={pred.color}>{pred.text}</span></p>
            </div>
          </div>

          {/* 30 Days Portrait Table */}
          <div className="overflow-x-auto mb-3 print:mb-2">
            <table className="w-full text-[10px] print:text-[8px] border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-800 text-white font-bold uppercase text-center">
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5 w-6">Tgl</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Bangun Pagi</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Beribadah</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Berolahraga</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Makan Sehat</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Gemar Belajar</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Bermasyarakat</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5">Tidur Cepat</th>
                  <th className="border border-slate-400 p-1 print:py-0.5 print:px-0.5 w-10">Skor %</th>
                </tr>
              </thead>
              <tbody>
                {reportDays.map((r) => {
                  const e = r.entry;
                  return (
                    <tr key={r.dayNum} className={`text-center ${r.dayNum % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px] font-bold text-slate-700">{r.dayNum}</td>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px]">
                        {e?.bangunPagi?.checked ? (
                          <span className="text-emerald-700 font-bold">✓ ({e.bangunPagi.jamBangun || 'Subuh'})</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px]">
                        {e?.beribadah?.checked ? (
                          <span className="text-emerald-700 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px]">
                        {e?.berolahraga?.checked ? (
                          <span className="text-emerald-700 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px]">
                        {e?.makanSehat?.checked ? (
                          <span className="text-emerald-700 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px]">
                        {e?.gemarBelajar?.checked ? (
                          <span className="text-emerald-700 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px]">
                        {e?.bermasyarakat?.checked ? (
                          <span className="text-emerald-700 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px]">
                        {e?.tidurCepat?.checked ? (
                          <span className="text-emerald-700 font-bold">✓ ({e.tidurCepat.jamTidur || '21:00'})</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-0.5 print:py-[1.5px] font-bold">
                        {e ? (
                          <span className={e.scorePercentage >= 80 ? 'text-emerald-700' : 'text-slate-700'}>
                            {e.scorePercentage}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures Section */}
          <div className="signature-block pt-2.5 print:pt-2 border-t border-slate-300 flex items-start justify-between text-xs print:text-[9px] leading-tight">
            {/* TTD Wali Kelas */}
            <div className="text-center w-52 print:w-48">
              <p className="text-slate-600 mb-0.5">Mengetahui,</p>
              <p className="font-bold text-slate-800">Wali Kelas {student.assignedClass}</p>
              <div className="h-12 print:h-10 flex items-center justify-center my-0.5">
                <span className="text-[10px] print:text-[8px] text-slate-400 italic">[ Tanda Tangan ]</span>
              </div>
              <p className="font-bold text-slate-900 underline">{config.namaWaliKelas}</p>
              <p className="text-[10px] print:text-[8px] text-slate-500">NIP. {config.nipWaliKelas || '19750814 200212 2 003'}</p>
            </div>

            {/* TTD Kepala Sekolah & Stempel */}
            <div className="text-center w-60 print:w-56 relative">
              <p className="text-slate-600 mb-0.5">Balikpapan, {daysInMonth} {monthName} {year}</p>
              <p className="font-bold text-slate-800">Kepala {config.namaSekolah || 'SMP Negeri 10 Balikpapan'}</p>
              <div className="h-12 print:h-10 flex items-center justify-center my-0.5 relative">
                {config.stempelUrl ? (
                  <img
                    src={config.stempelUrl}
                    alt="Stempel Resmi Sekolah"
                    className="max-h-10 print:max-h-8 max-w-full object-contain drop-shadow-sm opacity-90 transition-all"
                  />
                ) : (
                  <span className="text-[10px] print:text-[8px] text-slate-400 italic">[ Tanda Tangan & Stempel Resmi ]</span>
                )}
              </div>
              <p className="font-bold text-slate-900 underline">{config.namaKepalaSekolah}</p>
              <p className="text-[10px] print:text-[8px] text-slate-500">NIP. {config.nipKepalaSekolah || '19680512 199403 1 005'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
