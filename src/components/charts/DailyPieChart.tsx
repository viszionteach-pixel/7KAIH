import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DailyPieChartProps {
  completedCount: number; // 0 to 7
  totalHabits?: number;
  title?: string;
}

export const DailyPieChart: React.FC<DailyPieChartProps> = ({
  completedCount,
  totalHabits = 7,
  title = 'Grafik Bulat (Total 7 KAIH Hari Ini)',
}) => {
  const pendingCount = Math.max(0, totalHabits - completedCount);
  const percentage = Math.round((completedCount / totalHabits) * 100);

  const data = [
    { name: 'Terlaksana', value: completedCount, color: '#10B981' }, // Emerald Green
    { name: 'Belum Belum', value: pendingCount, color: '#E2E8F0' }, // Soft Gray
  ];

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center">
      <h3 className="text-base font-bold text-slate-800 mb-2 text-center flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
        {title}
      </h3>
      <p className="text-xs text-slate-500 mb-4">Persentase Kepatuhan Harian Siswa</p>

      <div className="relative w-full h-56 max-w-xs flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: number) => [`${val} Kebiasaan`, 'Status']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>

        {/* Center score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-2xl font-black text-slate-900">{percentage}%</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {completedCount}/{totalHabits} KAIH
          </span>
        </div>
      </div>
    </div>
  );
};
