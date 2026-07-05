import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/rbac';
import { CreateQueueSchema, UpdateQueueSchema, RetryPolicySchema } from '@job-scheduler/shared';
import { calculateQueueHealth } from '@job-scheduler/shared';

const router = Router();

/**
 * @swagger
 * /api/queues:
 *   post:
 *     summary: Create a new queue
 *     tags: [Queues]
 */
router.post('/', validate(CreateQueueSchema), async (req: Request, res: Response) => {
  try {
    const { projectId, name, priority, concurrencyLimit } = req.body;

    const queue = await prisma.$transaction(async (tx) => {
      const newQueue = await tx.queue.create({
        data: { projectId, name, priority, concurrencyLimit },
      });

      // Create default retry policy
      await tx.retryPolicy.create({
        data: {
          queueId: newQueue.id,
          strategy: 'EXPONENTIAL',
          baseDelayMs: 1000,
          maxRetries: 3,
          maxDelayMs: 60000,
        },
      });

      return newQueue;
    });

    const fullQueue = await prisma.queue.findUnique({
      where: { id: queue.id },
      include: { retryPolicy: true },
    });

    res.status(201).json({ data: fullQueue });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: { code: 'DUPLICATE_QUEUE', message: 'A queue with this name already exists in this project' } });
      return;
    }
    console.error('Create queue error:', error);
    res.status(500).json({ error: { code: 'CREATE_QUEUE_ERROR', message: 'Failed to create queue' } });
  }
});

/**
 * @swagger
 * /api/queues:
 *   get:
 *     summary: List queues (filtered by projectId)
 *     tags: [Queues]
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;

    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    } else {
      // Only show queues from orgs the user belongs to
      const memberships = await prisma.orgMember.findMany({
        where: { userId: req.userId! },
        select: { orgId: true },
      });
      where.project = { orgId: { in: memberships.map((m) => m.orgId) } };
    }

    const queues = await prisma.queue.findMany({
      where,
      include: {
        retryPolicy: true,
        project: { select: { id: true, name: true, orgId: true } },
        _count: { select: { jobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: queues });
  } catch (error) {
    console.error('List queues error:', error);
    res.status(500).json({ error: { code: 'LIST_QUEUES_ERROR', message: 'Failed to list queues' } });
  }
});

/**
 * @swagger
 * /api/queues/{id}:
 *   get:
 *     summary: Get queue by ID
 *     tags: [Queues]
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const queue = await prisma.queue.findUnique({
      where: { id: req.params.id },
      include: {
        retryPolicy: true,
        project: { select: { id: true, name: true, orgId: true } },
        _count: { select: { jobs: true } },
      },
    });

    if (!queue) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Queue not found' } });
      return;
    }

    res.json({ data: queue });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: { code: 'GET_QUEUE_ERROR', message: 'Failed to get queue' } });
  }
});

/**
 * @swagger
 * /api/queues/{id}:
 *   patch:
 *     summary: Update queue
 *     tags: [Queues]
 */
router.patch('/:id', validate(UpdateQueueSchema), async (req: Request, res: Response) => {
  try {
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: req.body,
      include: { retryPolicy: true },
    });
    res.json({ data: queue });
  } catch (error) {
    console.error('Update queue error:', error);
    res.status(500).json({ error: { code: 'UPDATE_QUEUE_ERROR', message: 'Failed to update queue' } });
  }
});

/**
 * @swagger
 * /api/queues/{id}/retry-policy:
 *   put:
 *     summary: Update queue retry policy
 *     tags: [Queues]
 */
router.put('/:id/retry-policy', requireRole('OWNER', 'ADMIN'), validate(RetryPolicySchema), async (req: Request, res: Response) => {
  try {
    const policy = await prisma.retryPolicy.upsert({
      where: { queueId: req.params.id },
      update: req.body,
      create: { ...req.body, queueId: req.params.id },
    });
    res.json({ data: policy });
  } catch (error) {
    console.error('Update retry policy error:', error);
    res.status(500).json({ error: { code: 'UPDATE_POLICY_ERROR', message: 'Failed to update retry policy' } });
  }
});

/**
 * @swagger
 * /api/queues/{id}:
 *   delete:
 *     summary: Delete queue (OWNER/ADMIN only)
 *     tags: [Queues]
 */
router.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.queue.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete queue error:', error);
    res.status(500).json({ error: { code: 'DELETE_QUEUE_ERROR', message: 'Failed to delete queue' } });
  }
});

/**
 * @swagger
 * /api/queues/{id}/pause:
 *   post:
 *     summary: Pause queue (OWNER/ADMIN only)
 *     tags: [Queues]
 */
router.post('/:id/pause', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { isPaused: true },
    });
    res.json({ data: queue });
  } catch (error) {
    console.error('Pause queue error:', error);
    res.status(500).json({ error: { code: 'PAUSE_QUEUE_ERROR', message: 'Failed to pause queue' } });
  }
});

/**
 * @swagger
 * /api/queues/{id}/resume:
 *   post:
 *     summary: Resume queue (OWNER/ADMIN only)
 *     tags: [Queues]
 */
router.post('/:id/resume', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { isPaused: false },
    });
    res.json({ data: queue });
  } catch (error) {
    console.error('Resume queue error:', error);
    res.status(500).json({ error: { code: 'RESUME_QUEUE_ERROR', message: 'Failed to resume queue' } });
  }
});

/**
 * @swagger
 * /api/queues/{id}/stats:
 *   get:
 *     summary: Get queue statistics and health
 *     tags: [Queues]
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const queueId = req.params.id;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [queue, statusCounts, recentJobs] = await Promise.all([
      prisma.queue.findUnique({ where: { id: queueId } }),
      prisma.job.groupBy({
        by: ['status'],
        where: { queueId },
        _count: true,
      }),
      prisma.job.groupBy({
        by: ['status'],
        where: {
          queueId,
          updatedAt: { gte: twentyFourHoursAgo },
          status: { in: ['COMPLETED', 'FAILED', 'DEAD'] },
        },
        _count: true,
      }),
    ]);

    if (!queue) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Queue not found' } });
      return;
    }

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => { counts[s.status] = s._count; });

    const recentCounts: Record<string, number> = {};
    recentJobs.forEach((s) => { recentCounts[s.status] = s._count; });

    const completed24h = recentCounts['COMPLETED'] || 0;
    const failed24h = (recentCounts['FAILED'] || 0) + (recentCounts['DEAD'] || 0);
    const total24h = completed24h + failed24h;
    const successRate = total24h > 0 ? (completed24h / total24h) * 100 : 100;
    const backlog = counts['QUEUED'] || 0;

    const health = calculateQueueHealth(successRate, backlog);

    res.json({
      data: {
        queueId,
        queueName: queue.name,
        isPaused: queue.isPaused,
        health,
        successRate: Math.round(successRate * 100) / 100,
        backlog,
        counts,
        recentCounts: { completed: completed24h, failed: failed24h, total: total24h },
      },
    });
  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ error: { code: 'QUEUE_STATS_ERROR', message: 'Failed to get queue stats' } });
  }
});

export default router;
