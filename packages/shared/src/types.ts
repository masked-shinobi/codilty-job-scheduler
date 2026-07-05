// ─── Enums (mirrored from Prisma for frontend/shared use) ───────────────────

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum RetryStrategy {
  FIXED = 'FIXED',
  LINEAR = 'LINEAR',
  EXPONENTIAL = 'EXPONENTIAL',
}

export enum JobStatus {
  QUEUED = 'QUEUED',
  SCHEDULED = 'SCHEDULED',
  CLAIMED = 'CLAIMED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DEAD = 'DEAD',
}

export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum WorkerStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  DEAD = 'DEAD',
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export type QueueHealth = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

// ─── Shared API types ───────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardMetrics {
  throughputOverTime: Array<{ timestamp: string; count: number }>;
  successFailRatio: { success: number; failed: number; dead: number };
  queueStats: Array<{
    queueId: string;
    queueName: string;
    health: QueueHealth;
    queued: number;
    running: number;
    completed: number;
    failed: number;
  }>;
}
