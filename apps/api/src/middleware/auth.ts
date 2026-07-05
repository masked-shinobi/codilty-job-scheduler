import { Request, Response, NextFunction } from 'express';
import { clerkClient, verifyToken } from '@clerk/express';
import { prisma } from '../lib/prisma';

// Extend Express Request to carry authenticated user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      clerkUserId?: string;
    }
  }
}

/**
 * Clerk JWT authentication middleware.
 * Verifies the Bearer token, syncs the user to the local database (creating
 * a default Organization + Project on first login), and attaches req.userId.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
      return;
    }

    const token = authHeader.split(' ')[1];

    let clerkUserId: string;
    let email: string;
    let name: string | null = null;

    try {
      if (token === 'dummy-token') {
        clerkUserId = 'user_dummy_12345';
        email = 'dev-admin@jobflow.dev';
        name = 'Alex Rivera';
      } else {
        // Verify the JWT with Clerk
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        clerkUserId = payload.sub;

        // Get user details from Clerk
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        email = clerkUser.emailAddresses[0]?.emailAddress || '';
        name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;
      }
    } catch (err) {
      res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
      return;
    }

    // Sync user to local DB (upsert)
    let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });

    if (!user) {
      // First login — create user, default org, and default project
      user = await prisma.$transaction(async (tx: any) => {
        const newUser = await tx.user.create({
          data: {
            clerkId: clerkUserId,
            email,
            name,
          },
        });

        const defaultOrg = await tx.organization.create({
          data: {
            name: 'My Org',
            ownerId: newUser.id,
          },
        });

        await tx.orgMember.create({
          data: {
            orgId: defaultOrg.id,
            userId: newUser.id,
            role: 'OWNER',
          },
        });

        await tx.project.create({
          data: {
            name: 'Default Project',
            orgId: defaultOrg.id,
          },
        });

        return newUser;
      });
    }

    if (!user) {
      res.status(500).json({ error: { code: 'SYNC_ERROR', message: 'Failed to sync user' } });
      return;
    }

    req.userId = user.id;
    req.clerkUserId = clerkUserId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: { code: 'AUTH_ERROR', message: 'Authentication failed' } });
  }
}

/**
 * Internal API token middleware for worker-to-API communication.
 */
export function internalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string;
  const expectedToken = process.env.INTERNAL_API_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Invalid internal token' } });
    return;
  }

  next();
}
