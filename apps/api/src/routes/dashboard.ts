import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateQueueHealth } from '@job-scheduler/shared';

const router = Router();

/**
 * @swagger
 * /api/dashboard/metrics:
 *   get:
 *     summary: Dashboard metrics (throughput, success/fail ratio, per-queue health)
 *     tags: [Dashboard]
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Build queue filter
    const queueFilter: any = {};
    if (projectId) {
      queueFilter.projectId = projectId;
    }

    const queues = await prisma.queue.findMany({
      where: queueFilter,
      select: { id: true, name: true },
    });
    const queueIds = queues.map((q) => q.id);

    // ─── Throughput over time (last 24h, bucketed by hour) ─────────────────
    const throughputRaw = await prisma.$queryRaw<Array<{ hour: Date; count: bigint }>>`
      SELECT date_trunc('hour', "updatedAt") as hour, COUNT(*)::bigint as count
      FROM "Job"
      WHERE "queueId" = ANY(${queueIds})
        AND status IN ('COMPLETED', 'FAILED', 'DEAD')
        AND "updatedAt" >= ${twentyFourHoursAgo}
      GROUP BY date_trunc('hour', "updatedAt")
      ORDER BY hour ASC
    `;

    const throughputOverTime = throughputRaw.map((r) => ({
      timestamp: r.hour.toISOString(),
      count: Number(r.count),
    }));

    // ─── Success / Fail ratio ──────────────────────────────────────────────
    const statusCounts = await prisma.job.groupBy({
      by: ['status'],
      where: {
        queueId: { in: queueIds },
        updatedAt: { gte: twentyFourHoursAgo },
        status: { in: ['COMPLETED', 'FAILED', 'DEAD'] },
      },
      _count: true,
    });

    const successFailRatio = {
      success: 0,
      failed: 0,
      dead: 0,
    };
    statusCounts.forEach((s) => {
      if (s.status === 'COMPLETED') successFailRatio.success = s._count;
      if (s.status === 'FAILED') successFailRatio.failed = s._count;
      if (s.status === 'DEAD') successFailRatio.dead = s._count;
    });

    // ─── Per-queue health ──────────────────────────────────────────────────
    const queueStats = await Promise.all(
      queues.map(async (queue) => {
        const [recentStatus, backlogCount] = await Promise.all([
          prisma.job.groupBy({
            by: ['status'],
            where: {
              queueId: queue.id,
              updatedAt: { gte: twentyFourHoursAgo },
              status: { in: ['COMPLETED', 'FAILED', 'DEAD'] },
            },
            _count: true,
          }),
          prisma.job.count({
            where: { queueId: queue.id, status: 'QUEUED' },
          }),
        ]);

        const counts: Record<string, number> = {};
        recentStatus.forEach((s) => { counts[s.status] = s._count; });

        const completed = counts['COMPLETED'] || 0;
        const failed = (counts['FAILED'] || 0) + (counts['DEAD'] || 0);
        const total = completed + failed;
        const successRate = total > 0 ? (completed / total) * 100 : 100;

        // Also get running count
        const runningCount = await prisma.job.count({
          where: { queueId: queue.id, status: { in: ['RUNNING', 'CLAIMED'] } },
        });

        return {
          queueId: queue.id,
          queueName: queue.name,
          health: calculateQueueHealth(successRate, backlogCount),
          queued: backlogCount,
          running: runningCount,
          completed,
          failed,
        };
      })
    );

    res.json({
      data: {
        throughputOverTime,
        successFailRatio,
        queueStats,
      },
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: { code: 'METRICS_ERROR', message: 'Failed to get dashboard metrics' } });
  }
});

export default router;
