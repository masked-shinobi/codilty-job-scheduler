import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { CreateJobSchema, PaginationSchema, JobFilterSchema } from '@job-scheduler/shared';
import { parseExpression } from 'cron-parser';

const router = Router();

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create job(s) — supports immediate, delayed, scheduled, recurring, batch
 *     tags: [Jobs]
 */
router.post('/', validate(CreateJobSchema), async (req: Request, res: Response) => {
  try {
    const input = req.body;

    switch (input.jobType) {
      case 'immediate': {
        const job = await prisma.job.create({
          data: {
            queueId: input.queueId,
            type: input.type,
            payload: input.payload || {},
            priority: input.priority || 0,
            maxAttempts: input.maxAttempts || 3,
            status: 'QUEUED',
            runAt: new Date(),
          },
        });
        res.status(201).json({ data: job });
        return;
      }

      case 'delayed': {
        const runAt = new Date(Date.now() + input.delayMs);
        const job = await prisma.job.create({
          data: {
            queueId: input.queueId,
            type: input.type,
            payload: input.payload || {},
            priority: input.priority || 0,
            maxAttempts: input.maxAttempts || 3,
            status: 'SCHEDULED',
            runAt,
          },
        });
        res.status(201).json({ data: job });
        return;
      }

      case 'scheduled': {
        const job = await prisma.job.create({
          data: {
            queueId: input.queueId,
            type: input.type,
            payload: input.payload || {},
            priority: input.priority || 0,
            maxAttempts: input.maxAttempts || 3,
            status: 'SCHEDULED',
            runAt: new Date(input.runAt),
          },
        });
        res.status(201).json({ data: job });
        return;
      }

      case 'recurring': {
        // Parse cron to compute nextRunAt
        const interval = parseExpression(input.cronExpr);
        const nextRunAt = interval.next().toDate();

        const scheduledJob = await prisma.scheduledJob.create({
          data: {
            projectId: input.projectId,
            queueId: input.queueId,
            cronExpr: input.cronExpr,
            jobTemplate: {
              type: input.type,
              payload: input.payload || {},
              maxAttempts: input.maxAttempts || 3,
            },
            nextRunAt,
            isActive: true,
          },
        });
        res.status(201).json({ data: scheduledJob });
        return;
      }

      case 'batch': {
        const batchId = uuidv4();
        const jobs = await prisma.$transaction(
          input.jobs.map((j: any) =>
            prisma.job.create({
              data: {
                queueId: j.queueId,
                type: j.type,
                payload: j.payload || {},
                priority: j.priority || 0,
                maxAttempts: j.maxAttempts || 3,
                status: 'QUEUED',
                runAt: new Date(),
                batchId,
              },
            })
          )
        );
        res.status(201).json({ data: { batchId, jobs } });
        return;
      }
    }
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: { code: 'CREATE_JOB_ERROR', message: 'Failed to create job' } });
  }
});

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List jobs (paginated, filterable)
 *     tags: [Jobs]
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { status, queueId, batchId, type } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (status) where.status = status;
    if (queueId) where.queueId = queueId;
    if (batchId) where.batchId = batchId;
    if (type) where.type = type;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          queue: { select: { id: true, name: true } },
          worker: { select: { id: true, hostname: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      data: jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({ error: { code: 'LIST_JOBS_ERROR', message: 'Failed to list jobs' } });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job by ID (includes executions + logs)
 *     tags: [Jobs]
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        queue: { select: { id: true, name: true } },
        worker: { select: { id: true, hostname: true } },
        executions: {
          orderBy: { attemptNumber: 'asc' },
          include: {
            worker: { select: { id: true, hostname: true } },
          },
        },
        logs: {
          orderBy: { timestamp: 'asc' },
          take: 200,
        },
        deadLetter: true,
      },
    });

    if (!job) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
      return;
    }

    res.json({ data: job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: { code: 'GET_JOB_ERROR', message: 'Failed to get job' } });
  }
});

/**
 * @swagger
 * /api/jobs/{id}/retry:
 *   post:
 *     summary: Manually retry a FAILED or DEAD job
 *     tags: [Jobs]
 */
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });

    if (!job) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
      return;
    }

    if (job.status !== 'FAILED' && job.status !== 'DEAD') {
      res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Only FAILED or DEAD jobs can be retried' } });
      return;
    }

    const updatedJob = await prisma.$transaction(async (tx) => {
      // If the job was DEAD, remove from dead letter queue
      if (job.status === 'DEAD') {
        await tx.deadLetterJob.deleteMany({ where: { originalJobId: job.id } });
      }

      return tx.job.update({
        where: { id: job.id },
        data: {
          status: 'QUEUED',
          runAt: new Date(),
          claimedBy: null,
          claimedAt: null,
          attemptCount: 0,
        },
      });
    });

    res.json({ data: updatedJob });
  } catch (error) {
    console.error('Retry job error:', error);
    res.status(500).json({ error: { code: 'RETRY_JOB_ERROR', message: 'Failed to retry job' } });
  }
});

export default router;
