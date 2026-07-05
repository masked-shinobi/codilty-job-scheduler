import { PrismaClient } from '@prisma/client';
import { getHandler } from './handlers';
import { calculateRetryDelay, RetryStrategy } from '@job-scheduler/shared';
import type { ClaimedJob } from './claim';

const prisma = new PrismaClient();

/**
 * Execute a claimed job:
 * 1. Set status to RUNNING, create JobExecution record
 * 2. Run the handler
 * 3. On success: mark COMPLETED
 * 4. On failure: apply retry logic or move to DEAD + DeadLetterJob
 */
export async function executeJob(job: ClaimedJob, workerId: string): Promise<void> {
  const startedAt = new Date();

  // Update job status to RUNNING
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'RUNNING' },
  });

  // Create execution record
  const execution = await prisma.jobExecution.create({
    data: {
      jobId: job.id,
      workerId,
      attemptNumber: job.attemptCount + 1,
      startedAt,
      status: 'RUNNING',
    },
  });

  // Log: job started
  await prisma.jobLog.create({
    data: {
      jobId: job.id,
      executionId: execution.id,
      level: 'INFO',
      message: `Job started (attempt ${job.attemptCount + 1}/${job.maxAttempts})`,
    },
  });

  try {
    const handler = getHandler(job.type);
    const result = await handler(job.payload);

    // ─── Success path ───────────────────────────────────────────────────
    const finishedAt = new Date();

    await prisma.$transaction([
      prisma.jobExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          finishedAt,
          result: result.result || {},
        },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          attemptCount: job.attemptCount + 1,
        },
      }),
      prisma.jobLog.create({
        data: {
          jobId: job.id,
          executionId: execution.id,
          level: 'INFO',
          message: `Job completed successfully in ${finishedAt.getTime() - startedAt.getTime()}ms`,
        },
      }),
    ]);

    console.log(`  ✅ Job ${job.id} (${job.type}) completed`);
  } catch (error: any) {
    // ─── Failure path ───────────────────────────────────────────────────
    const finishedAt = new Date();
    const errorMessage = error.message || 'Unknown error';
    const newAttemptCount = job.attemptCount + 1;

    // Update execution record
    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        finishedAt,
        errorMessage,
      },
    });

    // Log the failure
    await prisma.jobLog.create({
      data: {
        jobId: job.id,
        executionId: execution.id,
        level: 'ERROR',
        message: `Job failed: ${errorMessage}`,
      },
    });

    if (newAttemptCount >= job.maxAttempts) {
      // ─── DEAD: max attempts exhausted ───────────────────────────────
      await prisma.$transaction([
        prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'DEAD',
            attemptCount: newAttemptCount,
            claimedBy: null,
            claimedAt: null,
          },
        }),
        prisma.deadLetterJob.create({
          data: {
            originalJobId: job.id,
            queueId: job.queueId,
            payload: job.payload,
            failureReason: `Failed after ${newAttemptCount} attempts. Last error: ${errorMessage}`,
          },
        }),
        prisma.jobLog.create({
          data: {
            jobId: job.id,
            executionId: execution.id,
            level: 'ERROR',
            message: `Job moved to Dead Letter Queue after ${newAttemptCount} failed attempts`,
          },
        }),
      ]);

      console.log(`  💀 Job ${job.id} (${job.type}) moved to DLQ after ${newAttemptCount} attempts`);
    } else {
      // ─── Retry: compute delay and re-queue ──────────────────────────
      const retryPolicy = await prisma.retryPolicy.findUnique({
        where: { queueId: job.queueId },
      });

      const strategy = (retryPolicy?.strategy || 'EXPONENTIAL') as RetryStrategy;
      const baseDelayMs = retryPolicy?.baseDelayMs || 1000;
      const maxDelayMs = retryPolicy?.maxDelayMs || null;

      const delay = calculateRetryDelay(strategy, baseDelayMs, newAttemptCount, maxDelayMs);
      const nextRunAt = new Date(Date.now() + delay);

      await prisma.$transaction([
        prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'QUEUED',
            attemptCount: newAttemptCount,
            runAt: nextRunAt,
            claimedBy: null,
            claimedAt: null,
          },
        }),
        prisma.jobLog.create({
          data: {
            jobId: job.id,
            executionId: execution.id,
            level: 'WARN',
            message: `Job scheduled for retry in ${delay}ms (attempt ${newAttemptCount}/${job.maxAttempts}, strategy: ${strategy})`,
          },
        }),
      ]);

      console.log(`  🔄 Job ${job.id} (${job.type}) retry scheduled in ${delay}ms (${newAttemptCount}/${job.maxAttempts})`);
    }
  }
}
