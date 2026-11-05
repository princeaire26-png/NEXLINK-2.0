/**
 * Remote Desktop Session Routes
 * 
 * Phase 8: Remote Desktop MVP
 * Handles session creation, authorization, and frame relay.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '../logger.js';
import { db } from '../db/index.js';
import { devices, auditEvents } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';

export const remoteRouter = Router();

// In-memory session store (in production, use Redis)
interface RemoteSession {
  id: string;
  deviceId: string;
  controllerId: string;
  state: 'connecting' | 'active' | 'terminating' | 'terminated';
  createdAt: Date;
  lastActivity: Date;
  metrics: {
    framesSent: number;
    bytesSent: number;
    droppedFrames: number;
  };
}

const activeSessions = new Map<string, RemoteSession>();

const createSessionSchema = z.object({
  deviceId: z.string().uuid(),
});

/**
 * POST /api/v1/remote/sessions
 * Create a new remote desktop session.
 */
remoteRouter.post('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const controllerId = req.user!.userId;
    const body = createSessionSchema.parse(req.body);
    
    // Verify device exists and is approved
    const [device] = await db.select().from(devices).where(
      and(eq(devices.id, body.deviceId), eq(devices.ownerId, controllerId))
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
    
    if (device.status !== 'online') {
      return res.status(409).json({ error: 'DEVICE_OFFLINE' });
    }
    
    // Check if there's already an active session for this device
    for (const [_, session] of activeSessions) {
      if (session.deviceId === body.deviceId && session.state === 'active') {
        return res.status(409).json({ error: 'SESSION_ALREADY_ACTIVE' });
      }
    }
    
    // Create session
    const sessionId = crypto.randomUUID();
    const session: RemoteSession = {
      id: sessionId,
      deviceId: body.deviceId,
      controllerId,
      state: 'connecting',
      createdAt: new Date(),
      lastActivity: new Date(),
      metrics: {
        framesSent: 0,
        bytesSent: 0,
        droppedFrames: 0,
      },
    };
    
    activeSessions.set(sessionId, session);
    
    // Audit log
    await db.insert(auditEvents).values({
      eventType: 'remote_session_created',
      actorId: controllerId,
      actorType: 'user',
      targetType: 'device',
      targetId: body.deviceId,
      action: 'create_remote_session',
      result: 'success',
      details: { sessionId, deviceId: body.deviceId },
      ipAddress: req.ip,
    });
    
    logger.info({ sessionId, deviceId: body.deviceId, controllerId }, 'Remote session created');
    
    res.status(201).json({
      sessionId,
      deviceId: body.deviceId,
      state: session.state,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    logger.error({ error }, 'Failed to create remote session');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/remote/sessions
 * List active remote sessions for the user.
 */
remoteRouter.get('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const sessions = Array.from(activeSessions.values())
      .filter(s => s.controllerId === userId)
      .map(s => ({
        id: s.id,
        deviceId: s.deviceId,
        state: s.state,
        createdAt: s.createdAt.toISOString(),
        lastActivity: s.lastActivity.toISOString(),
        metrics: s.metrics,
      }));
    
    res.json({ sessions, total: sessions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to list remote sessions');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/remote/sessions/:id
 * Get session details.
 */
remoteRouter.get('/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const sessionId = req.params.id;
    
    const session = activeSessions.get(sessionId);
    
    if (!session || session.controllerId !== userId) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    }
    
    res.json({
      id: session.id,
      deviceId: session.deviceId,
      state: session.state,
      createdAt: session.createdAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      metrics: session.metrics,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get remote session');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * DELETE /api/v1/remote/sessions/:id
 * Terminate a remote session.
 */
remoteRouter.delete('/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const sessionId = req.params.id;
    
    const session = activeSessions.get(sessionId);
    
    if (!session || session.controllerId !== userId) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    }
    
    session.state = 'terminating';
    
    // Audit log
    await db.insert(auditEvents).values({
      eventType: 'remote_session_terminated',
      actorId: userId,
      actorType: 'user',
      targetType: 'session',
      targetId: sessionId,
      action: 'terminate_remote_session',
      result: 'success',
      details: { sessionId, deviceId: session.deviceId },
      ipAddress: req.ip,
    });
    
    // Clean up session
    setTimeout(() => {
      session.state = 'terminated';
      activeSessions.delete(sessionId);
    }, 1000);
    
    logger.info({ sessionId, userId }, 'Remote session terminated');
    
    res.json({ id: sessionId, state: 'terminated' });
  } catch (error) {
    logger.error({ error }, 'Failed to terminate remote session');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/v1/remote/sessions/:id/metrics
 * Update session metrics (called by agent).
 */
remoteRouter.post('/sessions/:id/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { framesSent, bytesSent, droppedFrames } = req.body;
    
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    }
    
    session.metrics.framesSent = framesSent || session.metrics.framesSent;
    session.metrics.bytesSent = bytesSent || session.metrics.bytesSent;
    session.metrics.droppedFrames = droppedFrames || session.metrics.droppedFrames;
    session.lastActivity = new Date();
    
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to update session metrics');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});
