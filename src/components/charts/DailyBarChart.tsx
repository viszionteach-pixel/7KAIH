import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { KAIHEntry } from '../../types';

interface DailyBarChartProps {
  entry?: KAIHEntry | null;
  title?: string;
  // Or aggregated data for class/group
  aggregatedData?: { habit: string; percentage: number }[];
}

export const HABIT_NAMES = [
  { key: 'bangunPagi', label: 'Bangun Pagi', shortLabel: 'Bangun', icon: '☀️' },
  { key: 'beribadah', label: 'Beribadah', shortLabel: 'Ibadah', icon: '✨' },
  { key: 'berolahraga', label: 'Berolahraga', shortLabel: 'Olahraga', icon: '🏃' },
  { key: 'makanSehat', label: 'Makan Sehat', shortLabel: 'Makan', icon: '🥗' },
  { key: 'gemarBelajar', label: 'Gemar Belajar', shortLabel: 'Belajar', icon: '📚' },
  { key: 'bermasyarakat', label: 'Bermasyarakat', shortLabel: 'Sosial', icon: '🤝' },
  { key: 'tidurCepat', label: 'Tidur Cepat', shortLabel: 'Tidur', icon: '🌙' },
];

export const DailyBarChart: React.FC<DailyBarChartProps> = ({
  entry,
  title = 'Grafik Batang (Status 7 Kebiasaan KAIH)',
  aggregatedData,
}) => {
  let chartData: { name: string; fullLabel: string; value: number; color: string }[] = [];

  if (aggregatedData) {
    chartData = aggregatedData.map((d) => ({
      name: d.habit.split(' ')[0],
      fullLabel: d.habit,
      value: d.percentage,
      color: d.percentage >= 80 ? '#10B981' : d.percentage >= 50 ? '#F59E0B' : '#EF4444',
    }));
  } else if (entry) {
    chartData = HABIT_NAMES.map((h) => {
      const isChecked = Boolean(
        h.key === 'bangunPagi' ? entry.bangunPagi?.checked :
        h.key === 'beribadah' ? entry.beribadah?.checked :
        h.key === 'berolahraga' ? entry.berolahraga?.checked :
        h.key === 'makanSehat' ? entry.makanSehat?.checked :
        h.key === 'gemarBelajar' ? entry.gemarBelajar?.checked :
        h.key === 'bermasyarakat' ? entry.bermasyarakat?.checked :
        entry.tidurCepat?.checked
      );
      return {
        name: `${h.icon} ${h.shortLabel}`,
        fullLabel: h.label,
        value: isChecked ? 100 : 0,
        color: isChecked ? '#10B981' : '#CBD5E1',
      };
    });
  } else {
    chartData = HABIT_NAMES.map((h) => ({
      name: `${h.icon} ${h.shortLabel}`,
      fullLabel: h.label,
      value: 0,
      color: '#CBD5E1',
    }));
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Rincian Pelaksanaan per 7 Aktivitas KAIH</p>
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
            <Tooltip
              formatter={(val: number, name: string, item: any) => [
                `${val}% ${val === 100 ? '(Selesai)' : '(Belum)'}`,
                item.payload.fullLabel,
              ]}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
