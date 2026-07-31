import React from 'react';
import { Sun, Sparkles, Dumbbell, Apple, BookOpen, Users, Moon, Award, Heart, CheckCircle2, X } from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';

interface AboutKAIHProps {
  isOpen?: boolean;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const AboutKAIH: React.FC<AboutKAIHProps> = ({ isOpen = true, onClose, isStandalone = false }) => {
  if (!isOpen && !isStandalone) return null;

  const habits = [
    {
      number: 1,
      title: 'Bangun Pagi',
      icon: Sun,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
      desc: 'Melatih kedisiplinan sejak fajar, menyegarkan tubuh, dan merapikan tempat tidur secara mandiri.',
      tips: 'Bangun sebelum pukul 05:00 WITA, minumlah air putih hangat, dan atur niat positif untuk sekolah.',
    },
    {
      number: 2,
      title: 'Beribadah Tepat Waktu',
      icon: Sparkles,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      desc: 'Memperkuat karakter spiritual, moral, serta rasa syukur kepada Tuhan Yang Maha Esa sesuai agama & kepercayaan.',
      tips: 'Islam: Sholat 5 waktu & catat jamnya. Kristen/Katolik: Saat teduh & baca Alkitab. Agama lain: Sembahyang & meditasi.',
    },
    {
      number: 3,
      title: 'Berolahraga',
      icon: Dumbbell,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: 'Menjaga kebugaran jasmani, stamina stamina belajar, dan imunitas tubuh siswa agar sehat prima.',
      tips: 'Lakukan olahraga minimal 15-30 menit harian: senam pagi, jogging, push-up/sit-up, atau bersepeda.',
    },
    {
      number: 4,
      title: 'Makan Sehat & Bergizi',
      icon: Apple,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50 text-green-700 border-green-200',
      desc: 'Mengonsumsi makanan seimbang 4 sehat 5 sempurna, sarapan sebelum berangkat sekolah, dan kurangi camilan instan.',
      tips: 'Penuhi karbohidrat, protein, sayuran hijau, buah-buahan segar, dan air putih minimal 2 liter per hari.',
    },
    {
      number: 5,
      title: 'Gemar Belajar',
      icon: BookOpen,
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
      desc: 'Menumbuhkan rasa ingin tahu, literasi membaca, pengulangan materi pelajaran, dan pengerjaan tugas tepat waktu.',
      tips: 'Luangkan waktu 45-60 menit setiap malam tanpa gangguan HP untuk membaca dan latihan soal.',
    },
    {
      number: 6,
      title: 'Bermasyarakat',
      icon: Users,
      color: 'from-rose-500 to-pink-600',
      bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
      desc: 'Mengasah empati, membantu orang tua di rumah, sopan santun, serta aktif dalam kegiatan sosial lingkungan.',
      tips: 'Membantu pekerjaan rumah (menyaapu/cuci piring), menyapa tetangga, dan menjaga kebersihan lingkungan RT.',
    },
    {
      number: 7,
      title: 'Tidur Cepat',
      icon: Moon,
      color: 'from-indigo-600 to-slate-800',
      bgColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      desc: 'Memberikan istirahat berkualitas bagi otak dan fisik agar siap beraktivitas maksimal esok hari.',
      tips: 'Matikan gadget sebelum pukul 21:00 WITA dan istirahat tidur malam 7-8 jam secara teratur.',
    },
  ];

  const content = (
    <div className="space-y-8 p-1">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden border border-blue-800">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <SchoolLogo size="xl" />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <SchoolLogo size="lg" className="shrink-0 drop-shadow-lg" />
          <div className="text-center sm:text-left">
            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-400/30 uppercase tracking-widest mb-2">
              Gerakan Karakter Siswa SMPN 10 Balikpapan
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tentang 7 KAIH
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-2xl leading-relaxed">
              <strong className="text-white">Kebiasaan Anak Indonesia Hebat (7 KAIH)</strong> adalah program pembiasaan karakter unggul harian untuk membentuk generasi yang berakhlak mulia, sehat jasmani rohani, cerdas, dan peduli lingkungan di SMP Negeri 10 Balikpapan.
            </p>
          </div>
        </div>
      </div>

      {/* Philosophy Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-lg shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Disiplin & Mandiri</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Membangun konsistensi harian dari waktu bangun hingga waktu tidur malam tanpa perlu selalu diperintah.
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-lg shrink-0">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Spiritual & Akhlak</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Mengutamakan ibadah sesuai ajaran agama masing-masing serta penanaman rasa empati sosial.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-lg shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Monitoring Terintegrasi</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Dilengkapi pemantauan harian oleh Wali Kelas, Guru BK, dan Admin sekolah melalui grafik real-time.
            </p>
          </div>
        </div>
      </div>

      {/* 7 Habits Detailed Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
          Rincian 7 Kebiasaan Anak Indonesia Hebat
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.number}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-sm`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Kebiasaan #{item.number}
                        </span>
                        <h4 className="font-bold text-slate-800 text-base">{item.title}</h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs mb-3 leading-relaxed">{item.desc}</p>
                </div>

                <div className={`p-3 rounded-lg border text-xs ${item.bgColor}`}>
                  <span className="font-semibold block mb-0.5">💡 Tips Pembiasaan:</span>
                  <p className="leading-relaxed opacity-90">{item.tips}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Call to Action for SMPN 10 Balikpapan */}
      <div className="bg-slate-900 rounded-2xl p-6 text-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-white font-bold text-base">SMP Negeri 10 Balikpapan</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Mewujudkan Pelajar Pancasila yang Beriman, Bertaqwa, Mandiri, Berakhlak Mulia & Berbudaya Lingkungan.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg inline-block">
            Balikpapan, Kalimantan Timur
          </span>
        </div>
      </div>
    </div>
  );

  if (isStandalone) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-fadeIn">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors z-20"
            title="Tutup"
          >
            <X className="w-6 h-6" />
          </button>
        )}
        {content}
      </div>
    </div>
  );
};
