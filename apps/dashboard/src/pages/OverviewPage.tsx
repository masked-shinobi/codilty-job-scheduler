import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { dashboardApi, queuesApi, workersApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { BarChart3, CheckCircle2, XCircle, AlertTriangle, Server, ListTodo } from 'lucide-react';

export default function OverviewPage() {
  const { getToken } = useAuth();

  const { data: metricsData } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const token = await getToken();
      return dashboardApi.metrics(token!);
    },
    refetchInterval: 5000,
  });

  const { data: queuesData } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const token = await getToken();
      return queuesApi.list(token!);
    },
    refetchInterval: 5000,
  });

  const { data: workersData } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const token = await getToken();
      return workersApi.list(token!);
    },
    refetchInterval: 5000,
  });

  const metrics = metricsData?.data;
  const queues = queuesData?.data || [];
  const workers = workersData?.data || [];

  const activeWorkers = workers.filter((w: any) => w.status !== 'DEAD').length;
  const totalCompleted = metrics?.successFailRatio?.success || 0;
  const totalFailed = (metrics?.successFailRatio?.failed || 0) + (metrics?.successFailRatio?.dead || 0);

  return (
    <div className="animate-fade-in space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-gray-400">Real-time overview of your job scheduling platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="stat-card animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500/10 dark:bg-brand-500/15 rounded-2xl flex items-center justify-center">
              <ListTodo className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <span className="stat-label">Active Queues</span>
          </div>
          <span className="stat-value">{queues.length}</span>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="stat-label">Completed (24h)</span>
          </div>
          <span className="stat-value">{totalCompleted.toLocaleString()}</span>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 dark:bg-red-500/15 rounded-2xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <span className="stat-label">Failed (24h)</span>
          </div>
          <span className="stat-value">{totalFailed.toLocaleString()}</span>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-2xl flex items-center justify-center">
              <Server className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="stat-label">Active Workers</span>
          </div>
          <span className="stat-value">{activeWorkers}</span>
        </div>
      </div>

      {/* Queue Health Summary */}
      <div className="glass-card">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-brand-500 dark:text-brand-400" />
          Queue Health
        </h2>

        {metrics?.queueStats?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.queueStats.map((q: any) => (
              <div key={q.queueId} className="bg-slate-50 dark:bg-surface-700/30 rounded-2xl p-6 border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-lg text-slate-900 dark:text-white">{q.queueName}</span>
                  <StatusBadge status={q.health} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-base">
                  <div>
                    <span className="text-slate-500 dark:text-gray-500 font-medium">Queued</span>
                    <span className="ml-2 text-slate-800 dark:text-gray-300 font-mono font-semibold">{q.queued}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-gray-500 font-medium">Running</span>
                    <span className="ml-2 text-slate-800 dark:text-gray-300 font-mono font-semibold">{q.running}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-gray-500 font-medium">Completed</span>
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{q.completed}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-gray-500 font-medium">Failed</span>
                    <span className="ml-2 text-red-600 dark:text-red-400 font-mono font-semibold">{q.failed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-gray-500 text-base py-4">No queues available. Create a queue to get started.</p>
        )}
      </div>

      {/* Recent Workers */}
      <div className="glass-card">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
          <Server className="w-6 h-6 text-brand-500 dark:text-brand-400" />
          Workers
        </h2>
        {workers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-slate-500 dark:text-gray-500 text-left border-b border-slate-200 dark:border-white/5">
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider">Hostname</th>
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider">PID</th>
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider">Status</th>
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider">Last Seen</th>
                  <th className="pb-4 font-bold text-xs uppercase tracking-wider">Active Jobs</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w: any) => (
                  <tr key={w.id} className="table-row">
                    <td className="py-5 font-mono font-semibold text-slate-800 dark:text-gray-300">{w.hostname}</td>
                    <td className="py-5 font-mono text-slate-500 dark:text-gray-400">{w.pid}</td>
                    <td className="py-5"><StatusBadge status={w.status} /></td>
                    <td className="py-5 text-slate-500 dark:text-gray-400">{new Date(w.lastSeenAt).toLocaleTimeString()}</td>
                    <td className="py-5 font-semibold text-slate-800 dark:text-gray-300">{w.claimedJobs?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-gray-500 text-base py-4">No workers registered. Start a worker instance to begin processing jobs.</p>
        )}
      </div>
    </div>
  );
}
