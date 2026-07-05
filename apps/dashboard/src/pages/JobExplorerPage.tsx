import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const JOB_STATUSES = ['', 'QUEUED', 'SCHEDULED', 'CLAIMED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD'];

export default function JobExplorerPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, filters],
    queryFn: async () => {
      const token = await getToken();
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filters.status) params.status = filters.status;
      if (filters.queueId) params.queueId = filters.queueId;
      if (filters.type) params.type = filters.type;
      if (filters.batchId) params.batchId = filters.batchId;
      return jobsApi.list(token!, params);
    },
    refetchInterval: 5000,
  });

  const jobs = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="animate-fade-in space-y-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Job Explorer</h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-gray-400">Browse and inspect all jobs across your queues</p>
      </div>

      {/* Filters */}
      <div className="glass-card !p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-slate-500 dark:text-gray-400">
            <Filter className="w-5 h-5" />
            <span className="text-base font-semibold uppercase tracking-wider text-xs">Filters</span>
          </div>

          <select
            className="input-field w-auto min-w-[160px]"
            value={filters.status || ''}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          >
            <option value="">All statuses</option>
            {JOB_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            className="input-field w-auto min-w-[160px]"
            placeholder="Queue ID"
            value={filters.queueId || ''}
            onChange={(e) => { setFilters({ ...filters, queueId: e.target.value }); setPage(1); }}
          />

          <input
            className="input-field w-auto min-w-[160px]"
            placeholder="Job type"
            value={filters.type || ''}
            onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1); }}
          />

          <input
            className="input-field w-auto min-w-[160px]"
            placeholder="Batch ID"
            value={filters.batchId || ''}
            onChange={(e) => { setFilters({ ...filters, batchId: e.target.value }); setPage(1); }}
          />

          {Object.values(filters).some(Boolean) && (
            <button className="btn-secondary !py-2.5 !px-4 text-sm" onClick={() => { setFilters({}); setPage(1); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Jobs table */}
      <div className="glass-card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-slate-500 dark:text-gray-500 text-lg font-semibold">No jobs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-slate-500 dark:text-gray-500 text-left border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-surface-800/30">
                  <th className="p-5 font-bold text-xs uppercase tracking-wider pl-8">ID</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">Type</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">Queue</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">Status</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider">Attempts</th>
                  <th className="p-5 font-bold text-xs uppercase tracking-wider pr-8">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => (
                  <tr
                    key={job.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <td className="p-5 pl-8 font-mono text-sm text-slate-500 dark:text-gray-400">{job.id.slice(0, 8)}…</td>
                    <td className="p-5">
                      <span className="px-3 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                        {job.type}
                      </span>
                    </td>
                    <td className="p-5 text-slate-700 dark:text-gray-300 font-semibold">{job.queue?.name || '—'}</td>
                    <td className="p-5"><StatusBadge status={job.status} /></td>
                    <td className="p-5 font-mono font-semibold text-slate-600 dark:text-gray-400">{job.attemptCount}/{job.maxAttempts}</td>
                    <td className="p-5 text-slate-500 dark:text-gray-400 pr-8">{new Date(job.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
            <span className="text-base text-slate-500 dark:text-gray-400">
              Page <span className="font-bold text-slate-800 dark:text-gray-200">{page}</span> of <span className="font-bold text-slate-800 dark:text-gray-200">{totalPages}</span> ({data?.total || 0} total)
            </span>
            <div className="flex gap-3">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn-secondary !p-3">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn-secondary !p-3">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
