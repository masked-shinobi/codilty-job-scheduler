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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const job = data?.data;
  if (!job) {
    return <div className="text-gray-400 text-center py-12">Job not found</div>;
  }

  const canRetry = job.status === 'FAILED' || job.status === 'DEAD';

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">Job Detail</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="font-mono text-sm text-gray-500">{job.id}</p>
        </div>
        {canRetry && (
          <button onClick={() => retryMutation.mutate()} className="btn-primary flex items-center gap-2" disabled={retryMutation.isPending}>
            <RotateCcw className="w-4 h-4" />
            Retry Job
          </button>
        )}
      </div>

      {/* Info grid */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Job Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
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
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Payload</p>
            <pre className="bg-surface-900/50 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto max-h-48">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Dead Letter info */}
      {job.deadLetter && (
        <div className="glass-card p-6 border-l-4 border-red-500">
          <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Dead Letter Queue
          </h2>
          <p className="text-sm text-gray-400">{job.deadLetter.failureReason}</p>
          <p className="text-xs text-gray-500 mt-1">Moved at: {new Date(job.deadLetter.movedAt).toLocaleString()}</p>
        </div>
      )}

      {/* Execution History Timeline */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-400" />
          Execution History
        </h2>
        {job.executions?.length > 0 ? (
          <div className="space-y-4">
            {job.executions.map((exec: any, idx: number) => (
              <div key={exec.id} className="relative pl-8">
                {/* Timeline line */}
                {idx < job.executions.length - 1 && (
                  <div className="absolute left-[11px] top-8 w-0.5 h-full bg-white/5" />
                )}
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                  exec.status === 'COMPLETED' ? 'bg-emerald-500/20' :
                  exec.status === 'FAILED' ? 'bg-red-500/20' : 'bg-amber-500/20'
                }`}>
                  {exec.status === 'COMPLETED' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> :
                   exec.status === 'FAILED' ? <XCircle className="w-3.5 h-3.5 text-red-400" /> :
                   <Clock className="w-3.5 h-3.5 text-amber-400" />}
                </div>

                <div className="bg-surface-700/30 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">Attempt #{exec.attemptNumber}</span>
                      <StatusBadge status={exec.status} />
                    </div>
                    <span className="text-xs text-gray-500">
                      {exec.finishedAt
                        ? `${((new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000).toFixed(1)}s`
                        : 'Running...'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Worker: <span className="text-gray-400">{exec.worker?.hostname || 'Unknown'}</span>
                    {' · '}Started: <span className="text-gray-400">{new Date(exec.startedAt).toLocaleString()}</span>
                  </p>
                  {exec.errorMessage && (
                    <p className="mt-2 text-xs text-red-400 bg-red-500/5 rounded-lg p-2 font-mono">{exec.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No executions yet</p>
        )}
      </div>

      {/* Logs */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Logs</h2>
        {job.logs?.length > 0 ? (
          <div className="bg-surface-900/50 rounded-xl p-4 max-h-96 overflow-auto space-y-1">
            {job.logs.map((log: any) => (
              <div key={log.id} className="flex gap-3 text-xs font-mono">
                <span className="text-gray-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`flex-shrink-0 w-12 ${
                  log.level === 'ERROR' ? 'text-red-400' :
                  log.level === 'WARN' ? 'text-amber-400' : 'text-gray-500'
                }`}>[{log.level}]</span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No logs available</p>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500 block text-xs uppercase tracking-wider">{label}</span>
      <span className="text-gray-200 font-mono">{value}</span>
    </div>
  );
}
