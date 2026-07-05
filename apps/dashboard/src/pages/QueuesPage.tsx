import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { queuesApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { Pause, Play, Plus, Settings, Trash2 } from 'lucide-react';

export default function QueuesPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newQueue, setNewQueue] = useState({ name: '', projectId: '', priority: 0, concurrencyLimit: 5 });

  const { data: queuesData, isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const token = await getToken();
      return queuesApi.list(token!);
    },
    refetchInterval: 5000,
  });

  const pauseMutation = useMutation({
    mutationFn: async ({ id, isPaused }: { id: string; isPaused: boolean }) => {
      const token = await getToken();
      return isPaused ? queuesApi.resume(id, token!) : queuesApi.pause(id, token!);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return queuesApi.delete(id, token!);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await getToken();
      return queuesApi.create(data, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setShowCreate(false);
      setNewQueue({ name: '', projectId: '', priority: 0, concurrencyLimit: 5 });
    },
  });

  const queues = queuesData?.data || [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Queues</h1>
          <p className="mt-1 text-gray-400">Manage job queues and their configurations</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Queue
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Queue</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="input-field"
              placeholder="Queue name"
              value={newQueue.name}
              onChange={(e) => setNewQueue({ ...newQueue, name: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Project ID"
              value={newQueue.projectId}
              onChange={(e) => setNewQueue({ ...newQueue, projectId: e.target.value })}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Priority"
              value={newQueue.priority}
              onChange={(e) => setNewQueue({ ...newQueue, priority: parseInt(e.target.value) || 0 })}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Concurrency limit"
              value={newQueue.concurrencyLimit}
              onChange={(e) => setNewQueue({ ...newQueue, concurrencyLimit: parseInt(e.target.value) || 5 })}
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => createMutation.mutate(newQueue)} className="btn-primary" disabled={!newQueue.name || !newQueue.projectId}>
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Queue list */}
      {isLoading ? (
        <div className="glass-card p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queues.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-400 text-lg">No queues yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first queue to start scheduling jobs</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {queues.map((queue: any) => (
            <QueueCard
              key={queue.id}
              queue={queue}
              onTogglePause={() => pauseMutation.mutate({ id: queue.id, isPaused: queue.isPaused })}
              onDelete={() => {
                if (confirm('Delete this queue and all its jobs?')) {
                  deleteMutation.mutate(queue.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueCard({ queue, onTogglePause, onDelete }: { queue: any; onTogglePause: () => void; onDelete: () => void }) {
  return (
    <div className="glass-card-hover p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{queue.name}</h3>
          <p className="text-sm text-gray-500">{queue.project?.name || 'Unknown project'}</p>
        </div>
        <div className="flex items-center gap-2">
          {queue.isPaused && <StatusBadge status="DEGRADED" />}
          <button
            onClick={onTogglePause}
            className={`p-2 rounded-lg transition-colors ${queue.isPaused ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'}`}
            title={queue.isPaused ? 'Resume' : 'Pause'}
          >
            {queue.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500 block">Priority</span>
          <span className="text-gray-200 font-mono">{queue.priority}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Concurrency</span>
          <span className="text-gray-200 font-mono">{queue.concurrencyLimit}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Total Jobs</span>
          <span className="text-gray-200 font-mono">{queue._count?.jobs || 0}</span>
        </div>
      </div>

      {queue.retryPolicy && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Retry Policy</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>Strategy: <span className="text-gray-300">{queue.retryPolicy.strategy}</span></span>
            <span>Base: <span className="text-gray-300">{queue.retryPolicy.baseDelayMs}ms</span></span>
            <span>Max: <span className="text-gray-300">{queue.retryPolicy.maxRetries} retries</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
