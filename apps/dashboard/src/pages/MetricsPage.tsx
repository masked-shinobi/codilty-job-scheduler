import React from 'react';
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
  success: '#34d399',
  failed: '#f87171',
  dead: '#9ca3af',
  brand: '#818cf8',
};

export default function MetricsPage() {
  const { getToken } = useAuth();

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Metrics</h1>
        <p className="mt-1 text-gray-400">Performance insights and job processing analytics</p>
      </div>

      {/* Throughput chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-400" />
          Throughput (Last 24h)
        </h2>
        {chartThrough.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartThrough}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke={COLORS.brand} strokeWidth={2.5} dot={{ fill: COLORS.brand, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-sm py-8 text-center">No throughput data available yet</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success/Fail Pie */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-brand-400" />
            Success vs Failure (24h)
          </h2>
          {pieData.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
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
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#e2e8f0',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">No job data yet</p>
          )}
          <div className="flex justify-center gap-6 mt-2">
            <LegendItem color={COLORS.success} label="Success" value={ratio.success} />
            <LegendItem color={COLORS.failed} label="Failed" value={ratio.failed} />
            <LegendItem color={COLORS.dead} label="Dead" value={ratio.dead} />
          </div>
        </div>

        {/* Per-queue stats */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            Queue Performance
          </h2>
          {queueStats.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queueStats.map((q: any) => ({ name: q.queueName, completed: q.completed, failed: q.failed, queued: q.queued }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#e2e8f0',
                    }}
                  />
                  <Bar dataKey="completed" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill={COLORS.failed} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="queued" fill={COLORS.brand} radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ color: '#9ca3af' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">No queue data available</p>
          )}
        </div>
      </div>

      {/* Queue health cards */}
      {queueStats.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Queue Health Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queueStats.map((q: any) => (
              <div key={q.queueId} className="bg-surface-700/30 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-white">{q.queueName}</span>
                  <StatusBadge status={q.health} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Queued:</span> <span className="text-gray-300 font-mono ml-1">{q.queued}</span></div>
                  <div><span className="text-gray-500">Running:</span> <span className="text-gray-300 font-mono ml-1">{q.running}</span></div>
                  <div><span className="text-gray-500">Completed:</span> <span className="text-emerald-400 font-mono ml-1">{q.completed}</span></div>
                  <div><span className="text-gray-500">Failed:</span> <span className="text-red-400 font-mono ml-1">{q.failed}</span></div>
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
    <div className="flex items-center gap-2 text-sm">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-gray-400">{label}: <span className="text-white font-medium">{value}</span></span>
    </div>
  );
}
