import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { dashboardApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon } from 'lucide-react';

const COLORS = {
  success: '#10b981', // emerald-500
  failed: '#ef4444', // red-500
  dead: '#64748b', // slate-500
  brand: '#6366f1', // indigo-500
};

export default function MetricsPage() {
  const { getToken } = useAuth();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const token = await getToken();
      return dashboardApi.metrics(token!);
    },
    refetchInterval: 5000,
  });

  const metrics = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const throughput = metrics?.throughputOverTime || [];
  const ratio = metrics?.successFailRatio || { success: 0, failed: 0, dead: 0 };
  const queueStats = metrics?.queueStats || [];

  const pieData = [
    { name: 'Success', value: ratio.success, color: COLORS.success },
    { name: 'Failed', value: ratio.failed, color: COLORS.failed },
    { name: 'Dead', value: ratio.dead, color: COLORS.dead },
  ].filter((d) => d.value > 0);

  const chartThrough = throughput.map((t: any) => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    count: t.count,
  }));

  // Theme-aware Recharts configurations
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const tickColor = isDark ? '#9ca3af' : '#475569';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tooltipTextColor = isDark ? '#f3f4f6' : '#0f172a';

  return (
    <div className="animate-fade-in space-y-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Metrics</h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-gray-400">Performance insights and job processing analytics</p>
      </div>

      {/* Throughput chart */}
      <div className="glass-card">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-brand-500 dark:text-brand-400" />
          Throughput (Last 24h)
        </h2>
        {chartThrough.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartThrough}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="time" tick={{ fill: tickColor, fontSize: 12 }} />
                <YAxis tick={{ fill: tickColor, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '16px',
                    color: tooltipTextColor,
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                />
                <Line type="monotone" dataKey="count" stroke={COLORS.brand} strokeWidth={3} dot={{ fill: COLORS.brand, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-gray-500 text-base py-12 text-center">No throughput data available yet</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Success/Fail Pie */}
        <div className="glass-card flex flex-col justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <PieIcon className="w-6 h-6 text-brand-500 dark:text-brand-400" />
            Success vs Failure (24h)
          </h2>
          {pieData.length > 0 ? (
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '16px',
                      color: tooltipTextColor,
                      fontSize: '14px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-gray-500 text-base py-12 text-center">No job data yet</p>
          )}
          <div className="flex flex-wrap justify-center gap-6 mt-4">
            <LegendItem color={COLORS.success} label="Success" value={ratio.success} />
            <LegendItem color={COLORS.failed} label="Failed" value={ratio.failed} />
            <LegendItem color={COLORS.dead} label="Dead" value={ratio.dead} />
          </div>
        </div>

        {/* Per-queue stats */}
        <div className="glass-card">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-brand-500 dark:text-brand-400" />
            Queue Performance
          </h2>
          {queueStats.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queueStats.map((q: any) => ({ name: q.queueName, completed: q.completed, failed: q.failed, queued: q.queued }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} />
                  <YAxis tick={{ fill: tickColor, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '16px',
                      color: tooltipTextColor,
                      fontSize: '14px',
                    }}
                  />
                  <Bar dataKey="completed" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill={COLORS.failed} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="queued" fill={COLORS.brand} radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ color: tickColor, fontSize: '13px', paddingTop: '10px' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-gray-500 text-base py-12 text-center">No queue data available</p>
          )}
        </div>
      </div>

      {/* Queue health cards */}
      {queueStats.length > 0 && (
        <div className="glass-card">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Queue Health Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queueStats.map((q: any) => (
              <div key={q.queueId} className="bg-slate-50 dark:bg-surface-700/30 rounded-2xl p-6 border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-lg text-slate-900 dark:text-white">{q.queueName}</span>
                  <StatusBadge status={q.health} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-base">
                  <div><span className="text-slate-500 dark:text-gray-500 font-medium">Queued:</span> <span className="text-slate-800 dark:text-gray-300 font-mono font-semibold ml-1">{q.queued}</span></div>
                  <div><span className="text-slate-500 dark:text-gray-500 font-medium">Running:</span> <span className="text-slate-800 dark:text-gray-300 font-mono font-semibold ml-1">{q.running}</span></div>
                  <div><span className="text-slate-500 dark:text-gray-500 font-medium">Completed:</span> <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold ml-1">{q.completed}</span></div>
                  <div><span className="text-slate-500 dark:text-gray-500 font-medium">Failed:</span> <span className="text-red-600 dark:text-red-400 font-mono font-semibold ml-1">{q.failed}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 text-base">
      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-500 dark:text-gray-400 font-semibold">{label}: <span className="text-slate-900 dark:text-white font-bold">{value.toLocaleString()}</span></span>
    </div>
  );
}
