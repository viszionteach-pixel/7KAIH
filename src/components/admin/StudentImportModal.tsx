import React, { useState, useRef } from 'react';
import {
  Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, X, Download,
  UserPlus, FileCheck, RefreshCw, Trash2, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, ClassName, Agama } from '../../types';
import { getStoredUsers, saveStoredUsers } from '../../services/storage';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClass?: ClassName;
  onSuccessImport: (count: number) => void;
}

interface ExtractedStudent {
  name: string;
  assignedClass: ClassName;
  agama: Agama;
  nisn: string;
  selected: boolean;
  isDuplicate?: boolean;
}

const VALID_AGAMA: Agama[] = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu'];

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  defaultClass = '7A',
  onSuccessImport,
}) => {
  const safeDefaultClass: ClassName = (defaultClass as ClassName) || '7A';
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<ExtractedStudent[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [selectedClassOverride, setSelectedClassOverride] = useState<ClassName | 'AUTO'>(safeDefaultClass);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingUsers = getStoredUsers();
  const existingNamesSet = new Set(existingUsers.map((u) => u.name.toLowerCase().trim()));

  // 1. Download Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
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

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, 'Template_Import_Siswa_SMPN10.xlsx');
  };

  // 2. Normalize and Map Row Data into ExtractedStudent
  const processRawRows = (rows: Record<string, any>[]) => {
    const list: ExtractedStudent[] = [];

    rows.forEach((row) => {
      // Find key names flexibly
      const keys = Object.keys(row);
      const nameKey = keys.find((k) => /nama|name|siswa|student/i.test(k)) || keys[1] || keys[0];
      const classKey = keys.find((k) => /kelas|class|rombel/i.test(k));
      const agamaKey = keys.find((k) => /agama|religion/i.test(k));
      const nisnKey = keys.find((k) => /nisn|nis|no_induk|id/i.test(k));

      let nameVal = String(row[nameKey] || '').trim();

      // Clean up sequence numbers like "1. Ahmad" or "1 - Ahmad"
      nameVal = nameVal.replace(/^\d+[\.\-\s]+/, '').trim();

      if (!nameVal || nameVal.length < 2) return;

      // Class determination
      let classVal: ClassName = safeDefaultClass;
      if (selectedClassOverride !== 'AUTO') {
        classVal = selectedClassOverride as ClassName;
      } else if (classKey && row[classKey]) {
        const parsedCls = String(row[classKey]).toUpperCase().trim().replace(/KELAS\s*/i, '');
        if (/^[789][A-K]$/.test(parsedCls)) {
          classVal = parsedCls as ClassName;
        }
      }

      // Agama determination
      let agamaVal: Agama = 'Islam';
      if (agamaKey && row[agamaKey]) {
        const rawAgama = String(row[agamaKey]).trim().toLowerCase();
        if (rawAgama.includes('kristen') || rawAgama.includes('protestan')) agamaVal = 'Kristen';
        else if (rawAgama.includes('katolik') || rawAgama.includes('catholic')) agamaVal = 'Katolik';
        else if (rawAgama.includes('hindu')) agamaVal = 'Hindu';
        else if (rawAgama.includes('buddha') || rawAgama.includes('budha')) agamaVal = 'Buddha';
        else if (rawAgama.includes('khonghucu') || rawAgama.includes('konghucu')) agamaVal = 'Khonghucu';
        else agamaVal = 'Islam';
      }

      const nisnVal = nisnKey && row[nisnKey] ? String(row[nisnKey]).trim() : '';
      const isDuplicate = existingNamesSet.has(nameVal.toLowerCase());

      list.push({
        name: nameVal,
        assignedClass: classVal,
        agama: agamaVal,
        nisn: nisnVal,
        selected: true,
        isDuplicate,
      });
    });

    setParsedStudents(list);
    setErrorMsg(list.length === 0 ? 'Tidak ada data siswa yang valid ditemukan dalam file.' : null);
  };

  // 3. Handle File Upload (Excel, CSV, PDF, TXT)
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        processRawRows(jsonData);
      } else if (ext === 'txt' || ext === 'pdf' || ext === 'doc' || ext === 'docx') {
        // Read text content
        const text = await file.text();
        parseTextLines(text);
      } else {
        // Fallback or attempt binary read
        const text = await file.text();
        parseTextLines(text);
      }
    } catch (err: any) {
      console.error('Error reading file:', err);
      setErrorMsg('Gagal membaca file. Pastikan format file Excel/CSV/PDF text sesuai.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Parse Raw Text (from PDF export / TXT / Paste Area)
  const parseTextLines = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: Record<string, any>[] = [];

    lines.forEach((line) => {
      // Split by tab, comma, or multiple spaces
      const parts = line.split(/\t|,|;|\s{2,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) return;

      // Try matching name, class, agama, nisn
      let namePart = parts[0];
      let classPart = parts.find((p) => /^[789][A-K]$/i.test(p)) || '';
      let agamaPart = parts.find((p) => /islam|kristen|katolik|hindu|buddha|khonghucu/i.test(p)) || 'Islam';
      let nisnPart = parts.find((p) => /^\d{8,12}$/.test(p)) || '';

      // If line is just "1. Budi Santoso", second part might be name
      if (/^\d+[\.\)]?$/.test(parts[0]) && parts.length > 1) {
        namePart = parts[1];
      }

      if (namePart && namePart.length >= 2 && !/nama|kelas|nisn|no|daftar/i.test(namePart)) {
        rows.push({
          'NAMA LENGKAP': namePart,
          'KELAS': classPart || defaultClass,
          'AGAMA': agamaPart,
          'NISN': nisnPart,
        });
      }
    });

    processRawRows(rows);
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      parseTextLines(pasteText);
      setIsLoading(false);
    }, 200);
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Toggle selection
  const toggleSelect = (index: number) => {
    setParsedStudents((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const toggleSelectAll = (selectAll: boolean) => {
    setParsedStudents((prev) => prev.map((s) => ({ ...s, selected: selectAll })));
  };

  // Save imported users to storage
  const handleSaveImport = () => {
    const toImport = parsedStudents.filter((s) => s.selected);
    if (toImport.length === 0) {
      alert('Pilih setidaknya satu siswa untuk diimpor.');
      return;
    }

    const currentUsers = getStoredUsers();
    const newUsers: User[] = [];

    toImport.forEach((item, idx) => {
      const cleanName = item.name.trim();
      // Check if user already exists
      const existing = currentUsers.find((u) => u.name.toLowerCase() === cleanName.toLowerCase());

      if (existing) {
        // Update class or agama if changed
        existing.assignedClass = item.assignedClass;
        existing.agama = item.agama;
        if (item.nisn) existing.nisn = item.nisn;
      } else {
        newUsers.push({
          id: `usr-siswa-${Date.now()}-${idx}`,
          username: cleanName,
          name: cleanName,
          role: 'siswa',
          assignedClass: item.assignedClass,
          agama: item.agama,
          nisn: item.nisn || undefined,
        });
      }
    });

    const updatedList = [...currentUsers, ...newUsers];
    saveStoredUsers(updatedList);
    onSuccessImport(toImport.length);
    onClose();
  };

  const selectedCount = parsedStudents.filter((s) => s.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                Import Data Siswa (Excel / PDF)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tambahkan banyak siswa sekaligus dari file Excel (.xlsx, .csv) atau dokumen PDF/Text.
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

        {/* Action Controls & Template Download */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Tentukan Kelas:</span>
            <select
              value={selectedClassOverride}
              onChange={(e) => setSelectedClassOverride(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-blue-900 outline-none"
            >
              <option value="AUTO">-- Ikuti Kolom File --</option>
              <option value="7A">Kelas 7A</option>
              <option value="7B">Kelas 7B</option>
              <option value="7C">Kelas 7C</option>
              <option value="7D">Kelas 7D</option>
              <option value="7E">Kelas 7E</option>
              <option value="7F">Kelas 7F</option>
              <option value="7G">Kelas 7G</option>
              <option value="7H">Kelas 7H</option>
              <option value="7I">Kelas 7I</option>
              <option value="7J">Kelas 7J</option>
              <option value="7K">Kelas 7K</option>
              <option value="8A">Kelas 8A</option>
              <option value="8B">Kelas 8B</option>
              <option value="8C">Kelas 8C</option>
              <option value="8D">Kelas 8D</option>
              <option value="8E">Kelas 8E</option>
              <option value="8F">Kelas 8F</option>
              <option value="8G">Kelas 8G</option>
              <option value="8H">Kelas 8H</option>
              <option value="8I">Kelas 8I</option>
              <option value="8J">Kelas 8J</option>
              <option value="8K">Kelas 8K</option>
              <option value="9A">Kelas 9A</option>
              <option value="9B">Kelas 9B</option>
              <option value="9C">Kelas 9C</option>
              <option value="9D">Kelas 9D</option>
              <option value="9E">Kelas 9E</option>
              <option value="9F">Kelas 9F</option>
              <option value="9G">Kelas 9G</option>
              <option value="9H">Kelas 9H</option>
              <option value="9I">Kelas 9I</option>
              <option value="9J">Kelas 9J</option>
            </select>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Unduh Template Excel (.xlsx)
          </button>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-600" /> Upload File (Excel, CSV, PDF, TXT)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" /> Salin / Tempel Teks Daftar Siswa
          </button>
        </div>

        {/* TAB 1: FILE UPLOAD ZONE */}
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
              accept=".xlsx, .xls, .csv, .pdf, .txt, .doc, .docx"
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              className="hidden"
            />

            <div className="w-14 h-14 mx-auto mb-3 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Upload className="w-7 h-7" />
            </div>

            <h3 className="text-sm font-extrabold text-slate-800">
              {fileName ? `File Terpilih: ${fileName}` : 'Tarik & Lepas File di Sini, atau Klik untuk Memilih File'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Mendukung file Format <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV (.csv)</strong>, atau dokumen <strong>PDF / Text (.pdf, .txt)</strong>.
            </p>
          </div>
        )}

        {/* TAB 2: COPY PASTE TEXT AREA */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Tempelkan daftar siswa di sini, contoh:\n1. Ahmad Fauzi - 7A - Islam - 0081234567\n2. Bunga Citra - 7A - Kristen\n3. Dewa Ketut - 8A - Hindu`}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" /> Proses Teks Siswa
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PARSED PREVIEW TABLE */}
        {parsedStudents.length > 0 && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pratinjau Data Siswa Terdeteksi ({parsedStudents.length} siswa)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Periksa dan centang siswa yang ingin dimasukkan ke dalam database.
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

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
              {parsedStudents.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    s.selected ? 'bg-blue-50/50' : 'opacity-60 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={s.selected}
                      onChange={() => toggleSelect(idx)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{s.name}</span>
                        {s.isDuplicate && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                            Sudah Ada
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Kelas {s.assignedClass}</span>
                        <span>•</span>
                        <span>Agama {s.agama}</span>
                        {s.nisn && (
                          <>
                            <span>•</span>
                            <span>NISN: {s.nisn}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400">
                      Password default: {s.name.split(' ')[0]}123
                    </span>
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
            <span>Simpan ({selectedCount}) Siswa ke Sistem</span>
          </button>
        </div>
      </div>
    </div>
  );
};
