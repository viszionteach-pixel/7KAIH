import React, { useState, useEffect } from 'react';
import {
  Shield, Users, UserPlus, Settings, Database, RefreshCw, Key,
  CheckCircle2, Trash2, Edit, Save, AlertTriangle, FileSpreadsheet, Lock, Upload,
  Building2, Image as ImageIcon, RotateCcw, Award, FileText
} from 'lucide-react';
import { User, Role, ClassName, MonthlyReportConfig } from '../../types';
import { ALL_CLASSES } from '../../data/initialData';
import {
  getStoredUsers, saveStoredUsers, getStoredSchoolConfig, saveStoredSchoolConfig,
  saveCustomPassword, resetAllDataToDefault, getStoredLogs
} from '../../services/storage';
import { StudentImportModal } from './StudentImportModal';

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<MonthlyReportConfig>(getStoredSchoolConfig());
  const [activeTab, setActiveTab] = useState<'users' | 'config' | 'classes' | 'data'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Form State for Add User
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('siswa');
  const [newUserClass, setNewUserClass] = useState<ClassName>('7A');
  const [newUserAgama, setNewUserAgama] = useState<'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu'>('Islam');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Password Reset Modal
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // School Identity & Config Form State
  const [namaSekolah, setNamaSekolah] = useState(schoolConfig.namaSekolah || 'SMP NEGERI 10 BALIKPAPAN');
  const [alamatSekolah, setAlamatSekolah] = useState(
    schoolConfig.alamatSekolah || 'Jl. Strat 3 No. 45, Gunung Samarinda, Kec. Balikpapan Utara, Kota Balikpapan, Kalimantan Timur 76125'
  );
  const [logoUrl, setLogoUrl] = useState(schoolConfig.logoUrl || '/logo_smpn10.jpg');
  const [stempelUrl, setStempelUrl] = useState(schoolConfig.stempelUrl || '');

  const [namaKepala, setNamaKepala] = useState(schoolConfig.namaKepalaSekolah);
  const [nipKepala, setNipKepala] = useState(schoolConfig.nipKepalaSekolah || '');
  const [namaWali, setNamaWali] = useState(schoolConfig.namaWaliKelas);
  const [nipWali, setNipWali] = useState(schoolConfig.nipWaliKelas || '');

  useEffect(() => {
    const loadData = () => {
      setUsers(getStoredUsers());
      const cfg = getStoredSchoolConfig();
      setSchoolConfig(cfg);
      setNamaSekolah(cfg.namaSekolah || 'SMP NEGERI 10 BALIKPAPAN');
      setAlamatSekolah(cfg.alamatSekolah || 'Jl. Strat 3 No. 45, Gunung Samarinda, Kec. Balikpapan Utara, Kota Balikpapan, Kalimantan Timur 76125');
      setLogoUrl(cfg.logoUrl || '/logo_smpn10.jpg');
      setStempelUrl(cfg.stempelUrl || '');
      setNamaKepala(cfg.namaKepalaSekolah);
      setNipKepala(cfg.nipKepalaSekolah || '');
      setNamaWali(cfg.namaWaliKelas);
      setNipWali(cfg.nipWaliKelas || '');
    };
    loadData();

    window.addEventListener('kaih_data_updated', loadData);
    return () => {
      window.removeEventListener('kaih_data_updated', loadData);
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.assignedClass && u.assignedClass.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  // Handle Add User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: newUserName.trim(),
      name: newUserName.trim(),
      role: newUserRole,
      assignedClass: newUserRole === 'siswa' || newUserRole === 'wali_kelas' ? newUserClass : undefined,
      agama: newUserAgama,
    };

    const updated = [...users, newUser];
    saveStoredUsers(updated);
    setUsers(updated);

    if (newUserPassword.trim()) {
      saveCustomPassword(newUser.id, newUserPassword.trim());
    }

    setIsAddingUser(false);
    setNewUserName('');
    setNewUserPassword('');
  };

  // Handle Password Reset
  const handleConfirmResetPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !newPasswordVal.trim()) return;

    saveCustomPassword(resetPassUser.id, newPasswordVal.trim());
    setResetPassUser(null);
    setNewPasswordVal('');
    alert(`Password untuk ${resetPassUser.name} berhasil diubah!`);
  };

  // Image upload helpers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran file logo terlalu besar. Maksimal 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStempelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran file stempel terlalu besar. Maksimal 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setStempelUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Save School Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: MonthlyReportConfig = {
      ...schoolConfig,
      namaSekolah: namaSekolah.trim() || 'SMP NEGERI 10 BALIKPAPAN',
      alamatSekolah: alamatSekolah.trim(),
      logoUrl: logoUrl.trim() || '/logo_smpn10.jpg',
      stempelUrl: stempelUrl.trim(),
      namaKepalaSekolah: namaKepala.trim(),
      nipKepalaSekolah: nipKepala.trim(),
      namaWaliKelas: namaWali.trim(),
      nipWaliKelas: nipWali.trim(),
    };
    saveStoredSchoolConfig(updated);
    setSchoolConfig(updated);
    alert('Identitas Sekolah, Logo, Stempel & TTD Berhasil Disimpan!');
  };

  // Handle Reset System Data
  const handleResetSystem = () => {
    if (confirm('APAKAH ANDA YAKIN? Tindakan ini akan mengembalikan data pengguna dan presensi ke setelan awal pabrik!')) {
      resetAllDataToDefault();
      window.location.reload();
    }
  };

  const adminAccounts = users.filter((u) => u.role === 'admin');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-rose-800">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" /> Konsol Admin KAIH (3 Akses Penuh)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Konsol Administrator Utama
          </h1>
          <p className="text-xs sm:text-sm text-rose-200 max-w-xl">
            Pengguna Saat Ini: <strong>{currentUser.name}</strong> ({currentUser.adminTitle || 'Admin Console'}). Akses pengelolaan akun 32 kelas, reset password, dan pengaturan cetak laporan.
          </p>
        </div>

        {/* 3 Admin Accounts Badge */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700 text-xs space-y-2 shrink-0">
          <p className="font-bold text-amber-400">3 Konsol Admin Terdaftar:</p>
          <div className="space-y-1">
            {adminAccounts.map((adm) => (
              <div key={adm.id} className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{adm.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'users' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Manajemen Pengguna ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'classes' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" /> Distribusi 32 Kelas
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'config' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" /> Identitas, Logo & Stempel Sekolah
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'data' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" /> Data Master & System
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-600" />
                Daftar Pengguna Sistem KAIH
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola Siswa, Wali Kelas, Guru BK, dan Admin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="ALL">-- Semua Peran --</option>
                <option value="siswa">Siswa</option>
                <option value="wali_kelas">Wali Kelas</option>
                <option value="guru_bk">Guru BK</option>
                <option value="admin">Admin</option>
              </select>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-4 h-4" /> Import Excel / PDF
              </button>

              <button
                onClick={() => setIsAddingUser(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Tambah Akun Baru
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Nama Lengkap</th>
                  <th className="py-3.5 px-6">Username</th>
                  <th className="py-3.5 px-6">Peran</th>
                  <th className="py-3.5 px-6">Kelas</th>
                  <th className="py-3.5 px-6 text-right">Kelola Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-4 px-6 font-bold text-slate-900">{u.name}</td>
                    <td className="py-4 px-6 text-slate-600">{u.username}</td>
                    <td className="py-4 px-6 font-bold">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-extrabold ${
                        u.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                        u.role === 'guru_bk' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'wali_kelas' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-700">{u.assignedClass || '-'}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setResetPassUser(u)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1"
                      >
                        <Key className="w-3.5 h-3.5" /> Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: 32 CLASSES DISTRIBUTION */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Distribusi 32 Kelas SMPN 10 Balikpapan</h3>
            <p className="text-xs text-slate-500 mt-1">
              Kelas 7 (11 kelas: 7A-7K), Kelas 8 (11 kelas: 8A-8K), Kelas 9 (10 kelas: 9A-9J).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {ALL_CLASSES.map((cls) => {
              const classUserCount = users.filter((u) => u.assignedClass === cls && u.role === 'siswa').length;
              const wk = users.find((u) => u.assignedClass === cls && u.role === 'wali_kelas');
              return (
                <div key={cls} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="text-lg font-black text-blue-900">Kelas {cls}</span>
                  <p className="text-[11px] font-bold text-slate-600 mt-1">{classUserCount} Siswa</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate" title={wk?.name}>
                    WK: {wk ? wk.name : 'Belum diset'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SCHOOL CONFIG (IDENTITAS, LOGO, STEMPEL & TTD) */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-4xl space-y-8">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-rose-600" />
              Pengaturan Identitas Sekolah, Logo, Stempel & Kop Surat
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Atur nama sekolah, alamat, logo resmi, stempel basah, serta pejabat penandatangan laporan bulanan siswa.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-8 text-xs">
            {/* BAGIAN 1: IDENTITAS UTAMA SEKOLAH */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-200 pb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>1. Identitas & Kop Surat Resmi Sekolah</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Resmi Sekolah:</label>
                  <input
                    type="text"
                    value={namaSekolah}
                    onChange={(e) => setNamaSekolah(e.target.value)}
                    placeholder="Contoh: SMP NEGERI 10 BALIKPAPAN"
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl font-extrabold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nama ini akan ditampilkan pada Kop Surat, Sertifikat, dan Header aplikasi.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap & Kota Sekolah:</label>
                  <textarea
                    rows={2}
                    value={alamatSekolah}
                    onChange={(e) => setAlamatSekolah(e.target.value)}
                    placeholder="Jl. Strat 3 No. 45, Gunung Samarinda, Kec. Balikpapan Utara..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN 2: LOGO SEKOLAH */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>2. Logo Resmi Sekolah</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoUrl('/logo_smpn10.jpg')}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Gunakan Logo Default SMPN 10
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Logo Preview */}
                <div className="relative shrink-0 flex flex-col items-center gap-1.5">
                  <div className="w-24 h-24 rounded-2xl border-2 border-slate-300 p-2 bg-white flex items-center justify-center shadow-md overflow-hidden">
                    <img
                      src={logoUrl}
                      alt="Pratinjau Logo"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo_smpn10.jpg';
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Pratinjau Logo</span>
                </div>

                {/* Upload Controls */}
                <div className="space-y-2 flex-1 w-full">
                  <label className="block font-bold text-slate-700 mb-1">Upload File Logo Baru (PNG / JPG / WebP):</label>
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-2 shadow-sm transition-all text-xs">
                      <Upload className="w-4 h-4" /> Pilih File Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-500">Maksimal file 4MB</span>
                  </div>

                  <div className="mt-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Atau Masukkan URL Logo (Opsional):</label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://... / path logo"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BAGIAN 3: STEMPEL RESMI SEKOLAH */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>3. Stempel Resmi Sekolah (Untuk Cap TTD Laporan)</span>
                </div>
                {stempelUrl && (
                  <button
                    type="button"
                    onClick={() => setStempelUrl('')}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Stempel
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Stempel Preview */}
                <div className="relative shrink-0 flex flex-col items-center gap-1.5">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 p-2 bg-white flex items-center justify-center shadow-sm overflow-hidden relative">
                    {stempelUrl ? (
                      <img
                        src={stempelUrl}
                        alt="Stempel Sekolah"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Award className="w-8 h-8 mx-auto mb-1 opacity-30" />
                        <span className="text-[9px] font-bold block leading-tight">Belum Ada Stempel</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Pratinjau Stempel</span>
                </div>

                {/* Upload Stempel Controls */}
                <div className="space-y-2 flex-1 w-full">
                  <label className="block font-bold text-slate-700 mb-1">Upload File Stempel Basah (Format PNG Transparan disarankan):</label>
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-2 shadow-sm transition-all text-xs">
                      <Upload className="w-4 h-4" /> Upload Gambar Stempel
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleStempelUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-500">Otomatis muncul pada TTD Kepala Sekolah</span>
                  </div>

                  <div className="mt-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Atau URL Gambar Stempel (Opsional):</label>
                    <input
                      type="text"
                      value={stempelUrl}
                      onChange={(e) => setStempelUrl(e.target.value)}
                      placeholder="https://... / data:image/png;base64..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BAGIAN 4: PEJABAT PENANDATANGAN */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>4. Pejabat Penandatangan Laporan Bulanan</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Kepala Sekolah:</label>
                  <input
                    type="text"
                    value={namaKepala}
                    onChange={(e) => setNamaKepala(e.target.value)}
                    placeholder="Drs. H. Ismail, M.Pd."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP Kepala Sekolah:</label>
                  <input
                    type="text"
                    value={nipKepala}
                    onChange={(e) => setNipKepala(e.target.value)}
                    placeholder="19680512 199403 1 005"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Default Wali Kelas:</label>
                  <input
                    type="text"
                    value={namaWali}
                    onChange={(e) => setNamaWali(e.target.value)}
                    placeholder="Endang Setyowati, S.Pd."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP Default Wali Kelas:</label>
                  <input
                    type="text"
                    value={nipWali}
                    onChange={(e) => setNipWali(e.target.value)}
                    placeholder="19750814 200212 2 003"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" /> Simpan Pengaturan Identitas & Kop Surat
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: DATA MASTER & SYSTEM */}
      {activeTab === 'data' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-2xl space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-rose-600" />
              Pemulihan & Master Data Sistem
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Reset atau kembalikan data awal demo jika diperlukan saat pengujian.
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-3">
            <h4 className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Reset ke Data Awal Pabrik
            </h4>
            <p className="leading-relaxed">
              Tindakan ini akan mengosongkan log tambahan dan mengembalikan daftar 32 kelas, akun Wali Kelas, Guru BK, 3 Admin, serta sampel siswa.
            </p>
            <button
              onClick={handleResetSystem}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> Reset Data Pabrik
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Akun Pengguna Baru</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap / Username:</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Budi Gunawan"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses:</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as Role)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold"
                >
                  <option value="siswa">Siswa</option>
                  <option value="wali_kelas">Wali Kelas</option>
                  <option value="guru_bk">Guru BK</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {(newUserRole === 'siswa' || newUserRole === 'wali_kelas') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilih Kelas:</label>
                  <select
                    value={newUserClass}
                    onChange={(e) => setNewUserClass(e.target.value as ClassName)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold"
                  >
                    {ALL_CLASSES.map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
              )}

              {newUserRole === 'siswa' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Agama Siswa:</label>
                  <select
                    value={newUserAgama}
                    onChange={(e) => setNewUserAgama(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Custom Password (Opsional):</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Biarkan kosong untuk menggunakan rumus default"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Reset Password - {resetPassUser.name}
            </h3>
            <form onSubmit={handleConfirmResetPass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Baru:</label>
                <input
                  type="text"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl"
                >
                  Ubah Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Student Import Modal */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultClass="7A"
        onSuccessImport={(count) => {
          setUsers(getStoredUsers());
          alert(`Berhasil mengimpor ${count} siswa baru ke dalam sistem!`);
        }}
      />
    </div>
  );
};
