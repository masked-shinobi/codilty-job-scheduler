import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { jobsApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { RotateCcw, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const token = await getToken();
      return jobsApi.get(id!, token!);
    },
    refetchInterval: 3000,
    enabled: !!id,
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return jobsApi.retry(id!, token!);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const job = data?.data;
  if (!job) {
    return <div className="text-slate-500 dark:text-gray-400 text-center py-20 text-lg">Job not found</div>;
  }

  const canRetry = job.status === 'FAILED' || job.status === 'DEAD';

  return (
    <div className="animate-fade-in space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Job Detail</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="font-mono text-base text-slate-500 dark:text-gray-500">{job.id}</p>
        </div>
        {canRetry && (
          <button 
            onClick={() => retryMutation.mutate()} 
            className="btn-primary flex items-center justify-center gap-3" 
            disabled={retryMutation.isPending}
          >
            <RotateCcw className="w-5 h-5" />
            <span>Retry Job</span>
          </button>
        )}
      </div>

      {/* Info grid */}
      <div className="glass-card">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Job Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8 text-base">
          <InfoItem label="Type" value={job.type} />
          <InfoItem label="Queue" value={job.queue?.name || '—'} />
          <InfoItem label="Priority" value={String(job.priority)} />
          <InfoItem label="Attempts" value={`${job.attemptCount} / ${job.maxAttempts}`} />
          <InfoItem label="Created" value={new Date(job.createdAt).toLocaleString()} />
          <InfoItem label="Run At" value={new Date(job.runAt).toLocaleString()} />
          <InfoItem label="Claimed By" value={job.worker?.hostname || '—'} />
          <InfoItem label="Batch ID" value={job.batchId ? job.batchId.slice(0, 8) + '…' : '—'} />
        </div>
        {job.payload && Object.keys(job.payload).length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
            <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3">Payload</p>
            <pre className="bg-slate-50 dark:bg-surface-900/50 rounded-2xl p-6 text-sm font-mono text-slate-700 dark:text-gray-300 overflow-auto max-h-64 border border-slate-200/50 dark:border-transparent">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Dead Letter info */}
      {job.deadLetter && (
        <div className="glass-card !border-l-4 !border-l-red-500 bg-red-500/[0.02]">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            Dead Letter Queue
          </h2>
          <p className="text-base text-slate-700 dark:text-gray-300 font-semibold">{job.deadLetter.failureReason}</p>
          <p className="text-sm text-slate-500 dark:text-gray-500 mt-2">Moved at: {new Date(job.deadLetter.movedAt).toLocaleString()}</p>
        </div>
      )}

      {/* Execution History Timeline */}
      <div className="glass-card">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
          <Clock className="w-6 h-6 text-brand-500 dark:text-brand-400" />
          Execution History
        </h2>
        {job.executions?.length > 0 ? (
          <div className="space-y-6">
            {job.executions.map((exec: any, idx: number) => (
              <div key={exec.id} className="relative pl-10">
                {/* Timeline line */}
                {idx < job.executions.length - 1 && (
                  <div className="absolute left-[15px] top-9 w-0.5 h-full bg-slate-200 dark:bg-white/5" />
                )}
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                  exec.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  exec.status === 'FAILED' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 
                  'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {exec.status === 'COMPLETED' ? <CheckCircle className="w-5 h-5" /> :
                   exec.status === 'FAILED' ? <XCircle className="w-5 h-5" /> :
                   <Clock className="w-5 h-5" />}
                </div>

                <div className="bg-slate-50 dark:bg-surface-700/30 rounded-2xl p-6 border border-slate-200/50 dark:border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-slate-900 dark:text-white">Attempt #{exec.attemptNumber}</span>
                      <StatusBadge status={exec.status} />
                    </div>
                    <span className="text-sm font-semibold text-slate-500 dark:text-gray-400">
                      {exec.finishedAt
                        ? `${((new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000).toFixed(1)}s`
                        : 'Running...'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Worker: <span className="font-semibold text-slate-800 dark:text-gray-300">{exec.worker?.hostname || 'Unknown'}</span>
                    {' · '}Started: <span className="font-semibold text-slate-800 dark:text-gray-300">{new Date(exec.startedAt).toLocaleString()}</span>
                  </p>
                  {exec.errorMessage && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl p-4 font-mono leading-relaxed">{exec.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-gray-500 text-base py-4">No executions yet</p>
        )}
      </div>

      {/* Logs */}
      <div className="glass-card">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Logs</h2>
        {job.logs?.length > 0 ? (
          <div className="bg-slate-900 text-slate-100 dark:bg-surface-900/50 rounded-2xl p-6 max-h-96 overflow-auto space-y-2 border border-slate-950">
            {job.logs.map((log: any) => (
              <div key={log.id} className="flex gap-4 text-xs font-mono leading-relaxed">
                <span className="text-slate-500 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`flex-shrink-0 w-14 font-bold ${
                  log.level === 'ERROR' ? 'text-red-400' :
                  log.level === 'WARN' ? 'text-amber-400' : 'text-slate-400'
                }`}>[{log.level}]</span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-gray-500 text-base py-4">No logs available</p>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-bold text-slate-400 dark:text-gray-500 block uppercase tracking-widest mb-1.5">{label}</span>
      <span className="text-slate-800 dark:text-gray-200 font-mono font-semibold text-base">{value}</span>
    </div>
  );
}
