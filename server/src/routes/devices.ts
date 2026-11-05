/**
 * Device management routes.
 * 
 * Handles device registration, listing, status, and management.
 * All routes require authentication.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../logger.js';
import { db } from '../db/index.js';
import { devices, deviceGroups } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';

export const devicesRouter = Router();

const registerDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  publicKey: z.string().min(64), // Ed25519 public key hex
  osType: z.enum(['windows', 'linux', 'macos']),
  osVersion: z.string().optional(),
  agentVersion: z.string().optional(),
});

/**
 * GET /api/v1/devices
 * List all devices for the authenticated user's organization.
 */
devicesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const userDevices = await db.select().from(devices).where(
      eq(devices.ownerId, userId)
    );
    
    res.json({
      devices: userDevices.map(d => ({
        id: d.id,
        name: d.name,
        status: d.status,
        osType: d.osType,
        lastSeen: d.lastSeenAt,
        createdAt: d.createdAt,
      })),
      total: userDevices.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list devices');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/devices/:id
 * Get details for a specific device.
 */
devicesRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    
    const [device] = await db.select().from(devices).where(
      and(eq(devices.id, deviceId), eq(devices.ownerId, userId))
    ).limit(1);
    
    if (!device) {
      return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    }
    
    res.json({
      id: device.id,
      name: device.name,
      deviceId: device.deviceId,
      status: device.status,
      osType: device.osType,
      osVersion: device.osVersion,
      agentVersion: device.agentVersion,
      publicKey: device.publicKey,
      lastSeen: device.lastSeenAt,
      createdAt: device.createdAt,
      approved: device.approved,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get device');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/v1/devices
 * Register a new device.
 */
devicesRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const body = registerDeviceSchema.parse(req.body);
    
    // Generate device identity
    const deviceId = `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;
    
    const [device] = await db.insert(devices).values({
      id: crypto.randomUUID(),
      deviceId,
      ownerId: userId,
      name: body.name,
      publicKey: body.publicKey,
      osType: body.osType,
      osVersion: body.osVersion || '',
      agentVersion: body.agentVersion || '0.1.0',
      status: 'offline',
      approved: false, // Requires owner approval
    }).returning();
    
    logger.info({ deviceId: device.id, name: body.name, userId }, 'Device registered');
    
    res.status(201).json({
      id: device.id,
      deviceId: device.deviceId,
      name: device.name,
      status: device.status,
      approved: device.approved,
      message: 'Device registered. Use /api/v1/enrollment/create to generate an enrollment token.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    logger.error({ error }, 'Failed to register device');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * PATCH /api/v1/devices/:id/approve
 * Approve a pending device.
 */
devicesRouter.patch('/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    
    const [device] = await db.select().from(devices).where(
      and(eq(devices.id, deviceId), eq(devices.ownerId, userId))
    ).limit(1);
    
    if (!device) {
      return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    }
    
    const [updated] = await db.update(devices)
      .set({ approved: true, updatedAt: new Date() })
      .where(eq(devices.id, deviceId))
      .returning();
    
    logger.info({ deviceId, userId }, 'Device approved');
    
    res.json({ id: updated.id, approved: true });
  } catch (error) {
    logger.error({ error }, 'Failed to approve device');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * PATCH /api/v1/devices/:id/revoke
 * Revoke a device's access.
 */
devicesRouter.patch('/:id/revoke', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    
    const [device] = await db.select().from(devices).where(
      and(eq(devices.id, deviceId), eq(devices.ownerId, userId))
    ).limit(1);
    
    if (!device) {
      return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    }
    
    await db.update(devices)
      .set({ approved: false, status: 'revoked', updatedAt: new Date() })
      .where(eq(devices.id, deviceId));
    
    logger.info({ deviceId, userId }, 'Device revoked');
    
    res.json({ id: deviceId, revoked: true });
  } catch (error) {
    logger.error({ error }, 'Failed to revoke device');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * DELETE /api/v1/devices/:id
 * Delete a device permanently.
 */
devicesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    
    const result = await db.delete(devices).where(
      and(eq(devices.id, deviceId), eq(devices.ownerId, userId))
    ).returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    }
    
    logger.info({ deviceId, userId }, 'Device deleted');
    
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, 'Failed to delete device');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});
