import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/rbac';
import { CreateProjectSchema, UpdateProjectSchema, PaginationSchema } from '@job-scheduler/shared';

const router = Router();

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 */
router.post('/', validate(CreateProjectSchema), async (req: Request, res: Response) => {
  try {
    const { name, orgId } = req.body;

    // Verify user is a member of this org
    const membership = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: req.userId! } },
    });
    if (!membership) {
      res.status(403).json({ error: { code: 'NOT_MEMBER', message: 'You are not a member of this organization' } });
      return;
    }

    const project = await prisma.project.create({
      data: { name, orgId },
    });
    res.status(201).json({ data: project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: { code: 'CREATE_PROJECT_ERROR', message: 'Failed to create project' } });
  }
});

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List projects (filtered by orgId)
 *     tags: [Projects]
 */
router.get('/', validate(PaginationSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query as any;
    const orgId = req.query.orgId as string | undefined;

    // Get all orgs the user belongs to
    const memberships = await prisma.orgMember.findMany({
      where: { userId: req.userId! },
      select: { orgId: true },
    });
    const orgIds = orgId ? [orgId] : memberships.map((m) => m.orgId);

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { orgId: { in: orgIds } },
        include: {
          org: { select: { id: true, name: true } },
          _count: { select: { queues: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where: { orgId: { in: orgIds } } }),
    ]);

    res.json({
      data: projects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: { code: 'LIST_PROJECTS_ERROR', message: 'Failed to list projects' } });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        org: { select: { id: true, name: true } },
        queues: { include: { retryPolicy: true } },
        _count: { select: { queues: true } },
      },
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
      return;
    }

    res.json({ data: project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: { code: 'GET_PROJECT_ERROR', message: 'Failed to get project' } });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update project
 *     tags: [Projects]
 */
router.patch('/:id', validate(UpdateProjectSchema), async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: { code: 'UPDATE_PROJECT_ERROR', message: 'Failed to update project' } });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete project (OWNER/ADMIN only)
 *     tags: [Projects]
 */
router.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: { code: 'DELETE_PROJECT_ERROR', message: 'Failed to delete project' } });
  }
});

export default router;
