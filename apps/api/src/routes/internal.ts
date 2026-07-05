import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { internalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { HeartbeatSchema } from '@job-scheduler/shared';

const router = Router();

/**
 * @swagger
 * /api/internal/heartbeat:
 *   post:
 *     summary: Worker heartbeat (internal, secured with INTERNAL_API_TOKEN)
 *     tags: [Internal]
 */
router.post('/heartbeat', internalAuthMiddleware, validate(HeartbeatSchema), async (req: Request, res: Response) => {
  try {
    const { workerId, status, currentJobId } = req.body;

    await prisma.$transaction([
      // Update worker last seen and status
      prisma.worker.update({
        where: { id: workerId },
        data: {
          lastSeenAt: new Date(),
          status: status === 'BUSY' ? 'BUSY' : 'IDLE',
        },
      }),
      // Insert heartbeat record
      prisma.workerHeartbeat.create({
        data: {
          workerId,
          currentJobId: currentJobId || null,
        },
      }),
    ]);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: { code: 'HEARTBEAT_ERROR', message: 'Failed to process heartbeat' } });
  }
});

/**
 * @swagger
 * /api/internal/register:
 *   post:
 *     summary: Worker registration (internal)
 *     tags: [Internal]
 */
router.post('/register', internalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { hostname, pid } = req.body;

    const worker = await prisma.worker.create({
      data: {
        hostname,
        pid,
        status: 'IDLE',
      },
    });

    res.status(201).json({ data: worker });
  } catch (error) {
    console.error('Worker registration error:', error);
    res.status(500).json({ error: { code: 'REGISTER_ERROR', message: 'Failed to register worker' } });
  }
});

/**
 * @swagger
 * /api/internal/deregister:
 *   post:
 *     summary: Worker deregistration on graceful shutdown (internal)
 *     tags: [Internal]
 */
router.post('/deregister', internalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { workerId } = req.body;

    await prisma.worker.update({
      where: { id: workerId },
      data: { status: 'DEAD' },
    });

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Worker deregistration error:', error);
    res.status(500).json({ error: { code: 'DEREGISTER_ERROR', message: 'Failed to deregister worker' } });
  }
});

export default router;
