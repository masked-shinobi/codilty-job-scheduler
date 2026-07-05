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
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="mt-1 text-gray-400">Real-time overview of your job scheduling platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-brand-400" />
            </div>
            <span className="stat-label">Active Queues</span>
          </div>
          <span className="stat-value">{queues.length}</span>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="stat-label">Completed (24h)</span>
          </div>
          <span className="stat-value">{totalCompleted}</span>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <span className="stat-label">Failed (24h)</span>
          </div>
          <span className="stat-value">{totalFailed}</span>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/15 rounded-xl flex items-center justify-center">
              <Server className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="stat-label">Active Workers</span>
          </div>
          <span className="stat-value">{activeWorkers}</span>
        </div>
      </div>

      {/* Queue Health Summary */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-400" />
          Queue Health
        </h2>

        {metrics?.queueStats?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.queueStats.map((q: any) => (
              <div key={q.queueId} className="bg-surface-700/30 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-white">{q.queueName}</span>
                  <StatusBadge status={q.health} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Queued</span>
                    <span className="ml-2 text-gray-300 font-mono">{q.queued}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Running</span>
                    <span className="ml-2 text-gray-300 font-mono">{q.running}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Completed</span>
                    <span className="ml-2 text-emerald-400 font-mono">{q.completed}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Failed</span>
                    <span className="ml-2 text-red-400 font-mono">{q.failed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No queues available. Create a queue to get started.</p>
        )}
      </div>

      {/* Recent Workers */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-brand-400" />
          Workers
        </h2>
        {workers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-white/5">
                  <th className="pb-3 font-medium">Hostname</th>
                  <th className="pb-3 font-medium">PID</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last Seen</th>
                  <th className="pb-3 font-medium">Active Jobs</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w: any) => (
                  <tr key={w.id} className="table-row">
                    <td className="py-3 font-mono text-gray-300">{w.hostname}</td>
                    <td className="py-3 font-mono text-gray-400">{w.pid}</td>
                    <td className="py-3"><StatusBadge status={w.status} /></td>
                    <td className="py-3 text-gray-400">{new Date(w.lastSeenAt).toLocaleTimeString()}</td>
                    <td className="py-3 text-gray-300">{w.claimedJobs?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No workers registered. Start a worker instance to begin processing jobs.</p>
        )}
      </div>
    </div>
  );
}
