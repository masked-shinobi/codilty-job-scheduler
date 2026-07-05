import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/rbac';
import { CreateOrganizationSchema, UpdateOrganizationSchema, AddOrgMemberSchema, UpdateOrgMemberRoleSchema } from '@job-scheduler/shared';

const router = Router();

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 */
router.post('/', validate(CreateOrganizationSchema), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.userId!;

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: { name, ownerId: userId },
      });

      await tx.orgMember.create({
        data: { orgId: newOrg.id, userId, role: 'OWNER' },
      });

      // Create a default project for the new org
      await tx.project.create({
        data: { name: 'Default Project', orgId: newOrg.id },
      });

      return newOrg;
    });

    res.status(201).json({ data: org });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: { code: 'CREATE_ORG_ERROR', message: 'Failed to create organization' } });
  }
});

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: List user's organizations
 *     tags: [Organizations]
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      include: {
        org: {
          include: {
            _count: { select: { projects: true, members: true } },
          },
        },
      },
    });

    const orgs = memberships.map((m) => ({
      ...m.org,
      role: m.role,
    }));

    res.json({ data: orgs });
  } catch (error) {
    console.error('List organizations error:', error);
    res.status(500).json({ error: { code: 'LIST_ORG_ERROR', message: 'Failed to list organizations' } });
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Organizations]
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        projects: true,
        _count: { select: { projects: true, members: true } },
      },
    });

    if (!org) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
      return;
    }

    res.json({ data: org });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: { code: 'GET_ORG_ERROR', message: 'Failed to get organization' } });
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   patch:
 *     summary: Update organization
 *     tags: [Organizations]
 */
router.patch('/:id', requireRole('OWNER', 'ADMIN'), validate(UpdateOrganizationSchema), async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: org });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: { code: 'UPDATE_ORG_ERROR', message: 'Failed to update organization' } });
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   delete:
 *     summary: Delete organization (OWNER only)
 *     tags: [Organizations]
 */
router.delete('/:id', requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    await prisma.organization.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ error: { code: 'DELETE_ORG_ERROR', message: 'Failed to delete organization' } });
  }
});

// ─── Member management ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/organizations/{id}/members:
 *   post:
 *     summary: Add a member to the organization (OWNER/ADMIN only)
 *     tags: [Organizations]
 */
router.post('/:id/members', requireRole('OWNER', 'ADMIN'), validate(AddOrgMemberSchema), async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    const orgId = req.params.id;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User with this email not found' } });
      return;
    }

    const existing = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: user.id } },
    });
    if (existing) {
      res.status(409).json({ error: { code: 'ALREADY_MEMBER', message: 'User is already a member' } });
      return;
    }

    const member = await prisma.orgMember.create({
      data: { orgId, userId: user.id, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    res.status(201).json({ data: member });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: { code: 'ADD_MEMBER_ERROR', message: 'Failed to add member' } });
  }
});

/**
 * @swagger
 * /api/organizations/{id}/members/{memberId}:
 *   patch:
 *     summary: Update member role (OWNER/ADMIN only)
 *     tags: [Organizations]
 */
router.patch('/:id/members/:memberId', requireRole('OWNER', 'ADMIN'), validate(UpdateOrgMemberRoleSchema), async (req: Request, res: Response) => {
  try {
    const member = await prisma.orgMember.update({
      where: { id: req.params.memberId },
      data: { role: req.body.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.json({ data: member });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: { code: 'UPDATE_MEMBER_ERROR', message: 'Failed to update member role' } });
  }
});

/**
 * @swagger
 * /api/organizations/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove member from organization (OWNER/ADMIN only)
 *     tags: [Organizations]
 */
router.delete('/:id/members/:memberId', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.orgMember.delete({ where: { id: req.params.memberId } });
    res.status(204).send();
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: { code: 'REMOVE_MEMBER_ERROR', message: 'Failed to remove member' } });
  }
});

export default router;
