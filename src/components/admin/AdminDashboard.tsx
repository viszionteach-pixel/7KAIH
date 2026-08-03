import React, { useState, useEffect } from 'react';
import {
  Shield, Users, UserPlus, Settings, Database, RefreshCw, Key,
  CheckCircle2, Trash2, Edit, Save, AlertTriangle, FileSpreadsheet, Lock, Upload,
  Building2, Image as ImageIcon, RotateCcw, Award, FileText, Search, Plus, Eye, Filter, X,
  Download, CloudCheck, HardDrive
} from 'lucide-react';
import { User, Role, ClassName, MonthlyReportConfig } from '../../types';
import { ALL_CLASSES } from '../../data/initialData';
import {
  getStoredUsers, saveStoredUsers, getStoredSchoolConfig, saveStoredSchoolConfig,
  saveCustomPassword, getCustomPasswords, resetAllDataToDefault, getStoredLogs,
  exportFullBackupJSON, importFullBackupJSON, cleanAndResyncFirebaseCloud, getStoredBKNotes
} from '../../services/storage';
import { StudentImportModal } from './StudentImportModal';
import { ExportHabitsModal } from '../reports/ExportHabitsModal';
import { FirestoreDiagnostics } from './FirestoreDiagnostics';

import { compressImage } from '../../utils/imageCompressor';

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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [importTargetRole, setImportTargetRole] = useState<Role>('siswa');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('siswa');
  const [newUserClass, setNewUserClass] = useState<ClassName>('7A');
  const [newUserAgama, setNewUserAgama] = useState<'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu'>('Islam');
  const [newUserNip, setNewUserNip] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<Role>('siswa');
  const [editClass, setEditClass] = useState<ClassName>('7A');
  const [editAgama, setEditAgama] = useState<'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu'>('Islam');
  const [editAdminTitle, setEditAdminTitle] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Password Reset Modal
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Batch Operations State (Selection / Multi-edit / Multi-delete)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [batchTargetClass, setBatchTargetClass] = useState<ClassName>('7A');
  const [batchTargetAgama, setBatchTargetAgama] = useState<'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu'>('Islam');
  const [isBatchEditClassOpen, setIsBatchEditClassOpen] = useState(false);
  const [isBatchEditAgamaOpen, setIsBatchEditAgamaOpen] = useState(false);

  // Class Cards Management State
  const [classGradeFilter, setClassGradeFilter] = useState<'ALL' | '7' | '8' | '9'>('ALL');
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [selectedClassDetail, setSelectedClassDetail] = useState<ClassName | null>(null);
  const [selectedClassForImport, setSelectedClassForImport] = useState<ClassName>('7A');
  const [studentSearchInClassModal, setStudentSearchInClassModal] = useState('');

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

  // Save status & unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [lastActionInfo, setLastActionInfo] = useState<string | null>(null);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<string | null>(null);
  const [isResyncingFirebase, setIsResyncingFirebase] = useState<boolean>(false);

  // Unified Save All Function
  const executeSaveAll = async () => {
    // 1. Save users
    saveStoredUsers(users);

    // 2. Save school config
    const updatedConfig: MonthlyReportConfig = {
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
    saveStoredSchoolConfig(updatedConfig);
    setSchoolConfig(updatedConfig);

    // 3. Purge orphaned data and resync to Firebase Firestore
    await cleanAndResyncFirebaseCloud();

    setHasUnsavedChanges(false);
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const msg = `Semua perubahan data berhasil disimpan dan disinkronkan ke Firebase Firestore pada jam ${timeStr}!`;
    setSaveSuccessNotification(msg);
    setLastActionInfo(null);

    alert('✓ Berhasil menyimpan seluruh perubahan data dan menyinkronkan data ke Google Firebase Firestore!');

    setTimeout(() => {
      setSaveSuccessNotification(null);
    }, 6000);
  };

  const handleCleanAndResyncFirebase = async () => {
    if (confirm('Apakah Anda yakin ingin menyinkronkan dan memperbarui seluruh data aktif ke Firebase Firestore?')) {
      setIsResyncingFirebase(true);
      const success = await cleanAndResyncFirebaseCloud();
      setIsResyncingFirebase(false);
      if (success) {
        setUsers(getStoredUsers());
        alert('✓ Berhasil! Data telah disinkronkan sepenuhnya ke Firebase Firestore!');
      } else {
        alert('Gagal menyinkronkan data ke Firebase. Silakan periksa koneksi internet Anda.');
      }
    }
  };

  const hasUnsavedChangesRef = React.useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const loadData = () => {
      setUsers(getStoredUsers());
      if (!hasUnsavedChangesRef.current) {
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
      }
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
      nip: newUserNip.trim() || undefined,
    };

    const updated = [...users, newUser];
    saveStoredUsers(updated);
    setUsers(updated);

    if (newUserPassword.trim()) {
      saveCustomPassword(newUser.id, newUserPassword.trim());
    }

    setIsAddingUser(false);
    setNewUserName('');
    setNewUserNip('');
    setNewUserPassword('');

    setHasUnsavedChanges(true);
    setLastActionInfo(`Penambahan akun baru "${newUser.name}" (${newUser.role})`);
    alert(`Akun "${newUser.name}" berhasil ditambahkan! Klik "Simpan Perubahan" untuk konfirmasi.`);
  };

  // Helper for Class Card Actions
  const handleOpenAddStudentForClass = (clsName: ClassName) => {
    setNewUserRole('siswa');
    setNewUserClass(clsName);
    setIsAddingUser(true);
  };

  const handleOpenImportForClass = (clsName: ClassName) => {
    setSelectedClassForImport(clsName);
    setIsImportModalOpen(true);
  };

  // Helper for Edit User
  const handleOpenEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditName(userToEdit.name);
    setEditUsername(userToEdit.username);
    setEditRole(userToEdit.role);
    setEditClass(userToEdit.assignedClass || '7A');
    setEditAgama(userToEdit.agama || 'Islam');
    setEditAdminTitle(userToEdit.adminTitle || '');
    setEditNip(userToEdit.nip || '');
    
    // Check if custom password exists
    const customPasswords = getCustomPasswords();
    setEditPassword(customPasswords[userToEdit.id] || '');
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim()) return;

    const updatedUser: User = {
      ...editingUser,
      name: editName.trim(),
      username: editUsername.trim() || editName.trim(),
      role: editRole,
      assignedClass: editRole === 'siswa' || editRole === 'wali_kelas' ? editClass : undefined,
      agama: editRole === 'siswa' ? editAgama : editingUser.agama,
      adminTitle: editRole === 'admin' ? editAdminTitle.trim() : undefined,
      nip: editNip.trim() || undefined,
    };

    const updatedUsers = users.map((u) => (u.id === editingUser.id ? updatedUser : u));
    saveStoredUsers(updatedUsers);
    setUsers(updatedUsers);

    if (editPassword.trim()) {
      saveCustomPassword(editingUser.id, editPassword.trim());
    }

    setEditingUser(null);
    setHasUnsavedChanges(true);
    setLastActionInfo(`Edit data akun "${updatedUser.name}"`);
    alert(`Data akun "${updatedUser.name}" berhasil diperbarui! Klik "Simpan Perubahan" untuk konfirmasi.`);
  };

  const handleDeleteUser = (userToDelete: User) => {
    const roleLabel =
      userToDelete.role === 'admin'
        ? 'Admin'
        : userToDelete.role === 'guru_bk'
        ? 'Guru BK'
        : userToDelete.role === 'wali_kelas'
        ? `Wali Kelas ${userToDelete.assignedClass || ''}`
        : `Siswa Kelas ${userToDelete.assignedClass || ''}`;

    if (confirm(`Apakah Anda yakin ingin MENGHAPUS akun ${roleLabel} "${userToDelete.name}"?`)) {
      const updated = users.filter((u) => u.id !== userToDelete.id);
      saveStoredUsers(updated);
      setUsers(updated);
      setHasUnsavedChanges(true);
      setLastActionInfo(`Penghapusan akun "${userToDelete.name}"`);
      alert(`Akun "${userToDelete.name}" telah dihapus dari daftar local state. Klik "Simpan Perubahan" untuk menyinkronkan ke Cloud.`);
    }
  };

  // Handle Password Reset
  const handleConfirmResetPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !newPasswordVal.trim()) return;

    saveCustomPassword(resetPassUser.id, newPasswordVal.trim());
    setResetPassUser(null);
    setNewPasswordVal('');
    setHasUnsavedChanges(true);
    setLastActionInfo(`Reset password akun "${resetPassUser.name}"`);
    alert(`Password untuk ${resetPassUser.name} berhasil diubah! Klik "Simpan Perubahan" untuk menyinkronkan.`);
  };

  // Batch Selection & Batch Actions Handlers
  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (userList: User[]) => {
    const listIds = userList.map((u) => u.id);
    const allSelected = listIds.length > 0 && listIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !listIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...listIds])));
    }
  };

  const handleBatchDelete = () => {
    if (selectedUserIds.length === 0) return;
    if (confirm(`Apakah Anda YAKIN ingin MENGHAPUS ${selectedUserIds.length} data pengguna/siswa yang diceklis sekaligus?`)) {
      const count = selectedUserIds.length;
      const updated = users.filter((u) => !selectedUserIds.includes(u.id));
      saveStoredUsers(updated);
      setUsers(updated);
      setSelectedUserIds([]);
      setHasUnsavedChanges(true);
      setLastActionInfo(`Penghapusan massal ${count} data akun pengguna`);
      alert(`Berhasil menghapus ${count} data akun terpilih! Klik "Simpan Perubahan" untuk menyinkronkan seluruhnya ke Cloud.`);
    }
  };

  const handleBatchUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;
    const count = selectedUserIds.length;
    const updated = users.map((u) => {
      if (selectedUserIds.includes(u.id)) {
        return { ...u, assignedClass: batchTargetClass };
      }
      return u;
    });
    saveStoredUsers(updated);
    setUsers(updated);
    setSelectedUserIds([]);
    setIsBatchEditClassOpen(false);
    setHasUnsavedChanges(true);
    setLastActionInfo(`Pindah kelas massal ${count} siswa ke Kelas ${batchTargetClass}`);
    alert(`Berhasil memindahkan ${count} siswa terpilih ke Kelas ${batchTargetClass}! Klik "Simpan Perubahan" untuk konfirmasi.`);
  };

  const handleBatchUpdateAgama = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;
    const count = selectedUserIds.length;
    const updated = users.map((u) => {
      if (selectedUserIds.includes(u.id)) {
        return { ...u, agama: batchTargetAgama };
      }
      return u;
    });
    saveStoredUsers(updated);
    setUsers(updated);
    setSelectedUserIds([]);
    setIsBatchEditAgamaOpen(false);
    setHasUnsavedChanges(true);
    setLastActionInfo(`Ubah agama massal ${count} siswa menjadi ${batchTargetAgama}`);
    alert(`Berhasil mengubah agama ${count} siswa terpilih menjadi ${batchTargetAgama}! Klik "Simpan Perubahan" untuk konfirmasi.`);
  };

  // Image upload helpers (Auto-compressed to ~30-50KB for fast Vercel & Firestore sync)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file logo terlalu besar. Maksimal 10MB.');
      return;
    }
    try {
      const compressedDataUrl = await compressImage(file, 400, 0.85);
      if (compressedDataUrl) {
        setLogoUrl(compressedDataUrl);
        setHasUnsavedChanges(true);
        setLastActionInfo('Upload logo baru sekolah');
      }
    } catch (err) {
      console.error('Gagal memproses file logo:', err);
      alert('Gagal memproses file logo. Pastikan format file adalah gambar valid (PNG/JPG/WebP/SVG).');
    }
  };

  const handleStempelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file stempel terlalu besar. Maksimal 10MB.');
      return;
    }
    try {
      const compressedDataUrl = await compressImage(file, 400, 0.85);
      if (compressedDataUrl) {
        setStempelUrl(compressedDataUrl);
        setHasUnsavedChanges(true);
        setLastActionInfo('Upload stempel baru sekolah');
      }
    } catch (err) {
      console.error('Gagal memproses file stempel:', err);
      alert('Gagal memproses file stempel. Pastikan format file adalah gambar valid.');
    }
  };

  // Handle Save School Config Form Submit
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    executeSaveAll();
  };

  // Backup & Restore Handlers
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleExportBackup = () => {
    exportFullBackupJSON();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        if (confirm('APAKAH ANDA YAKIN? Mengimpor file backup akan memperbarui seluruh data sekolah (logo, identitas), akun pengguna, password, log presensi, dan catatan BK.')) {
          const result = importFullBackupJSON(text);
          if (result.success) {
            setUsers(getStoredUsers());
            setSchoolConfig(getStoredSchoolConfig());
            setRestoreStatus(
              `Berhasil memulihkan ${result.stats?.usersCount || 0} akun pengguna, ${result.stats?.logsCount || 0} log presensi, ${result.stats?.bkNotesCount || 0} catatan BK, serta identitas & logo sekolah!`
            );
            alert(result.message);
          } else {
            alert(`Gagal restorasi: ${result.message}`);
          }
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
            <Shield className="w-3.5 h-3.5" /> Konsol Kepala Sekolah & Administrator KAIH
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Konsol Akses Kepala Sekolah / Admin Utama
          </h1>
          <p className="text-xs sm:text-sm text-rose-200 max-w-xl">
            Pengguna Saat Ini: <strong>{currentUser.name}</strong> ({currentUser.adminTitle || 'Admin Console'}). Akses pengelolaan akun 32 kelas, reset password, dan pengaturan cetak laporan.
          </p>
        </div>

        {/* 3 Admin Accounts Badge & Direct Quick Save Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 text-xs space-y-1.5 w-full sm:w-auto">
            <p className="font-bold text-amber-400 text-[11px]">3 Konsol Admin Terdaftar:</p>
            <div className="space-y-1">
              {adminAccounts.map((adm) => (
                <div key={adm.id} className="flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>{adm.name}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={executeSaveAll}
            className={`w-full sm:w-auto px-5 py-4 font-black text-xs rounded-2xl shadow-xl transition-all flex flex-col items-center justify-center gap-1 border ${
              hasUnsavedChanges
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-900 border-amber-300 ring-4 ring-amber-400/30 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
            }`}
            title="Klik untuk menyimpan dan menyinkronkan seluruh perubahan ke Cloud"
          >
            <div className="flex items-center gap-1.5 text-sm">
              <Save className="w-4 h-4" />
              <span>{hasUnsavedChanges ? 'SIMPAN PERUBAHAN!' : 'SIMPAN DATA'}</span>
            </div>
            <span className="text-[10px] font-semibold opacity-90">
              {hasUnsavedChanges ? '● Ada Perubahan Terbaru' : '✓ Data Tersimpan'}
            </span>
          </button>
        </div>
      </div>

      {/* ACTIVE SAVE BANNER - Highlighted when admin adds, edits, or deletes data */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 ${
        hasUnsavedChanges
          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white border-amber-300 ring-2 ring-amber-400/40'
          : 'bg-slate-900 text-white border-slate-800'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-md ${
            hasUnsavedChanges ? 'bg-white text-rose-600' : 'bg-emerald-500 text-white'
          }`}>
            {hasUnsavedChanges ? <Save className="w-6 h-6 animate-bounce" /> : <CloudCheck className="w-6 h-6" />}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                hasUnsavedChanges
                  ? 'bg-white text-rose-800 font-extrabold shadow-xs'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {hasUnsavedChanges ? '● PERUBAHAN BARU TERDETEKSI' : '✓ STATUS SINKRONISASI CLOUD'}
              </span>
              {lastActionInfo && (
                <span className="text-[11px] font-bold text-amber-100 hidden md:inline">
                  • {lastActionInfo}
                </span>
              )}
            </div>

            <h4 className="text-sm font-black tracking-tight">
              {hasUnsavedChanges
                ? 'Tombol Simpan Aktif: Klik tombol di samping untuk menyimpan seluruh penambahan, edit, atau hapus data!'
                : 'Semua perubahan data (penambahan, edit, & hapus) tersimpan rapi di Cloud & lokal.'}
            </h4>
            <p className="text-[11px] opacity-90 max-w-2xl">
              {hasUnsavedChanges
                ? lastActionInfo
                  ? `Perubahan Terakhir: ${lastActionInfo}. Pastikan mengeklik tombol "Simpan Perubahan Sekarang" agar tersimpan permanen.`
                  : 'Data telah berubah. Silakan klik tombol Simpan di sebelah kanan.'
                : saveSuccessNotification || 'Data disinkronkan secara realtime dengan Supabase Cloud Database & penyimpanan browser.'}
            </p>
          </div>
        </div>

        <button
          onClick={executeSaveAll}
          className={`px-6 py-3.5 font-black text-xs rounded-xl shadow-xl transition-all flex items-center gap-2 shrink-0 ${
            hasUnsavedChanges
              ? 'bg-white hover:bg-slate-100 text-slate-900 border-2 border-white hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{hasUnsavedChanges ? 'SIMPAN PERUBAHAN SEKARANG' : 'Konfirmasi Simpan Data'}</span>
        </button>
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
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, username, kelas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 w-48 sm:w-60"
                />
              </div>

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
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                title="Export Laporan Kebiasaan Siswa (CSV / Excel / PDF)"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export CSV / PDF
              </button>

              <button
                onClick={() => {
                  setImportTargetRole('siswa');
                  setIsImportModalOpen(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" /> Import Siswa (Gambar/File)
              </button>

              <button
                onClick={() => {
                  setImportTargetRole('wali_kelas');
                  setIsImportModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <ImageIcon className="w-4 h-4" /> Import Wali Kelas (Gambar/File)
              </button>

              <button
                onClick={() => setIsAddingUser(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Tambah Akun Baru
              </button>
            </div>
          </div>

          {/* BATCH ACTION BAR WHEN ITEMS ARE CHECKED */}
          {selectedUserIds.length > 0 && (
            <div className="mx-6 p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl border border-slate-800 animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="bg-rose-600 text-white font-extrabold px-3 py-1 rounded-full text-xs">
                  {selectedUserIds.length} Akun Dipilih
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Tindakan Sekaligus (Batch Actions):
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsBatchEditClassOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Edit className="w-3.5 h-3.5" /> Ubah Kelas Sekaligus
                </button>
                <button
                  onClick={() => setIsBatchEditAgamaOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Award className="w-3.5 h-3.5" /> Ubah Agama Sekaligus
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus ({selectedUserIds.length}) Terpilih
                </button>
                <button
                  onClick={() => setSelectedUserIds([])}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Batal Pilih
                </button>
              </div>
            </div>
          )}

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredUsers.length > 0 &&
                        filteredUsers.every((u) => selectedUserIds.includes(u.id))
                      }
                      onChange={() => toggleSelectAll(filteredUsers)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                      title="Pilih / Batal Pilih Semua di Tampilan Ini"
                    />
                  </th>
                  <th className="py-3.5 px-6">Nama Lengkap</th>
                  <th className="py-3.5 px-6">Username / Login ID</th>
                  <th className="py-3.5 px-6">Peran / Hak Akses</th>
                  <th className="py-3.5 px-6">Kelas / Jabatan</th>
                  <th className="py-3.5 px-6 text-right">Tindakan Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-rose-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectUser(u.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                        />
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {u.name}
                        {u.nip && (
                          <span className="block text-[10px] text-slate-500 font-mono font-normal">NIP. {u.nip}</span>
                        )}
                        {u.adminTitle && (
                          <span className="block text-[10px] text-slate-400 font-normal">{u.adminTitle}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600">{u.username}</td>
                      <td className="py-4 px-6 font-bold">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-extrabold ${
                          u.role === 'admin' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          u.role === 'guru_bk' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          u.role === 'wali_kelas' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {u.role === 'admin' ? 'ADMIN KONSOL' :
                           u.role === 'guru_bk' ? 'GURU BK' :
                           u.role === 'wali_kelas' ? 'WALI KELAS' :
                           'SISWA'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-700">
                        {u.assignedClass ? `Kelas ${u.assignedClass}` : u.role === 'guru_bk' ? 'Bimbingan Konseling' : u.role === 'admin' ? 'Super Admin' : '-'}
                      </td>
                      <td className="py-4 px-6 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg text-[11px] inline-flex items-center gap-1 transition-all"
                          title="Edit Data Pengguna"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit
                        </button>

                        <button
                          onClick={() => setResetPassUser(u)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[11px] inline-flex items-center gap-1 transition-all"
                          title="Reset Password Akun"
                        >
                          <Key className="w-3.5 h-3.5" /> Password
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-lg text-[11px] inline-flex items-center gap-1 transition-all"
                          title="Hapus Akun Pengguna"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: 32 CLASSES DISTRIBUTION & DIRECT STUDENT MANAGEMENT */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Distribusi & Manajemen Siswa per Kartu Kelas (32 Kelas)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kelola pendaftaran siswa langsung melalui tiap kartu kelas. Klik "+ Tambah Siswa" untuk menambah anggota baru ke kelas tersebut.
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kelas (misal: 7A, 8B)..."
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
                />
              </div>

              {/* Grade Filter Pills */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
                <button
                  onClick={() => setClassGradeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    classGradeFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua (32)
                </button>
                <button
                  onClick={() => setClassGradeFilter('7')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    classGradeFilter === '7' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kelas 7 (11)
                </button>
                <button
                  onClick={() => setClassGradeFilter('8')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    classGradeFilter === '8' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kelas 8 (11)
                </button>
                <button
                  onClick={() => setClassGradeFilter('9')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    classGradeFilter === '9' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kelas 9 (10)
                </button>
              </div>
            </div>
          </div>

          {/* Grid of 32 Class Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ALL_CLASSES.filter((cls) => {
              const matchesGrade =
                classGradeFilter === 'ALL' ||
                (classGradeFilter === '7' && cls.startsWith('7')) ||
                (classGradeFilter === '8' && cls.startsWith('8')) ||
                (classGradeFilter === '9' && cls.startsWith('9'));
              const matchesSearch = cls.toLowerCase().includes(classSearchQuery.toLowerCase());
              return matchesGrade && matchesSearch;
            }).map((cls) => {
              const classStudents = users.filter((u) => u.role === 'siswa' && u.assignedClass && u.assignedClass.trim().toUpperCase() === cls.trim().toUpperCase());
              const classUserCount = classStudents.length;
              const wk = users.find((u) => u.role === 'wali_kelas' && u.assignedClass && u.assignedClass.trim().toUpperCase() === cls.trim().toUpperCase());
              const gradeNumber = cls.charAt(0);

              const colorScheme =
                gradeNumber === '7'
                  ? { bg: 'bg-blue-50/60', border: 'border-blue-200 hover:border-blue-400', badge: 'bg-blue-100 text-blue-800', btn: 'bg-blue-600 hover:bg-blue-700' }
                  : gradeNumber === '8'
                  ? { bg: 'bg-purple-50/60', border: 'border-purple-200 hover:border-purple-400', badge: 'bg-purple-100 text-purple-800', btn: 'bg-purple-600 hover:bg-purple-700' }
                  : { bg: 'bg-rose-50/60', border: 'border-rose-200 hover:border-rose-400', badge: 'bg-rose-100 text-rose-800', btn: 'bg-rose-600 hover:bg-rose-700' };

              return (
                <div
                  key={cls}
                  className={`p-4 rounded-2xl border ${colorScheme.border} ${colorScheme.bg} transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-3 relative group`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colorScheme.badge}`}>
                        Tingkat {gradeNumber}
                      </span>
                      <span className="text-[11px] font-extrabold text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        {classUserCount} Siswa
                      </span>
                    </div>

                    <h4 className="text-xl font-black text-slate-900 tracking-tight">
                      Kelas {cls}
                    </h4>

                    <p className="text-[11px] text-slate-500 font-medium mt-1 truncate" title={wk ? `${wk.name}${wk.nip ? ` (NIP. ${wk.nip})` : ''}` : 'Wali kelas belum diset'}>
                      <strong>WK:</strong> {wk ? (
                        <span>
                          {wk.name} {wk.nip && <span className="text-[10px] text-slate-500 font-normal block">NIP. {wk.nip}</span>}
                        </span>
                      ) : <span className="text-amber-600 italic">Belum diset</span>}
                    </p>
                  </div>

                  {/* Class Card Actions */}
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <button
                      onClick={() => handleOpenAddStudentForClass(cls)}
                      className={`w-full py-2 px-3 ${colorScheme.btn} text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all`}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> + Tambah Siswa Baru
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedClassDetail(cls)}
                        className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" /> Lihat & Kelola ({classUserCount})
                      </button>

                      <button
                        onClick={() => handleOpenImportForClass(cls)}
                        className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all shrink-0"
                        title={`Import Excel/PDF ke Kelas ${cls}`}
                      >
                        <Upload className="w-3.5 h-3.5" /> Import
                      </button>
                    </div>
                  </div>
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
                    onChange={(e) => {
                      setNamaSekolah(e.target.value);
                      setHasUnsavedChanges(true);
                      setLastActionInfo('Perubahan nama sekolah');
                    }}
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
                    onChange={(e) => {
                      setAlamatSekolah(e.target.value);
                      setHasUnsavedChanges(true);
                      setLastActionInfo('Perubahan alamat sekolah');
                    }}
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

              {/* Import Wali Kelas from Image/File Shortcut */}
              <div className="mt-4 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-amber-950">Impor Seluruh Data Wali Kelas Sekaligus</h5>
                    <p className="text-[11px] text-amber-800">Unggah foto/gambar tabel dokumen atau file Excel wali kelas untuk deteksi otomatis per kelas.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImportTargetRole('wali_kelas');
                    setIsImportModalOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                >
                  <Upload className="w-4 h-4" /> Import Wali Kelas (Gambar / File)
                </button>
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

      {/* TAB 4: BACKUP, RESTORE & DATA MASTER */}
      {activeTab === 'data' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-4xl space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-extrabold mb-2">
              <CloudCheck className="w-4 h-4 text-emerald-600" />
              Sinkronisasi Firebase Firestore & Cloud Database Aktif
            </div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-rose-600" />
              Pusat Backup & Pemulihan Data Menyeluruh
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Semua data sistem (pengguna, identitas & logo sekolah, password kustom, log pembiasaan KAIH, dan catatan BK) tersimpan di <strong>Google Firebase Firestore</strong> & Cloud Database sehingga <strong>aman dari update webapp, redeploy server, maupun pembersihan memori browser</strong>.
            </p>
          </div>

          {restoreStatus && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{restoreStatus}</span>
              </div>
              <button
                onClick={() => setRestoreStatus(null)}
                className="text-emerald-700 hover:text-emerald-900 font-extrabold text-xs"
              >
                Tutup
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EXPORT BACKUP CARD */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900">
                  1. Unduh / Export Backup Data (JSON)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Simpan cadangan offline seluruh data sekolah dalam 1 file JSON lengkap:
                </p>
                <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4 font-medium">
                  <li>Identitas Sekolah, Kop Surat, Logo (Base64/URL), & Stempel TTD</li>
                  <li>Semua Akun Pengguna ({users.length} Siswa, Wali Kelas, BK, Admin)</li>
                  <li>Semua Password Kustom yang pernah diset</li>
                  <li>Semua Log Presensi/Pembiasaan KAIH ({getStoredLogs().length} Log)</li>
                  <li>Semua Catatan Bimbingan Konseling (BK)</li>
                </ul>
              </div>

              <button
                onClick={handleExportBackup}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" /> Download Backup Lengkap (.JSON)
              </button>
            </div>

            {/* IMPORT / RESTORE BACKUP CARD */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900">
                  2. Restorasi / Import Backup Data
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Unggah file cadangan JSON yang pernah diunduh sebelumnya untuk mengembalikan seluruh identitas sekolah, logo, akun, dan riwayat presensi secara otomatis.
                </p>
                <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  ✓ Data restored langsung disinkronkan ke Google Firebase Firestore.
                </p>
              </div>

              <label className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all">
                <Upload className="w-4 h-4" /> Unggah & Pulihkan File Backup (.JSON)
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* FIRESTORE DIAGNOSTICS UTILITY */}
          <FirestoreDiagnostics />

          {/* PURGE / CLEAN & RESYNC FIRESTORE TABLES CARD */}
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">
                3. Dorong & Sinkronkan Data ke Firebase Firestore (Resync Total)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dorong dan kirim seluruh data lokal pengguna, log amalan, konfigurasi sekolah, catatan BK, serta password kustom ke <strong>Google Firebase Firestore</strong> (<code className="bg-amber-100 px-1 rounded">kaih_users</code> & <code className="bg-amber-100 px-1 rounded">kaih_logs</code>).
              </p>
            </div>

            <button
              onClick={handleCleanAndResyncFirebase}
              disabled={isResyncingFirebase}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isResyncingFirebase ? 'animate-spin' : ''}`} />
              {isResyncingFirebase ? 'Sedang Menyinkronkan ke Firebase...' : 'Dorong & Sinkronkan Data ke Firebase Firestore Sekarang'}
            </button>
          </div>

          {/* RESET SYSTEM DATA DANGER ZONE */}
          <div className="p-5 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-3">
            <h4 className="font-extrabold flex items-center gap-2 text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Zona Khusus: Reset Data ke Setelan Pabrik
            </h4>
            <p className="leading-relaxed text-slate-600">
              Gunakan opsi ini hanya jika Anda ingin mengembalikan sistem ke sampel awal demo sekolah. Sebelum melakukan reset, disarankan mengunduh backup data terlebih dahulu.
            </p>
            <button
              onClick={handleResetSystem}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all inline-flex items-center gap-2 shadow-xs"
            >
              <RefreshCw className="w-4 h-4" /> Reset Semua Data ke Setelan Pabrik
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

              {newUserRole !== 'siswa' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP (Nomor Induk Pegawai - Opsional):</label>
                  <input
                    type="text"
                    value={newUserNip}
                    onChange={(e) => setNewUserNip(e.target.value)}
                    placeholder="Contoh: 19750814 200212 2 003"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Edit Akun Pengguna
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ubah detail nama, username, peran, atau password.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama Pengguna"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Username / ID Login:
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Username / NISN / ID"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono text-slate-800 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Peran / Hak Akses:
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="siswa">Siswa</option>
                  <option value="wali_kelas">Wali Kelas</option>
                  <option value="guru_bk">Guru BK</option>
                  <option value="admin">Admin Konsol</option>
                </select>
              </div>

              {(editRole === 'siswa' || editRole === 'wali_kelas') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editRole === 'wali_kelas' ? 'Tugas Wali Kelas Pada:' : 'Pilih Kelas:'}
                  </label>
                  <select
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value as ClassName)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  >
                    {ALL_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editRole === 'siswa' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Agama Siswa:</label>
                  <select
                    value={editAgama}
                    onChange={(e) => setEditAgama(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
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

              {editRole === 'admin' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gelar / Jabatan Admin (Opsional):</label>
                  <input
                    type="text"
                    value={editAdminTitle}
                    onChange={(e) => setEditAdminTitle(e.target.value)}
                    placeholder="Contoh: Kepala Sekolah / Penanggung Jawab KAIH"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {editRole !== 'siswa' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP (Nomor Induk Pegawai - Opsional):</label>
                  <input
                    type="text"
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    placeholder="Contoh: 19750814 200212 2 003"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ubah Password (Opsional):
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Ketik password baru jika ingin mengubah..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-xs transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Class Detail Modal (Kartu Detail Kelas) */}
      {selectedClassDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 font-black text-xl flex items-center justify-center shadow-xs">
                  {selectedClassDetail}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Pengelolaan Siswa Kelas {selectedClassDetail}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Wali Kelas:{' '}
                    <strong>
                      {users.find((u) => u.assignedClass === selectedClassDetail && u.role === 'wali_kelas')?.name || 'Belum diset'}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedClassDetail(null);
                  setStudentSearchInClassModal('');
                }}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa di kelas ini..."
                  value={studentSearchInClassModal}
                  onChange={(e) => setStudentSearchInClassModal(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    handleOpenImportForClass(selectedClassDetail);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Upload className="w-4 h-4" /> Import Excel/PDF
                </button>

                <button
                  onClick={() => {
                    handleOpenAddStudentForClass(selectedClassDetail);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <UserPlus className="w-4 h-4" /> + Tambah Siswa Baru
                </button>
              </div>
            </div>

            {/* Student Table for Selected Class */}
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-2xl bg-white">
              {(() => {
                const classStudents = users
                  .filter((u) => u.assignedClass === selectedClassDetail && u.role === 'siswa')
                  .filter((u) =>
                    u.name.toLowerCase().includes(studentSearchInClassModal.toLowerCase()) ||
                    u.username.toLowerCase().includes(studentSearchInClassModal.toLowerCase())
                  );

                if (classStudents.length === 0) {
                  return (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        Belum Ada Siswa Terdaftar di Kelas {selectedClassDetail}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Gunakan tombol di atas untuk menambahkan siswa secara manual satu per satu atau impor sekaligus dari Excel/PDF.
                      </p>
                      <button
                        onClick={() => handleOpenAddStudentForClass(selectedClassDetail)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl inline-flex items-center gap-2 shadow-md transition-all mt-2"
                      >
                        <UserPlus className="w-4 h-4" /> Tambah Siswa Pertama Ke Kelas {selectedClassDetail}
                      </button>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              classStudents.length > 0 &&
                              classStudents.every((st) => selectedUserIds.includes(st.id))
                            }
                            onChange={() => toggleSelectAll(classStudents)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            title="Pilih / Batal Pilih Semua Siswa di Kelas Ini"
                          />
                        </th>
                        <th className="py-3 px-3 w-10 text-center">No</th>
                        <th className="py-3 px-4">Nama Lengkap Siswa</th>
                        <th className="py-3 px-4">Username / ID Login</th>
                        <th className="py-3 px-4">Agama</th>
                        <th className="py-3 px-4 text-right">Kelola Akun</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.map((st, idx) => {
                        const isChecked = selectedUserIds.includes(st.id);
                        return (
                          <tr
                            key={st.id}
                            className={`transition-colors ${
                              isChecked ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectUser(st.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              />
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{st.name}</td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{st.username}</td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {st.agama || 'Islam'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              <button
                                onClick={() => handleOpenEditUser(st)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] inline-flex items-center gap-1 transition-all"
                                title="Edit Data Siswa"
                              >
                                <Edit className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => setResetPassUser(st)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[10px] inline-flex items-center gap-1 transition-all"
                                title="Reset Password Siswa"
                              >
                                <Key className="w-3 h-3" /> Password
                              </button>
                              <button
                                onClick={() => handleDeleteUser(st)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-lg text-[10px] inline-flex items-center gap-1 transition-all"
                                title="Hapus Siswa Dari Kelas Ini"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" /> Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-100">
              <span className="text-slate-500 font-medium">
                Total:{' '}
                <strong>
                  {users.filter((u) => u.assignedClass === selectedClassDetail && u.role === 'siswa').length}
                </strong>{' '}
                Siswa terdaftar
              </span>
              <button
                onClick={() => {
                  setSelectedClassDetail(null);
                  setStudentSearchInClassModal('');
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all"
              >
                Tutup Kartu Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Edit Class Modal */}
      {isBatchEditClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Pindah / Ubah Kelas Sekaligus
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Memindahkan {selectedUserIds.length} siswa terpilih ke kelas baru
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBatchEditClassOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchUpdateClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Kelas Tujuan Baru:
                </label>
                <select
                  value={batchTargetClass}
                  onChange={(e) => setBatchTargetClass(e.target.value as ClassName)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {ALL_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-800 text-[11px] font-medium leading-relaxed">
                ℹ️ Tindakan ini akan secara otomatis mengubah kelas dari <strong>{selectedUserIds.length} siswa</strong> yang Anda centang menjadi <strong>Kelas {batchTargetClass}</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchEditClassOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-sm transition-all"
                >
                  Terapkan Ke {selectedUserIds.length} Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Edit Agama Modal */}
      {isBatchEditAgamaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Ubah Agama Sekaligus
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mengubah data agama untuk {selectedUserIds.length} siswa terpilih
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBatchEditAgamaOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchUpdateAgama} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Agama:
                </label>
                <select
                  value={batchTargetAgama}
                  onChange={(e) => setBatchTargetAgama(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Khonghucu">Khonghucu</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] font-medium leading-relaxed">
                ℹ️ Agama dari <strong>{selectedUserIds.length} siswa</strong> terpilih akan diperbarui menjadi <strong>{batchTargetAgama}</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchEditAgamaOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-sm transition-all"
                >
                  Terapkan Ke {selectedUserIds.length} Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Habits Modal (CSV / Excel / PDF) */}
      <ExportHabitsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentUser={currentUser}
        allUsers={users}
        allLogs={getStoredLogs()}
      />

      {/* Data Import Modal (Siswa & Wali Kelas) */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultClass={selectedClassForImport}
        defaultRole={importTargetRole}
        onSuccessImport={(count) => {
          setUsers(getStoredUsers());
          setHasUnsavedChanges(true);
          const typeLabel = importTargetRole === 'wali_kelas' ? 'wali kelas' : 'siswa';
          setLastActionInfo(`Impor ${count} data ${typeLabel} baru`);
          alert(`Berhasil mengimpor ${count} data ${typeLabel} baru ke dalam sistem! Klik "Simpan Perubahan" untuk konfirmasi.`);
        }}
      />
    </div>
  );
};
