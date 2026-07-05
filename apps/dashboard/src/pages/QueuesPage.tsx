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
    <div className="animate-fade-in space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Queues</h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-gray-400">Manage job queues and their configurations</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center justify-center gap-3">
          <Plus className="w-5 h-5" />
          <span>New Queue</span>
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="glass-card animate-slide-up">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Create New Queue</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500 dark:text-gray-400">Queue Name</label>
              <input
                className="input-field"
                placeholder="e.g. email-delivery"
                value={newQueue.name}
                onChange={(e) => setNewQueue({ ...newQueue, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500 dark:text-gray-400">Project ID</label>
              <input
                className="input-field"
                placeholder="Stitch Project ID"
                value={newQueue.projectId}
                onChange={(e) => setNewQueue({ ...newQueue, projectId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500 dark:text-gray-400">Priority</label>
              <input
                className="input-field"
                type="number"
                placeholder="0"
                value={newQueue.priority}
                onChange={(e) => setNewQueue({ ...newQueue, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500 dark:text-gray-400">Concurrency Limit</label>
              <input
                className="input-field"
                type="number"
                placeholder="5"
                value={newQueue.concurrencyLimit}
                onChange={(e) => setNewQueue({ ...newQueue, concurrencyLimit: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <button onClick={() => createMutation.mutate(newQueue)} className="btn-primary" disabled={!newQueue.name || !newQueue.projectId}>
              Create Queue
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Queue list */}
      {isLoading ? (
        <div className="glass-card flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queues.length === 0 ? (
        <div className="glass-card py-20 text-center space-y-4">
          <p className="text-slate-400 dark:text-gray-400 text-2xl font-bold">No queues yet</p>
          <p className="text-slate-500 dark:text-gray-500 text-base">Create your first queue to start scheduling jobs</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
    <div className="glass-card-hover animate-slide-up">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{queue.name}</h3>
          <p className="text-base text-slate-500 dark:text-gray-500 mt-1">{queue.project?.name || 'Unknown project'}</p>
        </div>
        <div className="flex items-center gap-3">
          {queue.isPaused && <StatusBadge status="DEGRADED" />}
          <button
            onClick={onTogglePause}
            className={`p-3 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
              queue.isPaused 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
            title={queue.isPaused ? 'Resume' : 'Pause'}
          >
            {queue.isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button 
            onClick={onDelete} 
            className="p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all duration-300 hover:scale-105 active:scale-95" 
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 text-base pt-2">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-gray-500 block uppercase tracking-widest mb-1">Priority</span>
          <span className="text-slate-800 dark:text-gray-200 font-mono font-bold text-lg">{queue.priority}</span>
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-gray-500 block uppercase tracking-widest mb-1">Concurrency</span>
          <span className="text-slate-800 dark:text-gray-200 font-mono font-bold text-lg">{queue.concurrencyLimit}</span>
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-gray-500 block uppercase tracking-widest mb-1">Total Jobs</span>
          <span className="text-slate-800 dark:text-gray-200 font-mono font-bold text-lg">{queue._count?.jobs || 0}</span>
        </div>
      </div>

      {queue.retryPolicy && (
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
          <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3">Retry Policy</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-gray-400">
            <span>Strategy: <span className="font-semibold text-slate-800 dark:text-gray-300">{queue.retryPolicy.strategy}</span></span>
            <span>Base: <span className="font-semibold text-slate-800 dark:text-gray-300">{queue.retryPolicy.baseDelayMs}ms</span></span>
            <span>Max: <span className="font-semibold text-slate-800 dark:text-gray-300">{queue.retryPolicy.maxRetries} retries</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
