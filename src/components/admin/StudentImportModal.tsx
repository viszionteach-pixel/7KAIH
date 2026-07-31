import React, { useState, useRef } from 'react';
import {
  Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, X, Download,
  UserPlus, FileCheck, RefreshCw, Trash2, HelpCircle, Image as ImageIcon,
  UserCheck, Shield, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, ClassName, Agama, Role } from '../../types';
import { getStoredUsers, saveStoredUsers } from '../../services/storage';
import {
  extractRowsFromImage, normalizeClassName, parseAgama, parseRole,
  parseLineToRow
} from '../../utils/ocrTableExtractor';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClass?: ClassName;
  defaultRole?: Role;
  onSuccessImport: (count: number) => void;
}

interface ExtractedUserRow {
  name: string;
  role: Role;
  assignedClass: ClassName;
  agama: Agama;
  nipOrNisn?: string;
  selected: boolean;
  isDuplicate?: boolean;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  defaultClass = '7A',
  defaultRole = 'siswa',
  onSuccessImport,
}) => {
  const safeDefaultClass: ClassName = (defaultClass as ClassName) || '7A';
  const [targetRole, setTargetRole] = useState<Role>(defaultRole);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ExtractedUserRow[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [selectedClassOverride, setSelectedClassOverride] = useState<ClassName | 'AUTO'>('AUTO');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfoMsg, setSuccessInfoMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingUsers = getStoredUsers();
  const existingNamesSet = new Set(existingUsers.map((u) => u.name.toLowerCase().trim()));

  // 1. Download Excel Templates
  const handleDownloadTemplate = (type: 'siswa' | 'wali_kelas') => {
    if (type === 'wali_kelas') {
      const waliData = [
        {
          'NO': 1,
          'NAMA WALI KELAS': 'Endang Setyowati, S.Pd.',
          'KELAS / ROMBEL': '7A',
          'NIP': '19750814 200212 2 003',
          'AGAMA': 'Islam',
        },
        {
          'NO': 2,
          'NAMA WALI KELAS': 'Drs. H. Bambang Susilo',
          'KELAS / ROMBEL': '7B',
          'NIP': '19680312 199403 1 004',
          'AGAMA': 'Islam',
        },
        {
          'NO': 3,
          'NAMA WALI KELAS': 'Maria Christine, S.Pd.',
          'KELAS / ROMBEL': '8A',
          'NIP': '19820511 200801 2 009',
          'AGAMA': 'Kristen',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(waliData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Wali Kelas');
      XLSX.writeFile(wb, 'Template_Import_Wali_Kelas_SMPN10.xlsx');
    } else {
      const siswaData = [
        {
          'NO': 1,
          'NAMA LENGKAP': 'Ahmad Fauzi',
          'KELAS': '7A',
          'AGAMA': 'Islam',
          'NISN': '0081234567',
        },
        {
          'NO': 2,
          'NAMA LENGKAP': 'Bunga Citra',
          'KELAS': '7A',
          'AGAMA': 'Kristen',
          'NISN': '0081234568',
        },
        {
          'NO': 3,
          'NAMA LENGKAP': 'Clara Shinta',
          'KELAS': '7B',
          'AGAMA': 'Katolik',
          'NISN': '0081234569',
        },
        {
          'NO': 4,
          'NAMA LENGKAP': 'Dewa Ketut',
          'KELAS': '8A',
          'AGAMA': 'Hindu',
          'NISN': '0081234570',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(siswaData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
      XLSX.writeFile(wb, 'Template_Import_Siswa_SMPN10.xlsx');
    }
  };

  // 2. Process Raw JSON rows into ExtractedUserRow
  const processRawRows = (rows: Record<string, any>[]) => {
    const list: ExtractedUserRow[] = [];

    rows.forEach((row) => {
      const keys = Object.keys(row);
      const nameKey = keys.find((k) => /nama|name|guru|wali|siswa|student/i.test(k)) || keys[1] || keys[0];
      const classKey = keys.find((k) => /kelas|class|rombel|tingkat/i.test(k));
      const agamaKey = keys.find((k) => /agama|religion/i.test(k));
      const idKey = keys.find((k) => /nip|nisn|nis|no_induk|id/i.test(k));
      const roleKey = keys.find((k) => /peran|role|jabatan/i.test(k));

      let nameVal = String(row[nameKey] || '').trim();
      nameVal = nameVal.replace(/^\d+[\.\-\s]+/, '').trim();

      if (!nameVal || nameVal.length < 2 || /^(no|nama|kelas|nip|nisn|daftar)$/i.test(nameVal)) return;

      // Class determination - Default to AUTO detect from file row
      let classVal: ClassName = safeDefaultClass;
      if (selectedClassOverride !== 'AUTO') {
        classVal = selectedClassOverride as ClassName;
      } else if (classKey && row[classKey]) {
        const detectedCls = normalizeClassName(String(row[classKey]));
        if (detectedCls) classVal = detectedCls;
      } else {
        // Try extracting class from raw row text
        const rowStr = Object.values(row).join(' ');
        const detectedCls = normalizeClassName(rowStr);
        if (detectedCls) classVal = detectedCls;
      }

      // Role determination
      let roleVal: Role = targetRole;
      if (roleKey && row[roleKey]) {
        roleVal = parseRole(String(row[roleKey]), targetRole);
      } else {
        const rowStr = Object.values(row).join(' ');
        if (/wali|guru|walikelas/i.test(rowStr)) roleVal = 'wali_kelas';
      }

      // Agama determination
      let agamaVal: Agama = 'Islam';
      if (agamaKey && row[agamaKey]) {
        agamaVal = parseAgama(String(row[agamaKey]));
      }

      const nipOrNisnVal = idKey && row[idKey] ? String(row[idKey]).trim() : '';
      const isDuplicate = existingNamesSet.has(nameVal.toLowerCase());

      list.push({
        name: nameVal,
        role: roleVal,
        assignedClass: classVal,
        agama: agamaVal,
        nipOrNisn: nipOrNisnVal,
        selected: true,
        isDuplicate,
      });
    });

    setParsedRows(list);
    if (list.length === 0) {
      setErrorMsg('Tidak ada baris data yang valid ditemukan. Pastikan file berisi kolom nama & kelas.');
    } else {
      setSuccessInfoMsg(`Berhasil membaca ${list.length} data. Semua kelas dideteksi secara otomatis!`);
    }
  };

  // 3. Handle File Upload (Excel, CSV, Image, PDF, TXT)
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessInfoMsg(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // IMAGE FILE (PNG, JPG, JPEG, WEBP, SVG, BMP)
      if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp'].includes(ext)) {
        const extractedImageRows = await extractRowsFromImage(file, targetRole);

        if (extractedImageRows && extractedImageRows.length > 0) {
          const listWithDupes: ExtractedUserRow[] = extractedImageRows.map((r) => ({
            ...r,
            isDuplicate: existingNamesSet.has(r.name.toLowerCase()),
          }));
          setParsedRows(listWithDupes);
          setSuccessInfoMsg(`✓ Berhasil memproses gambar dokumen! Terdeteksi ${listWithDupes.length} baris data secara otomatis.`);
        } else {
          // Fallback image text reading or prompt
          setErrorMsg('Gagal mengurai teks otomatis dari gambar. Silakan gunakan tab "Salin / Tempel Teks" untuk memasukkan data dari gambar.');
        }
      }
      // EXCEL / CSV FILE
      else if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        processRawRows(jsonData);
      }
      // TEXT / PDF / WORD FILE
      else {
        const text = await file.text();
        parseTextLines(text);
      }
    } catch (err: any) {
      console.error('Error reading file:', err);
      setErrorMsg('Gagal membaca file. Silakan periksa kembali format file atau gambar.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Parse Raw Text (from Copy Paste area or TXT file)
  const parseTextLines = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const list: ExtractedUserRow[] = [];

    lines.forEach((line) => {
      const parsed = parseLineToRow(line, targetRole);
      if (parsed) {
        list.push({
          ...parsed,
          isDuplicate: existingNamesSet.has(parsed.name.toLowerCase()),
        });
      }
    });

    setParsedRows(list);
    if (list.length === 0) {
      setErrorMsg('Tidak ada data yang valid terdeteksi dari teks yang dimasukkan.');
    } else {
      setSuccessInfoMsg(`Berhasil mengekstrak ${list.length} data pengguna secara otomatis dari teks.`);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      parseTextLines(pasteText);
      setIsLoading(false);
    }, 200);
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Row selection controls
  const toggleSelect = (index: number) => {
    setParsedRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleSelectAll = (selectAll: boolean) => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: selectAll })));
  };

  const updateRowClass = (index: number, newClass: ClassName) => {
    setParsedRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, assignedClass: newClass } : r))
    );
  };

  const updateRowRole = (index: number, newRole: Role) => {
    setParsedRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, role: newRole } : r))
    );
  };

  // Save imported users
  const handleSaveImport = () => {
    const toImport = parsedRows.filter((r) => r.selected);
    if (toImport.length === 0) {
      alert('Pilih setidaknya satu data pengguna untuk diimpor.');
      return;
    }

    const currentUsers = getStoredUsers();
    const newUsers: User[] = [];

    toImport.forEach((item, idx) => {
      const cleanName = item.name.trim();
      const existing = currentUsers.find((u) => u.name.toLowerCase() === cleanName.toLowerCase());

      if (existing) {
        existing.role = item.role;
        existing.assignedClass = item.assignedClass;
        existing.agama = item.agama;
        if (item.nipOrNisn) {
          if (item.role === 'wali_kelas') existing.nip = item.nipOrNisn;
          else existing.nisn = item.nipOrNisn;
        }
      } else {
        newUsers.push({
          id: `usr-${item.role}-${Date.now()}-${idx}`,
          username: cleanName,
          name: cleanName,
          role: item.role,
          assignedClass: item.assignedClass,
          agama: item.agama,
          nisn: item.role === 'siswa' ? item.nipOrNisn || undefined : undefined,
          nip: item.role === 'wali_kelas' ? item.nipOrNisn || undefined : undefined,
        });
      }
    });

    const updatedList = [...currentUsers, ...newUsers];
    saveStoredUsers(updatedList);
    onSuccessImport(toImport.length);
    onClose();
  };

  const selectedCount = parsedRows.filter((r) => r.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                Import Data Massal (Gambar / Excel / PDF / Teks)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Otomatis membaca file, foto tabel, atau dokumen lalu membaginya ke seluruh kelas sekaligus.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Role Selector & Download Template */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Jenis Data Impor:</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetRole('siswa')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  targetRole === 'siswa'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Data Siswa
              </button>
              <button
                type="button"
                onClick={() => setTargetRole('wali_kelas')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  targetRole === 'wali_kelas'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> Data Wali Kelas
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unduh Template Contoh (Excel):</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('siswa')}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Template Siswa
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('wali_kelas')}
                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Template Wali Kelas
              </button>
            </div>
          </div>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-600" /> Upload File (Gambar, Excel, PDF, TXT)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" /> Salin / Tempel Teks Daftar Data
          </button>
        </div>

        {/* TAB 1: FILE & IMAGE UPLOAD ZONE */}
        {activeTab === 'upload' && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, .pdf, .txt, .doc, .docx, .png, .jpg, .jpeg, .webp, .svg"
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              className="hidden"
            />

            <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-sm font-extrabold text-slate-800">
              {fileName ? `File Terpilih: ${fileName}` : 'Tarik & Lepas File di Sini, atau Klik untuk Memilih File'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
              Mendukung <strong>Foto / Gambar Tabel (.png, .jpg)</strong>, Excel (.xlsx, .csv), PDF, Word, atau Dokumen Teks. Sistem akan mengekstrak nama dan <strong>deteksi kelas otomatis</strong> untuk seluruh kelas sekaligus!
            </p>
          </div>
        )}

        {/* TAB 2: COPY PASTE TEXT AREA */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={
                targetRole === 'wali_kelas'
                  ? `Tempelkan daftar wali kelas di sini, contoh:\n1. Endang Setyowati, S.Pd. - Wali Kelas 7A - NIP 197508142002122003\n2. Drs. H. Bambang Susilo - Wali Kelas 7B - NIP 196803121994031004\n3. Maria Christine, S.Pd. - Wali Kelas 8A`
                  : `Tempelkan daftar siswa di sini, contoh:\n1. Ahmad Fauzi - 7A - Islam - 0081234567\n2. Bunga Citra - 7B - Kristen\n3. Dewa Ketut - 8A - Hindu`
              }
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" /> Proses Data Teks
            </button>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successInfoMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successInfoMsg}</span>
          </div>
        )}

        {/* PARSED PREVIEW TABLE */}
        {parsedRows.length > 0 && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pratinjau Data Terdeteksi ({parsedRows.length} akun)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Semua kelas dideteksi otomatis. Anda dapat mengubah kelas atau peran per baris jika diperlukan.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => toggleSelectAll(true)}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => toggleSelectAll(false)}
                  className="text-slate-500 font-bold hover:underline"
                >
                  Batal Semua
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
              {parsedRows.map((r, idx) => (
                <div
                  key={idx}
                  className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    r.selected ? 'bg-blue-50/40' : 'opacity-60 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={() => toggleSelect(idx)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 shrink-0 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{r.name}</span>
                        {r.isDuplicate && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                            Sudah Ada
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>Agama: {r.agama}</span>
                        {r.nipOrNisn && (
                          <>
                            <span>•</span>
                            <span>{r.role === 'wali_kelas' ? 'NIP' : 'NISN'}: {r.nipOrNisn}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Role Selector */}
                    <select
                      value={r.role}
                      onChange={(e) => updateRowRole(idx, e.target.value as Role)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-800 outline-none"
                    >
                      <option value="siswa">Siswa</option>
                      <option value="wali_kelas">Wali Kelas</option>
                      <option value="guru_bk">Guru BK</option>
                    </select>

                    {/* Class Selector per row */}
                    <select
                      value={r.assignedClass}
                      onChange={(e) => updateRowClass(idx, e.target.value as ClassName)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-extrabold text-blue-900 outline-none"
                    >
                      {['7A','7B','7C','7D','7E','7F','7G','7H','7I','7J','7K',
                        '8A','8B','8C','8D','8E','8F','8G','8H','8I','8J','8K',
                        '9A','9B','9C','9D','9E','9F','9G','9H','9I','9J'].map((c) => (
                        <option key={c} value={c}>Kelas {c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
          >
            Batal
          </button>

          <button
            onClick={handleSaveImport}
            disabled={selectedCount === 0 || isLoading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Simpan ({selectedCount}) Data ke Sistem</span>
          </button>
        </div>
      </div>
    </div>
  );
};
