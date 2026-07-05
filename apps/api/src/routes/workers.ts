import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @swagger
 * /api/workers:
 *   get:
 *     summary: List all registered workers with status
 *     tags: [Workers]
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        claimedJobs: {
          where: { status: { in: ['CLAIMED', 'RUNNING'] } },
          select: { id: true, type: true, status: true },
        },
        _count: { select: { heartbeats: true, executions: true } },
      },
    });

    res.json({ data: workers });
  } catch (error) {
    console.error('List workers error:', error);
    res.status(500).json({ error: { code: 'LIST_WORKERS_ERROR', message: 'Failed to list workers' } });
  }
});

export default router;
