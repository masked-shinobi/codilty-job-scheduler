import React from 'react';

const statusStyles: Record<string, string> = {
  QUEUED: 'badge-queued',
  SCHEDULED: 'badge-scheduled',
  CLAIMED: 'badge-claimed',
  RUNNING: 'badge-running',
  COMPLETED: 'badge-completed',
  FAILED: 'badge-failed',
  DEAD: 'badge-dead',
  HEALTHY: 'badge-healthy',
  DEGRADED: 'badge-degraded',
  UNHEALTHY: 'badge-unhealthy',
  IDLE: 'badge bg-emerald-500/15 text-emerald-400',
  BUSY: 'badge bg-amber-500/15 text-amber-400',
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const className = statusStyles[status] || 'badge bg-gray-500/15 text-gray-400';
  return <span className={className}>{status}</span>;
}
