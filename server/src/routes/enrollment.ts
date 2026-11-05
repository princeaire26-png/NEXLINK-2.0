/**
 * Device enrollment routes.
 * 
 * Handles secure device enrollment with cryptographic authentication.
 * Enrollment tokens are stored in PostgreSQL (persistent across restarts).
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '../logger.js';
import { db } from '../db/index.js';
import { devices, deviceIdentities, auditEvents } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';
import { verifyEnrollmentProof } from '../crypto.js';

// Import enrollment_tokens table (defined in migration 002)
// Using raw SQL for the enrollment_tokens table since it's not in Drizzle schema yet
const enrollmentTokensTable = 'enrollment_tokens';

export const enrollmentRouter = Router();

const createEnrollmentSchema = z.object({
  deviceName: z.string().min(1).max(100),
});

const enrollDeviceSchema = z.object({
  enrollmentToken: z.string().min(32),
  deviceId: z.string().min(32).max(64),
  publicKey: z.string().length(64), // Ed25519 public key hex (32 bytes = 64 hex chars)
  signature: z.string().length(128), // Ed25519 signature hex (64 bytes = 128 hex chars)
  osType: z.enum(['windows', 'linux', 'macos']),
  osVersion: z.string().optional(),
  agentVersion: z.string().optional(),
  timestamp: z.number(),
});

/**
 * POST /api/v1/enrollment/create
 * Create an enrollment token for a device.
 * Requires authentication.
 */
enrollmentRouter.post('/create', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const body = createEnrollmentSchema.parse(req.body);
    
    // Generate cryptographically secure enrollment token
    const token = crypto.randomBytes(32).toString('hex');
    const deviceId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store enrollment token in database (persistent across restarts)
    await db.execute(sql`
      INSERT INTO enrollment_tokens (id, token, device_id, user_id, device_name, expires_at, ip_address)
      VALUES (
        ${crypto.randomUUID()},
        ${token},
        ${deviceId},
        ${userId},
        ${body.deviceName},
        ${expiresAt},
        ${req.ip || null}
      )
    `);
    
    // Log audit event
    await db.insert(auditEvents).values({
      eventType: 'enrollment_created',
      actorId: userId,
      actorType: 'user',
      action: 'create_enrollment',
      result: 'success',
      details: { deviceId, deviceName: body.deviceName },
      ipAddress: req.ip,
    });
    
    logger.info({ userId, deviceId }, 'Enrollment token created');
    
    res.status(201).json({
      enrollmentToken: token,
      deviceId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    logger.error({ error }, 'Failed to create enrollment');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/v1/enrollment/enroll
 * Enroll a device using an enrollment token.
 * Verifies the Ed25519 signature proof.
 */
enrollmentRouter.post('/enroll', async (req: Request, res: Response) => {
  try {
    const body = enrollDeviceSchema.parse(req.body);
    
    // Check timestamp freshness (prevent replay attacks)
    const now = Date.now();
    const timestampAge = Math.abs(now - body.timestamp);
    if (timestampAge > 5 * 60 * 1000) { // 5 minutes
      return res.status(400).json({ 
        error: 'ENROLLMENT_FAILED',
        message: 'Timestamp too old or too new' 
      });
    }
    
    // Look up enrollment token in database
    const [enrollment] = await db.execute(sql`
      SELECT * FROM enrollment_tokens 
      WHERE token = ${body.enrollmentToken}
      LIMIT 1
    `) as any[];
    
    if (!enrollment || enrollment.length === 0) {
      return res.status(400).json({ 
        error: 'ENROLLMENT_FAILED',
        message: 'Invalid enrollment token' 
      });
    }
    
    const tokenRecord = enrollment[0];
    
    // Check if token is used
    if (tokenRecord.used) {
      return res.status(400).json({ 
        error: 'ENROLLMENT_FAILED',
        message: 'Enrollment token already used' 
      });
    }
    
    // Check if token is cancelled
    if (tokenRecord.cancelled) {
      return res.status(400).json({ 
        error: 'ENROLLMENT_FAILED',
        message: 'Enrollment token was cancelled' 
      });
    }
    
    // Check expiration
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(400).json({ 
        error: 'ENROLLMENT_FAILED',
        message: 'Enrollment token expired' 
      });
    }
    
    // Check device ID binding
    if (tokenRecord.device_id !== body.deviceId) {
      return res.status(400).json({ 
        error: 'ENROLLMENT_FAILED',
        message: 'Device ID mismatch' 
      });
    }
    
    // Verify Ed25519 signature (cryptographic proof of device identity)
    // The signature must be: Sign(private_key, deviceId + ":" + timestamp)
    const signatureValid = verifyEnrollmentProof(
      body.deviceId,
      body.timestamp,
      body.signature,
      body.publicKey
    );
    
    if (!signatureValid) {
      // Log failed enrollment attempt
      await db.insert(auditEvents).values({
        eventType: 'enrollment_failed',
        actorType: 'device',
        action: 'enroll',
        result: 'failure',
        details: { 
          deviceId: body.deviceId, 
          reason: 'invalid_signature',
          enrollmentToken: body.enrollmentToken.slice(0, 8) + '...'
        },
        ipAddress: req.ip,
      });
      
      return res.status(400).json({ 
        error: 'ENROLLMENT_FAILED',
        message: 'Invalid cryptographic signature' 
      });
    }
    
    // Check if device already exists
    const existing = await db.select().from(devices).where(
      eq(devices.deviceId, body.deviceId)
    ).limit(1);
    
    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'ENROLLMENT_FAILED',
        message: 'Device already registered' 
      });
    }
    
    // Create device record
    const [device] = await db.insert(devices).values({
      id: crypto.randomUUID(),
      deviceId: body.deviceId,
      ownerId: tokenRecord.user_id,
      name: tokenRecord.device_name,
      publicKey: body.publicKey,
      osType: body.osType,
      osVersion: body.osVersion || '',
      agentVersion: body.agentVersion || '0.1.0',
      status: 'pending',
      approved: false,
    }).returning();
    
    // Create device identity record
    await db.insert(deviceIdentities).values({
      id: crypto.randomUUID(),
      deviceId: device.id,
      publicKey: body.publicKey,
      keyType: 'ed25519',
      active: true,
    });
    
    // Mark enrollment token as used
    await db.execute(sql`
      UPDATE enrollment_tokens 
      SET used = true, used_at = NOW() 
      WHERE token = ${body.enrollmentToken}
    `);
    
    // Log audit event
    await db.insert(auditEvents).values({
      eventType: 'device_enrolled',
      actorId: device.id,
      actorType: 'device',
      targetType: 'device',
      targetId: device.id,
      action: 'enroll',
      result: 'success',
      details: { 
        deviceId: body.deviceId, 
        osType: body.osType,
        agentVersion: body.agentVersion 
      },
      ipAddress: req.ip,
    });
    
    logger.info({ deviceId: device.id, userId: tokenRecord.user_id }, 'Device enrolled');
    
    res.status(201).json({
      deviceId: device.id,
      deviceIdentity: body.deviceId,
      status: 'pending',
      message: 'Device enrolled successfully. Awaiting owner approval.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    logger.error({ error }, 'Enrollment failed');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/enrollment/status/:token
 * Check enrollment token status.
 */
enrollmentRouter.get('/status/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    
    const [enrollment] = await db.execute(sql`
      SELECT * FROM enrollment_tokens 
      WHERE token = ${token}
      LIMIT 1
    `) as any[];
    
    if (!enrollment || enrollment.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    
    const record = enrollment[0];
    const isExpired = new Date() > new Date(record.expires_at);
    
    res.json({
      valid: !record.used && !record.cancelled && !isExpired,
      used: record.used,
      cancelled: record.cancelled,
      expired: isExpired,
      expiresAt: new Date(record.expires_at).toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to check enrollment status');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/v1/enrollment/cancel/:token
 * Cancel an enrollment token.
 */
enrollmentRouter.post('/cancel/:token', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const token = req.params.token;
    
    // Find and verify ownership
    const [enrollment] = await db.execute(sql`
      SELECT * FROM enrollment_tokens 
      WHERE token = ${token} AND user_id = ${userId}
      LIMIT 1
    `) as any[];
    
    if (!enrollment || enrollment.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    
    // Mark as cancelled
    await db.execute(sql`
      UPDATE enrollment_tokens 
      SET cancelled = true 
      WHERE token = ${token}
    `);
    
    logger.info({ userId, token: token.slice(0, 8) + '...' }, 'Enrollment token cancelled');
    
    res.json({ cancelled: true });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel enrollment');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});
