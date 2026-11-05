/**
 * Session management routes.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { logger } from '../logger.js';
import { db } from '../db/index.js';
import { connectionSessions, devices, auditEvents } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';

export const sessionsRouter = Router();

const startSessionSchema = z.object({
  deviceId: z.string().uuid(),
  type: z.enum(['remote_desktop', 'terminal', 'file_transfer', 'ai_assistant']),
});

/**
 * GET /api/v1/sessions
 * List user's sessions.
 */
sessionsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const sessions = await db.select({
      id: connectionSessions.id,
      type: connectionSessions.type,
      status: connectionSessions.status,
      startedAt: connectionSessions.startedAt,
      endedAt: connectionSessions.endedAt,
      duration: connectionSessions.duration,
      deviceId: connectionSessions.deviceId,
      deviceName: devices.name,
    })
    .from(connectionSessions)
    .leftJoin(devices, eq(connectionSessions.deviceId, devices.id))
    .where(eq(connectionSessions.userId, userId))
    .orderBy(desc(connectionSessions.startedAt))
    .limit(50);
    
    res.json({ sessions, total: sessions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to list sessions');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/v1/sessions
 * Start a new session.
 */
sessionsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const body = startSessionSchema.parse(req.body);
    
    // Verify device ownership and approval
    const [device] = await db.select().from(devices).where(
      and(eq(devices.id, body.deviceId), eq(devices.ownerId, userId))
    ).limit(1);
    
    if (!device) {
      return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    }
    
    if (!device.approved) {
      return res.status(403).json({ error: 'DEVICE_NOT_APPROVED' });
    }
    
    if (device.status === 'revoked') {
      return res.status(403).json({ error: 'DEVICE_REVOKED' });
    }
    
    // Create session
    const [session] = await db.insert(connectionSessions).values({
      id: crypto.randomUUID(),
      userId,
      deviceId: body.deviceId,
      type: body.type,
      status: 'active',
    }).returning();
    
    // Audit
    await db.insert(auditEvents).values({
      eventType: 'session_started',
      actorId: userId,
      actorType: 'user',
      targetType: 'session',
      targetId: session.id,
      action: 'start_session',
      result: 'success',
      details: { type: body.type, deviceId: body.deviceId },
      ipAddress: req.ip,
    });
    
    logger.info({ userId, sessionId: session.id, type: body.type }, 'Session started');
    
    res.status(201).json({
      id: session.id,
      type: session.type,
      status: session.status,
      startedAt: session.startedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    logger.error({ error }, 'Failed to start session');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/v1/sessions/:id/end
 * End a session.
 */
sessionsRouter.post('/:id/end', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const sessionId = req.params.id;
    
    const [session] = await db.select().from(connectionSessions).where(
      and(eq(connectionSessions.id, sessionId), eq(connectionSessions.userId, userId))
    ).limit(1);
    
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    }
    
    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - new Date(session.startedAt).getTime()) / 1000);
    
    await db.update(connectionSessions)
      .set({ status: 'ended', endedAt, duration })
      .where(eq(connectionSessions.id, sessionId));
    
    await db.insert(auditEvents).values({
      eventType: 'session_ended',
      actorId: userId,
      actorType: 'user',
      targetType: 'session',
      targetId: sessionId,
      action: 'end_session',
      result: 'success',
      details: { duration },
      ipAddress: req.ip,
    });
    
    res.json({ id: sessionId, status: 'ended', duration });
  } catch (error) {
    logger.error({ error }, 'Failed to end session');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});
