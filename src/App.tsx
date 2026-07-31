import React, { useState, useEffect } from 'react';
import { User } from './types';
import { getCurrentUser, setCurrentUser, getStoredUsers, initFirebaseRealtimeSync } from './services/storage';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { AboutKAIH } from './components/AboutKAIH';
import { StudentDashboard } from './components/student/StudentDashboard';
import { WaliKelasDashboard } from './components/teacher/WaliKelasDashboard';
import { GuruBKDashboard } from './components/bk/GuruBKDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Sparkles, X, Shield, Users, HeartHandshake } from 'lucide-react';

export default function App() {
  const [currentUser, setUser] = useState<User | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    initFirebaseRealtimeSync();
    setUser(getCurrentUser());
    setAllUsers(getStoredUsers());

    const handleDataUpdate = () => {
      setAllUsers(getStoredUsers());
    };

    window.addEventListener('kaih_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('kaih_data_updated', handleDataUpdate);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setUser(user);
    setCurrentUser(user);
    setIsRoleSwitcherOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAbout={() => setIsAboutOpen(true)}
        onSwitchRole={() => setIsRoleSwitcherOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!currentUser ? (
          <LoginModal
            onLoginSuccess={handleLoginSuccess}
            onOpenAbout={() => setIsAboutOpen(true)}
          />
        ) : (
          <>
            {currentUser.role === 'siswa' && (
              <StudentDashboard currentUser={currentUser} />
            )}
            {currentUser.role === 'wali_kelas' && (
              <WaliKelasDashboard currentUser={currentUser} />
            )}
            {currentUser.role === 'guru_bk' && (
              <GuruBKDashboard currentUser={currentUser} />
            )}
            {currentUser.role === 'admin' && (
              <AdminDashboard currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 SMP Negeri 10 Balikpapan • Kebiasaan Anak Indonesia Hebat (7 KAIH)</p>
          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setIsAboutOpen(true)} className="hover:text-amber-400 transition-colors">
              Tentang 7 KAIH
            </button>
            {currentUser && (
              <>
                <span>•</span>
                <button onClick={() => setIsRoleSwitcherOpen(true)} className="hover:text-blue-400 transition-colors">
                  Ganti Peran Akses
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* About 7 KAIH Modal */}
      {isAboutOpen && (
        <AboutKAIH isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      )}

      {/* Role Switcher Modal */}
      {isRoleSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative space-y-4">
            <button
              onClick={() => setIsRoleSwitcherOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-blue-600">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-slate-900">Pilih Peran Demo Pengujian</h3>
            </div>

            <p className="text-xs text-slate-500">
              Pilih salah satu peran di bawah ini untuk menguji fitur sebagai Siswa, Wali Kelas, Guru BK, atau Admin 3 Konsol:
            </p>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-700">1. Akses Admin (3 Konsol Full):</p>
              <div className="grid grid-cols-1 gap-1.5">
                {allUsers.filter((u) => u.role === 'admin').map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleLoginSuccess(u)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-rose-900 font-bold text-left flex items-center justify-between"
                  >
                    <span>{u.name} ({u.adminTitle})</span>
                    <Shield className="w-4 h-4 text-rose-600" />
                  </button>
                ))}
              </div>

              <p className="font-bold text-slate-700 pt-2">2. Akses Guru BK:</p>
              <div className="grid grid-cols-1 gap-1.5">
                {allUsers.filter((u) => u.role === 'guru_bk').map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleLoginSuccess(u)}
                    className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-purple-900 font-bold text-left flex items-center justify-between"
                  >
                    <span>{u.name} (Monitoring Semua 32 Kelas)</span>
                    <HeartHandshake className="w-4 h-4 text-purple-600" />
                  </button>
                ))}
              </div>

              <p className="font-bold text-slate-700 pt-2">3. Akses Wali Kelas:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {['7A', '7B', '8A', '8B', '9A', '9J'].map((cls) => {
                  const wk = allUsers.find((u) => u.role === 'wali_kelas' && u.assignedClass === cls);
                  if (!wk) return null;
                  return (
                    <button
                      key={cls}
                      onClick={() => handleLoginSuccess(wk)}
                      className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 font-bold text-center"
                    >
                      Wali Kelas {cls}
                    </button>
                  );
                })}
              </div>

              <p className="font-bold text-slate-700 pt-2">4. Akses Siswa:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {allUsers.filter((u) => u.role === 'siswa').slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleLoginSuccess(s)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-900 font-bold text-left truncate"
                  >
                    {s.name} ({s.assignedClass})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
