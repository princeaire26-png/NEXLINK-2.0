/**
 * Audit log routes.
 */

import { Router, Response } from 'express';
import { logger } from '../logger.js';
import { db } from '../db/index.js';
import { auditEvents } from '../db/schema.js';
import { desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';

export const auditRouter = Router();

/**
 * GET /api/v1/audit
 * List audit events for the user's organization.
 */
auditRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const eventType = req.query.eventType as string | undefined;
    
    let query = db.select().from(auditEvents);
    
    if (eventType) {
      query = query.where(sql`${auditEvents.eventType} = ${eventType}`) as any;
    }
    
    const events = await query
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit)
      .offset(offset);
    
    res.json({ events, total: events.length, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Failed to list audit events');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/audit/:id
 * Get a specific audit event.
 */
auditRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    
    const [event] = await db.select().from(auditEvents)
      .where(sql`${auditEvents.id} = ${eventId}`)
      .limit(1);
    
    if (!event) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    
    res.json(event);
  } catch (error) {
    logger.error({ error }, 'Failed to get audit event');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});
