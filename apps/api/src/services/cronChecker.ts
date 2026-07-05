import { prisma } from '../lib/prisma';
import { parseExpression } from 'cron-parser';

const CRON_CHECK_INTERVAL_MS = 60_000; // 60 seconds

let intervalId: NodeJS.Timeout | null = null;

/**
 * Cron Checker — runs every 60s in the API server.
 *
 * Scans the ScheduledJob table for active entries where nextRunAt <= now(),
 * spawns a new Job row from the stored jobTemplate, and recalculates nextRunAt
 * using cron-parser.
 */
async function checkScheduledJobs(): Promise<void> {
  try {
    const now = new Date();

    // Find all due scheduled jobs
    const dueJobs = await prisma.scheduledJob.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
    });

    if (dueJobs.length === 0) return;

    console.log(`[CronChecker] Found ${dueJobs.length} scheduled job(s) due for execution`);

    for (const scheduled of dueJobs) {
      try {
        const template = scheduled.jobTemplate as any;

        // Spawn a new Job row from the template
        await prisma.job.create({
          data: {
            queueId: scheduled.queueId,
            type: template.type,
            payload: template.payload || {},
            maxAttempts: template.maxAttempts || 3,
            status: 'QUEUED',
            runAt: new Date(),
            cronExpr: scheduled.cronExpr,
          },
        });

        // Calculate the next run time
        const interval = parseExpression(scheduled.cronExpr, {
          currentDate: now,
        });
        const nextRunAt = interval.next().toDate();

        await prisma.scheduledJob.update({
          where: { id: scheduled.id },
          data: { nextRunAt },
        });

        console.log(`[CronChecker] Spawned job from schedule ${scheduled.id}, next run at ${nextRunAt.toISOString()}`);
      } catch (error) {
        console.error(`[CronChecker] Error processing schedule ${scheduled.id}:`, error);

        // If the cron expression is invalid, deactivate the schedule
        if ((error as any)?.message?.includes('Invalid')) {
          await prisma.scheduledJob.update({
            where: { id: scheduled.id },
            data: { isActive: false },
          });
          console.warn(`[CronChecker] Deactivated schedule ${scheduled.id} due to invalid cron expression`);
        }
      }
    }
  } catch (error) {
    console.error('[CronChecker] Error during check:', error);
  }
}

/**
 * Start the cron checker background loop.
 */
export function startCronChecker(): void {
  console.log(`[CronChecker] Starting (interval: ${CRON_CHECK_INTERVAL_MS}ms)`);
  // Run once immediately on startup
  checkScheduledJobs();
  intervalId = setInterval(checkScheduledJobs, CRON_CHECK_INTERVAL_MS);
}

/**
 * Stop the cron checker.
 */
export function stopCronChecker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[CronChecker] Stopped');
  }
}
