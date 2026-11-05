/**
 * Device monitoring routes.
 * 
 * Provides real-time device metrics and status information.
 * Uses the device_metrics table for historical data.
 */

import { Router, Response } from 'express';
import { logger } from '../logger.js';
import { db } from '../db/index.js';
import { devices, deviceMetrics } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';

export const monitoringRouter = Router();

/**
 * GET /api/v1/monitoring/devices/:id/metrics
 * Get latest metrics for a device.
 */
monitoringRouter.get('/devices/:id/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    
    const [device] = await db.select().from(devices).where(
      and(eq(devices.id, deviceId), eq(devices.ownerId, userId))
    ).limit(1);
    
    if (!device) {
      return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    }
    
    // Get latest metrics from device_metrics table
    const [latestMetrics] = await db.select().from(deviceMetrics)
      .where(eq(deviceMetrics.deviceId, deviceId))
      .orderBy(desc(deviceMetrics.recordedAt))
      .limit(1);
    
    res.json({
      deviceId: device.id,
      deviceIdentity: device.deviceId,
      name: device.name,
      status: device.status,
      lastSeen: device.lastSeenAt,
      lastMetricsAt: device.lastMetricsAt,
      metrics: latestMetrics ? {
        cpu: latestMetrics.cpuPercent,
        cpuCores: latestMetrics.cpuCores,
        memory: {
          total: latestMetrics.memoryTotalBytes ? Number(latestMetrics.memoryTotalBytes) : null,
          used: latestMetrics.memoryUsedBytes ? Number(latestMetrics.memoryUsedBytes) : null,
          percent: latestMetrics.memoryPercent,
        },
        disk: {
          total: latestMetrics.diskTotalBytes ? Number(latestMetrics.diskTotalBytes) : null,
          used: latestMetrics.diskUsedBytes ? Number(latestMetrics.diskUsedBytes) : null,
          percent: latestMetrics.diskPercent,
        },
        uptime: latestMetrics.uptimeSeconds ? Number(latestMetrics.uptimeSeconds) : null,
        hostname: latestMetrics.hostname,
        osName: latestMetrics.osName,
        osVersion: latestMetrics.osVersion,
        architecture: latestMetrics.architecture,
        recordedAt: latestMetrics.recordedAt,
      } : null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get device metrics');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/monitoring/devices/:id/status
 * Get real-time device status.
 */
monitoringRouter.get('/devices/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    
    const [device] = await db.select().from(devices).where(
      and(eq(devices.id, deviceId), eq(devices.ownerId, userId))
    ).limit(1);
    
    if (!device) {
      return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    }
    
    // Calculate if device is actually online (seen within last 60 seconds)
    const lastSeen = device.lastSeenAt ? new Date(device.lastSeenAt).getTime() : 0;
    const now = Date.now();
    const isOnline = device.status === 'online' && (now - lastSeen) < 60000;
    
    res.json({
      deviceId: device.id,
      deviceIdentity: device.deviceId,
      name: device.name,
      status: device.status,
      approved: device.approved,
      isOnline,
      lastSeen: device.lastSeenAt,
      osType: device.osType,
      osVersion: device.osVersion,
      agentVersion: device.agentVersion,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get device status');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/monitoring/summary
 * Get monitoring summary for all user devices.
 */
monitoringRouter.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const userDevices = await db.select().from(devices).where(
      eq(devices.ownerId, userId)
    );
    
    const now = Date.now();
    const onlineDevices = userDevices.filter(d => {
      if (d.status !== 'online') return false;
      const lastSeen = d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0;
      return (now - lastSeen) < 60000;
    });
    
    res.json({
      totalDevices: userDevices.length,
      onlineDevices: onlineDevices.length,
      offlineDevices: userDevices.filter(d => d.status === 'offline').length,
      pendingDevices: userDevices.filter(d => !d.approved && d.status !== 'revoked').length,
      revokedDevices: userDevices.filter(d => d.status === 'revoked').length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get monitoring summary');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});
