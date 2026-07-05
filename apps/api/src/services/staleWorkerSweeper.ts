import { prisma } from '../lib/prisma';

const SWEEP_INTERVAL_MS = 15_000; // 15 seconds
const STALE_THRESHOLD_MS = parseInt(process.env.STALE_WORKER_THRESHOLD_MS || '30000', 10);

let intervalId: NodeJS.Timeout | null = null;

/**
 * Stale Worker Sweeper — runs every 15s in the API server.
 *
 * 1. Finds workers whose lastSeenAt is older than STALE_THRESHOLD_MS.
 * 2. Marks them as DEAD.
 * 3. Re-queues any jobs still in CLAIMED or RUNNING status under those workers
 *    (resets status to QUEUED, clears claimedBy/claimedAt).
 */
async function sweep(): Promise<void> {
  try {
    const threshold = new Date(Date.now() - STALE_THRESHOLD_MS);

    // Find stale workers
    const staleWorkers = await prisma.worker.findMany({
      where: {
        status: { not: 'DEAD' },
        lastSeenAt: { lt: threshold },
      },
    });

    if (staleWorkers.length === 0) return;

    const staleWorkerIds = staleWorkers.map((w) => w.id);

    console.log(`[StaleWorkerSweeper] Found ${staleWorkerIds.length} stale worker(s): ${staleWorkerIds.join(', ')}`);

    // Mark workers as DEAD and re-queue their jobs in a single transaction
    await prisma.$transaction([
      // Mark workers DEAD
      prisma.worker.updateMany({
        where: { id: { in: staleWorkerIds } },
        data: { status: 'DEAD' },
      }),
      // Re-queue any CLAIMED or RUNNING jobs under these workers
      prisma.job.updateMany({
        where: {
          claimedBy: { in: staleWorkerIds },
          status: { in: ['CLAIMED', 'RUNNING'] },
        },
        data: {
          status: 'QUEUED',
          claimedBy: null,
          claimedAt: null,
        },
      }),
    ]);

    // Log the re-queued jobs
    const requeued = await prisma.job.count({
      where: {
        status: 'QUEUED',
        updatedAt: { gte: new Date(Date.now() - 5000) },
      },
    });

    console.log(`[StaleWorkerSweeper] Marked ${staleWorkerIds.length} worker(s) as DEAD. Jobs re-queued.`);
  } catch (error) {
    console.error('[StaleWorkerSweeper] Error during sweep:', error);
  }
}

/**
 * Start the stale worker sweeper background loop.
 */
export function startStaleWorkerSweeper(): void {
  console.log(`[StaleWorkerSweeper] Starting (interval: ${SWEEP_INTERVAL_MS}ms, threshold: ${STALE_THRESHOLD_MS}ms)`);
  intervalId = setInterval(sweep, SWEEP_INTERVAL_MS);
}

/**
 * Stop the stale worker sweeper.
 */
export function stopStaleWorkerSweeper(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[StaleWorkerSweeper] Stopped');
  }
}
