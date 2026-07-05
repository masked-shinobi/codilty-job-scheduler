import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Job Explorer</h1>
        <p className="mt-1 text-gray-400">Browse and inspect all jobs across your queues</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
          </div>

          <select
            className="input-field w-auto"
            value={filters.status || ''}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          >
            <option value="">All statuses</option>
            {JOB_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            className="input-field w-auto"
            placeholder="Queue ID"
            value={filters.queueId || ''}
            onChange={(e) => { setFilters({ ...filters, queueId: e.target.value }); setPage(1); }}
          />

          <input
            className="input-field w-auto"
            placeholder="Job type"
            value={filters.type || ''}
            onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1); }}
          />

          <input
            className="input-field w-auto"
            placeholder="Batch ID"
            value={filters.batchId || ''}
            onChange={(e) => { setFilters({ ...filters, batchId: e.target.value }); setPage(1); }}
          />

          {Object.values(filters).some(Boolean) && (
            <button className="btn-secondary text-xs" onClick={() => { setFilters({}); setPage(1); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Jobs table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">No jobs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-white/5 bg-surface-800/50">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Queue</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Attempts</th>
                  <th className="p-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => (
                  <tr
                    key={job.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <td className="p-4 font-mono text-xs text-gray-400">{job.id.slice(0, 8)}…</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-brand-500/10 text-brand-400 rounded-lg text-xs font-medium">
                        {job.type}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">{job.queue?.name || '—'}</td>
                    <td className="p-4"><StatusBadge status={job.status} /></td>
                    <td className="p-4 font-mono text-gray-400">{job.attemptCount}/{job.maxAttempts}</td>
                    <td className="p-4 text-gray-400">{new Date(job.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages} ({data?.total || 0} total)
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn-secondary p-2">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn-secondary p-2">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
