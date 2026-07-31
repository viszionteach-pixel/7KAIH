import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { KAIHEntry } from '../../types';

interface MonthlyLineChartProps {
  logs: KAIHEntry[];
  studentName?: string;
  title?: string;
}

export const MonthlyLineChart: React.FC<MonthlyLineChartProps> = ({
  logs,
  studentName,
  title = 'Grafik Tren Bulanan (Capaian 0-100%)',
}) => {
  // Sort logs by date ascending
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  const chartData = sortedLogs.map((log) => {
    const day = log.date.slice(8, 10);
    return {
      date: log.date,
      dayLabel: `Tgl ${day}`,
      percentage: log.scorePercentage || 0,
      completed: log.completedCount || 0,
    };
  });

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {studentName ? `Perkembangan Kepatuhan ${studentName}` : 'Tren Kepatuhan Siswa dalam Sebulan'}
          </p>
        </div>
      </div>

      <div className="w-full h-64">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Belum ada data pengisian bulan ini
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
              <Tooltip
                formatter={(val: number, name: string, item: any) => [
                  `${val}% (${item.payload.completed}/7 KAIH)`,
                  'Skor Kepatuhan',
                ]}
                labelFormatter={(label, items) => {
                  const item = items[0]?.payload;
                  return item ? `Tanggal: ${item.date}` : label;
                }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area
                type="monotone"
                dataKey="percentage"
                stroke="#2563EB"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPct)"
                dot={{ r: 4, fill: '#1D4ED8', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6, fill: '#1D4ED8' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
