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
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Workers</h1>
        <p className="mt-1 text-gray-400">Monitor worker instances and their health</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="stat-label">Active Workers</span>
          </div>
          <span className="stat-value">{alive.length}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
            <span className="stat-label">Busy Workers</span>
          </div>
          <span className="stat-value">{workers.filter((w: any) => w.status === 'BUSY').length}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-400" />
            </div>
            <span className="stat-label">Dead Workers</span>
          </div>
          <span className="stat-value">{dead.length}</span>
        </div>
      </div>

      {/* Worker table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workers.length === 0 ? (
          <div className="p-12 text-center">
            <Server className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-lg">No workers registered</p>
            <p className="text-gray-500 text-sm mt-1">Start a worker instance with <code className="text-brand-400">npm run dev:worker</code></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-white/5 bg-surface-800/50">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Hostname</th>
                  <th className="p-4 font-medium">PID</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Started</th>
                  <th className="p-4 font-medium">Last Heartbeat</th>
                  <th className="p-4 font-medium">Active Jobs</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker: any) => {
                  const lastSeen = new Date(worker.lastSeenAt);
                  const secondsAgo = Math.floor((Date.now() - lastSeen.getTime()) / 1000);

                  return (
                    <tr key={worker.id} className="table-row">
                      <td className="p-4 font-mono text-xs text-gray-400">{worker.id.slice(0, 8)}…</td>
                      <td className="p-4 text-gray-200 font-medium">{worker.hostname}</td>
                      <td className="p-4 font-mono text-gray-400">{worker.pid}</td>
                      <td className="p-4"><StatusBadge status={worker.status} /></td>
                      <td className="p-4 text-gray-400">{new Date(worker.startedAt).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`${secondsAgo > 30 ? 'text-red-400' : secondsAgo > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {secondsAgo}s ago
                        </span>
                      </td>
                      <td className="p-4">
                        {worker.claimedJobs?.length > 0 ? (
                          <div className="space-y-1">
                            {worker.claimedJobs.map((job: any) => (
                              <div key={job.id} className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded text-xs">{job.type}</span>
                                <StatusBadge status={job.status} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
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
