import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { workersApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { Server, Heart, Cpu } from 'lucide-react';

export default function WorkersPage() {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const token = await getToken();
      return workersApi.list(token!);
    },
    refetchInterval: 5000,
  });

  const workers = data?.data || [];
  const alive = workers.filter((w: any) => w.status !== 'DEAD');
  const dead = workers.filter((w: any) => w.status === 'DEAD');

  return (
    <div className="animate-fade-in space-y-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Workers</h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-gray-400">Monitor worker instances and their health</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl flex items-center justify-center">
              <Server className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="stat-label">Active Workers</span>
          </div>
          <span className="stat-value">{alive.length}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl flex items-center justify-center">
              <Cpu className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="stat-label">Busy Workers</span>
          </div>
          <span className="stat-value">{workers.filter((w: any) => w.status === 'BUSY').length}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 dark:bg-red-500/15 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <span className="stat-label">Dead Workers</span>
          </div>
          <span className="stat-value">{dead.length}</span>
        </div>
      </div>

      {/* Worker table */}
      <div className="glass-card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workers.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <Server className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-slate-400 dark:text-gray-400 text-xl font-bold">No workers registered</p>
            <p className="text-slate-500 dark:text-gray-500 text-base">Start a worker instance with <code className="text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-1 rounded-lg">npm run dev:worker</code></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-slate-500 dark:text-gray-500 text-left border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-surface-800/30">
                  <th className="p-5 font-bold text-xs uppercase tracking-wider pl-8">ID</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">Hostname</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">PID</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">Status</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">Started</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">Last Heartbeat</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider pr-8">Active Jobs</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker: any) => {
                  const lastSeen = new Date(worker.lastSeenAt);
                  const secondsAgo = Math.floor((Date.now() - lastSeen.getTime()) / 1000);

                  return (
                    <tr key={worker.id} className="table-row">
                      <td className="p-5 pl-8 font-mono text-sm text-slate-500 dark:text-gray-400">{worker.id.slice(0, 8)}…</td>
                      <td className="p-5 text-slate-900 dark:text-gray-200 font-bold">{worker.hostname}</td>
                      <td className="p-5 font-mono text-slate-500 dark:text-gray-400">{worker.pid}</td>
                      <td className="p-5"><StatusBadge status={worker.status} /></td>
                      <td className="p-5 text-slate-500 dark:text-gray-400">{new Date(worker.startedAt).toLocaleString()}</td>
                      <td className="p-5">
                        <span className={`font-semibold ${secondsAgo > 30 ? 'text-red-500' : secondsAgo > 15 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {secondsAgo}s ago
                        </span>
                      </td>
                      <td className="p-5 pr-8">
                        {worker.claimedJobs?.length > 0 ? (
                          <div className="space-y-2">
                            {worker.claimedJobs.map((job: any) => (
                              <div key={job.id} className="flex items-center gap-3">
                                <span className="px-2.5 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg text-xs font-bold uppercase tracking-wider">{job.type}</span>
                                <StatusBadge status={job.status} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-gray-600 font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
