import React, { useState, useEffect } from 'react';
import { LogOut, Info, Shield, User as UserIcon, BookOpen, Clock, RefreshCw, CloudCheck, Wifi, CloudDownload } from 'lucide-react';
import { User } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { forceFetchFromCloud } from '../services/storage';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenAbout: () => void;
  onSwitchRole: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenAbout,
  onSwitchRole,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const success = await forceFetchFromCloud();
    setIsSyncing(false);
    if (success) {
      setSyncToast('✓ Data berhasil disinkronkan langsung dari Cloud Firestore!');
    } else {
      setSyncToast('⚠️ Sinkronisasi Cloud selesai (mode offline/local).');
    }
    setTimeout(() => setSyncToast(null), 3500);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WITA'
      );
      setDateStr(
        now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const roleLabels = {
    admin: { label: 'Admin (Konsol Akses)', color: 'bg-rose-500 text-white' },
    guru_bk: { label: 'Guru BK (Monitoring Semua Kelas)', color: 'bg-purple-600 text-white' },
    wali_kelas: { label: `Wali Kelas ${currentUser?.assignedClass || ''}`, color: 'bg-amber-600 text-white' },
    siswa: { label: `Siswa Kelas ${currentUser?.assignedClass || ''}`, color: 'bg-blue-600 text-white' },
  };

  const currentRoleInfo = currentUser ? roleLabels[currentUser.role] : null;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand & School Logo */}
        <div className="flex items-center gap-3">
          <SchoolLogo size="md" className="shrink-0 drop-shadow-[0_4px_12px_rgba(37,99,235,0.4)]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight flex items-center gap-1.5">
                KAIH
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  7 Kebiasaan
                </span>
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full hidden sm:inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3 h-3 text-emerald-400" />
                Data Tersinkron Cloud
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
              <span>Kebiasaan Anak Indonesia Hebat</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span className="text-amber-400 font-semibold">Presensi Karakter Harian</span>
            </p>
          </div>
        </div>

        {/* Center: Realtime Clock & Date */}
        <div className="hidden lg:flex flex-col items-center bg-slate-800/90 px-4 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-inner">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="tracking-wide font-mono">{timeStr}</span>
          </div>
          <span className="text-slate-300 text-[11px] font-medium">{dateStr}</span>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Manual Sync Cloud button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg border border-emerald-500/50 shadow-sm transition-all disabled:opacity-50"
            title="Sinkronkan Data Terbaru Langsung dari Cloud Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Cloud'}</span>
          </button>

          {/* Tentang 7 KAIH button */}
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
            title="Tentang 7 KAIH"
          >
            <Info className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Tentang 7 KAIH</span>
          </button>

          {/* User badge */}
          {currentUser && (
            <div className="flex items-center gap-2 bg-slate-800/90 pl-3 pr-2 py-1 rounded-xl border border-slate-700">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                  {currentUser.name}
                </p>
                {currentRoleInfo && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${currentRoleInfo.color}`}>
                    {currentRoleInfo.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Switch Role button */}
          {currentUser && (
            <button
              onClick={onSwitchRole}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center"
              title="Ganti Peran / User Demo"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Logout */}
          {currentUser && (
            <button
              onClick={onLogout}
              className="p-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-lg border border-slate-700 transition-colors"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {syncToast && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 text-center border-t border-emerald-500 shadow-inner animate-fadeIn flex items-center justify-center gap-2">
          <CloudCheck className="w-4 h-4" />
          <span>{syncToast}</span>
        </div>
      )}
    </header>
  );
};
