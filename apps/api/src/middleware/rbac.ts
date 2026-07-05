import { Request, Response, NextFunction } from 'express';
import { OrgRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * RBAC middleware factory.
 * Returns middleware that checks if the authenticated user has one of the
 * specified roles in the organization identified by :orgId param or by
 * looking up the resource's org.
 *
 * Usage:
 *   router.delete('/:id', requireRole('OWNER', 'ADMIN'), handler)
 */
export function requireRole(...allowedRoles: OrgRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      // Determine orgId from various sources
      let orgId: string | undefined = req.params.orgId || req.body?.orgId;

      // If no direct orgId, try to resolve from project or queue
      if (!orgId && req.params.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: req.params.projectId },
          select: { orgId: true },
        });
        orgId = project?.orgId;
      }

      if (!orgId && req.params.id) {
        // Try to resolve org from the entity being accessed
        // Check if it's a queue
        const queue = await prisma.queue.findUnique({
          where: { id: req.params.id },
          select: { project: { select: { orgId: true } } },
        });
        if (queue) {
          orgId = queue.project.orgId;
        } else {
          // Check if it's a project
          const project = await prisma.project.findUnique({
            where: { id: req.params.id },
            select: { orgId: true },
          });
          if (project) {
            orgId = project.orgId;
          } else {
            // Check if it's an organization directly
            const org = await prisma.organization.findUnique({
              where: { id: req.params.id },
              select: { id: true },
            });
            if (org) {
              orgId = org.id;
            }
          }
        }
      }

      if (!orgId) {
        res.status(400).json({ error: { code: 'MISSING_ORG', message: 'Cannot determine organization context' } });
        return;
      }

      const membership = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: { orgId, userId },
        },
      });

      if (!membership) {
        res.status(403).json({ error: { code: 'NOT_MEMBER', message: 'You are not a member of this organization' } });
        return;
      }

      if (!allowedRoles.includes(membership.role)) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: `This action requires one of: ${allowedRoles.join(', ')}. Your role: ${membership.role}`,
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: { code: 'RBAC_ERROR', message: 'Role check failed' } });
    }
  };
}

/**
 * Middleware that checks the user is at least a member of the organization.
 */
export function requireMember() {
  return requireRole('OWNER', 'ADMIN', 'MEMBER');
}
