import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface ClaimedJob {
  id: string;
  queueId: string;
  type: string;
  payload: any;
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  status: string;
  claimedBy: string | null;
  claimedAt: Date | null;
  runAt: Date;
  cronExpr: string | null;
  batchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Atomically claim a single job from a queue using Postgres row-level locking.
 *
 * Uses SELECT FOR UPDATE SKIP LOCKED to guarantee no two workers ever claim
 * the same job, even under high concurrency.
 *
 * Pre-checks:
 * - Queue is not paused
 * - Queue concurrency limit is not exceeded
 */
export async function claimJob(
  workerId: string,
  queueId: string
): Promise<ClaimedJob | null> {
  // Check if queue is paused
  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
    select: { isPaused: true, concurrencyLimit: true },
  });

  if (!queue || queue.isPaused) {
    return null;
  }

  // Check concurrency limit
  const runningCount = await prisma.job.count({
    where: {
      queueId,
      status: { in: ['CLAIMED', 'RUNNING'] },
    },
  });

  if (runningCount >= queue.concurrencyLimit) {
    return null;
  }

  // Atomic claim with row-level locking
  const claimed = await prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "Job"
    SET status = 'CLAIMED',
        "claimedBy" = ${workerId}::uuid,
        "claimedAt" = now(),
        "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "Job"
      WHERE "queueId" = ${queueId}::uuid
        AND status = 'QUEUED'
        AND "runAt" <= now()
      ORDER BY priority DESC, "runAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `;

  return claimed.length > 0 ? claimed[0] : null;
}

/**
 * Claim jobs from all available queues. Returns array of claimed jobs.
 */
export async function claimJobsFromAllQueues(
  workerId: string,
  maxConcurrent: number,
  currentRunning: number
): Promise<ClaimedJob[]> {
  const availableSlots = maxConcurrent - currentRunning;
  if (availableSlots <= 0) return [];

  // Get all non-paused queues ordered by priority
  const queues = await prisma.queue.findMany({
    where: { isPaused: false },
    orderBy: { priority: 'desc' },
    select: { id: true },
  });

  const claimed: ClaimedJob[] = [];

  for (const queue of queues) {
    if (claimed.length >= availableSlots) break;

    const job = await claimJob(workerId, queue.id);
    if (job) {
      claimed.push(job);
    }
  }

  return claimed;
}

export { prisma };
export type { ClaimedJob };
