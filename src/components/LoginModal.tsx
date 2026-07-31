import React, { useState } from 'react';
import { LogIn, Key, User as UserIcon, ShieldAlert, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';
import { User, Role } from '../types';
import { verifyUserLogin, getStoredUsers } from '../services/storage';
import { SchoolLogo } from './SchoolLogo';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
  onOpenAbout: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onOpenAbout }) => {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru' | 'admin'>('siswa');
  const [logoClickCount, setLogoClickCount] = useState<number>(0);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);

  const users = getStoredUsers();

  const handleLogoClick = () => {
    const nextCount = logoClickCount + 1;
    setLogoClickCount(nextCount);
    if (nextCount >= 5) {
      setIsAdminUnlocked(true);
      setActiveTab('admin');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Masukkan Nama Lengkap / Username!');
      return;
    }
    if (!password) {
      setErrorMsg('Masukkan Kata Sandi / Password!');
      return;
    }

    const user = verifyUserLogin(identifier, password);
    if (user) {
      onLoginSuccess(user);
    } else {
      setErrorMsg('Nama atau Password salah. (Perhatikan: Password siswa adalah NamaDepan123, cth: Ahmad123)');
    }
  };

  const handleQuickLogin = (user: User) => {
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Left Hero Sidebar */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
            <SchoolLogo size="xl" />
          </div>

          <div>
            <div className="flex items-center gap-3.5 mb-6">
              <SchoolLogo
                size="xl"
                className="drop-shadow-[0_8px_16px_rgba(37,99,235,0.4)] shrink-0"
                onClick={handleLogoClick}
              />
              <div>
                <h2 className="font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
                  7 KAIH
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full">
                    Karakter Siswa
                  </span>
                </h2>
                <p className="text-xs text-amber-400 font-extrabold uppercase tracking-widest mt-0.5">
                  SMPN 10 Balikpapan
                </p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-3 text-white">
              Kebiasaan Anak Indonesia Hebat
            </h1>
            <p className="text-xs text-blue-200 leading-relaxed mb-6">
              Sistem informasi presensi dan pemantauan 7 kebiasaan karakter harian bagi siswa, wali kelas, guru BK, dan pimpinan SMP Negeri 10 Balikpapan.
            </p>

            {/* Quick 7 Habits list */}
            <div className="space-y-2.5 text-xs bg-slate-800/50 p-3.5 rounded-2xl border border-blue-800/40 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <span className="w-6 h-6 rounded-lg bg-amber-500/30 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0 border border-amber-400/30">1</span>
                <span>Bangun Pagi & Tidur Cepat (Realtime)</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-400/30">2</span>
                <span>Beribadah Tepat Waktu (6 Opsi Agama)</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <span className="w-6 h-6 rounded-lg bg-blue-500/30 text-blue-300 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-400/30">3</span>
                <span>Olahraga, Belajar, Makan & Bermasyarakat</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-blue-800/60 flex items-center justify-between text-[11px] text-blue-300">
            <span>SMPN 10 Balikpapan</span>
            <button onClick={onOpenAbout} className="text-amber-400 font-bold hover:underline flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Pelajari 7 KAIH
            </button>
          </div>
        </div>

        {/* Right Form */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {isAdminUnlocked ? 'Konsol Akses Administrator & Kepala Sekolah' : 'Akses Presensi Siswa'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAdminUnlocked
                    ? 'Akses Khusus Kepala Sekolah, Admin, Wali Kelas, dan Guru BK'
                    : 'Silakan masuk menggunakan nama & password siswa'}
                </p>
              </div>

              {/* Tab Selector - Only shown if logo clicked 5 times (Staff/Admin only, no Siswa) */}
              {isAdminUnlocked && (
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold animate-fade-in border border-amber-300 bg-amber-50">
                  <button
                    type="button"
                    onClick={() => setActiveTab('guru')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'guru' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Guru / BK
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'admin' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Kepala Sekolah / Admin
                  </button>
                </div>
              )}
            </div>

            {/* Error notice */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeTab === 'admin'
                    ? 'Username / ID Login (Kepala Sekolah / Admin)'
                    : activeTab === 'guru'
                    ? 'Username Wali Kelas / Guru BK'
                    : 'Nama Lengkap Siswa'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      activeTab === 'admin'
                        ? 'Contoh: admin.utama atau kepalasekolah'
                        : activeTab === 'guru'
                        ? 'Contoh: walikelas.7a atau gurubk.utama'
                        : 'Contoh: Ahmad Fauzi'
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      activeTab === 'admin'
                        ? 'Password Admin / Kepala Sekolah (admin123)'
                        : activeTab === 'guru'
                        ? 'Password Wali Kelas / BK'
                        : 'NamaDepan123 (contoh: Ahmad123)'
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>

                {!isAdminUnlocked && activeTab === 'siswa' && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Password default siswa: <strong>NamaDepan123</strong> (Cth: Ahmad123)</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Sekarang</span>
              </button>
            </form>
          </div>

          {/* Quick Demo Login selector */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {isAdminUnlocked
                  ? 'Akses Cepat Kepala Sekolah & Staff Admin:'
                  : 'Akses Cepat Presensi Siswa:'}
              </span>
            </h4>

            <div className="flex flex-wrap gap-1.5">
              {/* If unlocked, ONLY show Admin/Kepala Sekolah & Staff buttons */}
              {isAdminUnlocked ? (
                <>
                  {/* Admins & Kepala Sekolah */}
                  {users.filter(u => u.role === 'admin').slice(0, 3).map((u, i) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-bold rounded-lg transition-colors"
                    >
                      {u.adminTitle?.includes('Kepala Sekolah') ? 'Kepala Sekolah' : `Kepala Sekolah / Admin #${i+1}`} ({u.username})
                    </button>
                  ))}

                  {/* Guru BK */}
                  {users.filter(u => u.role === 'guru_bk').slice(0, 1).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Guru BK
                    </button>
                  ))}

                  {/* Wali Kelas 7A */}
                  {users.filter(u => u.role === 'wali_kelas' && u.assignedClass === '7A').map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Wali Kelas 7A
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {/* Siswa Ahmad Fauzi */}
                  {users.filter(u => u.role === 'siswa' && u.name === 'Ahmad Fauzi').map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Siswa: Ahmad Fauzi (7A)
                    </button>
                  ))}

                  {/* Siswa Siti Nurhaliza */}
                  {users.filter(u => u.role === 'siswa' && u.name === 'Siti Nurhaliza').map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Siswa: Siti Nurhaliza (7A)
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
