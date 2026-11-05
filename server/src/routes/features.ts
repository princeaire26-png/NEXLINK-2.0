/** Veyon-inspired modular feature and governed-operation API. */
import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { devices, featureOperations, auditEvents, memberships } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';
import { capabilityCatalog, actionPolicy } from '../features/catalog.js';
import { evaluateActionPolicy } from '../features/policy.js';
import { logger } from '../logger.js';

export const featuresRouter = Router();
const createSchema = z.object({
  deviceId: z.string().uuid(),
  action: z.string().min(2).max(64),
  parameters: z.record(z.unknown()).default({}),
  reason: z.string().trim().min(5).max(500),
});

featuresRouter.get('/catalog', (_req, res) => {
  res.json({ features: capabilityCatalog, actionCount: Object.keys(actionPolicy).length, executionMode: 'governed-control-plane' });
});

featuresRouter.get('/operations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const rows = await db.select().from(featureOperations)
      .where(eq(featureOperations.requesterId, userId))
      .orderBy(desc(featureOperations.createdAt)).limit(100);
    res.json({ operations: rows });
  } catch (error) {
    logger.error({ error }, 'Failed to list feature operations');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

featuresRouter.get('/operations/pending', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!['owner', 'admin'].includes(user.role)) return res.status(403).json({ error: 'APPROVER_ROLE_REQUIRED' });
    const userMemberships = await db.select({ organizationId: memberships.organizationId }).from(memberships).where(eq(memberships.userId, user.userId));
    const organizationIds = userMemberships.map((membership) => membership.organizationId);
    const deviceScope = organizationIds.length > 0
      ? or(eq(devices.ownerId, user.userId), inArray(devices.organizationId, organizationIds))
      : eq(devices.ownerId, user.userId);
    const rows = await db.select({ operation: featureOperations, deviceName: devices.name })
      .from(featureOperations).innerJoin(devices, eq(featureOperations.deviceId, devices.id))
      .where(and(eq(featureOperations.status, 'awaiting_approval'), deviceScope!))
      .orderBy(desc(featureOperations.createdAt)).limit(100);
    res.json({ operations: rows });
  } catch (error) {
    logger.error({ error }, 'Failed to list pending feature approvals');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

featuresRouter.post('/operations', async (req: AuthRequest, res: Response) => {
  try {
    const body = createSchema.parse(req.body);
    const user = req.user!;
    const decision = evaluateActionPolicy(body.action, user.role);
    if (!decision.allowed) return res.status(403).json({ error: decision.reason });

    const [device] = await db.select().from(devices).where(and(
      eq(devices.id, body.deviceId), eq(devices.approved, true),
    )).limit(1);
    if (!device) return res.status(404).json({ error: 'APPROVED_DEVICE_NOT_FOUND' });
    const isOwner = device.ownerId === user.userId;
    const [deviceMembership] = device.organizationId ? await db.select().from(memberships).where(and(
      eq(memberships.organizationId, device.organizationId), eq(memberships.userId, user.userId),
    )).limit(1) : [];
    if (!isOwner && !deviceMembership) return res.status(404).json({ error: 'APPROVED_DEVICE_NOT_FOUND' });
    if (device.status === 'revoked') return res.status(403).json({ error: 'DEVICE_REVOKED' });
    if (device.status !== 'online') return res.status(409).json({ error: 'DEVICE_OFFLINE' });

    const id = crypto.randomUUID();
    const needsApproval = decision.risk === 'high' || decision.risk === 'critical';
    const status = needsApproval ? 'awaiting_approval' : 'policy_approved_waiting_agent';
    const [operation] = await db.insert(featureOperations).values({
      id, deviceId: device.id, requesterId: user.userId, featureKey: decision.allowed ? actionPolicy[body.action].capability : 'unknown',
      action: body.action, parameters: body.parameters, reason: body.reason,
      riskLevel: decision.risk!, status,
      requiresSecondApprover: Boolean(decision.requiresSecondApprover),
    }).returning();
    await db.insert(auditEvents).values({
      eventType: 'feature_operation_requested', actorId: user.userId, actorType: 'user',
      targetType: 'device', targetId: device.id, action: body.action, result: 'success',
      details: { operationId: id, risk: decision.risk, status }, ipAddress: req.ip,
    });
    res.status(201).json({ operation, message: 'Request recorded. Endpoint execution is not enabled until the matching signed agent capability is installed.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    logger.error({ error }, 'Failed to create feature operation');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

featuresRouter.post('/operations/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!['owner', 'admin'].includes(user.role)) return res.status(403).json({ error: 'APPROVER_ROLE_REQUIRED' });
    const [operation] = await db.select().from(featureOperations).where(eq(featureOperations.id, req.params.id)).limit(1);
    if (!operation) return res.status(404).json({ error: 'OPERATION_NOT_FOUND' });
    if (operation.status !== 'awaiting_approval') return res.status(409).json({ error: 'OPERATION_NOT_AWAITING_APPROVAL' });
    if (operation.requesterId === user.userId) return res.status(403).json({ error: 'SEPARATION_OF_DUTIES_REQUIRED' });
    const [device] = await db.select().from(devices).where(eq(devices.id, operation.deviceId)).limit(1);
    if (!device) return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    const isOwner = device.ownerId === user.userId;
    const [membership] = device.organizationId ? await db.select().from(memberships).where(and(eq(memberships.organizationId, device.organizationId), eq(memberships.userId, user.userId))).limit(1) : [];
    if (!isOwner && !membership) return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    const [updated] = await db.update(featureOperations).set({ status: 'policy_approved_waiting_agent', approverId: user.userId, updatedAt: new Date() })
      .where(eq(featureOperations.id, operation.id)).returning();
    await db.insert(auditEvents).values({ eventType: 'feature_operation_approved', actorId: user.userId, actorType: 'user', targetType: 'device', targetId: operation.deviceId, action: operation.action, result: 'success', details: { operationId: operation.id }, ipAddress: req.ip });
    res.json({ operation: updated, message: 'Approved and awaiting a compatible agent executor.' });
  } catch (error) {
    logger.error({ error }, 'Failed to approve feature operation');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

featuresRouter.post('/operations/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!['owner', 'admin'].includes(user.role)) return res.status(403).json({ error: 'APPROVER_ROLE_REQUIRED' });
    const [operation] = await db.select().from(featureOperations).where(eq(featureOperations.id, req.params.id)).limit(1);
    if (!operation) return res.status(404).json({ error: 'OPERATION_NOT_FOUND' });
    if (operation.status !== 'awaiting_approval') return res.status(409).json({ error: 'OPERATION_NOT_AWAITING_APPROVAL' });
    if (operation.requesterId === user.userId) return res.status(403).json({ error: 'SEPARATION_OF_DUTIES_REQUIRED' });
    const [device] = await db.select().from(devices).where(eq(devices.id, operation.deviceId)).limit(1);
    if (!device) return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    const isOwner = device.ownerId === user.userId;
    const [membership] = device.organizationId ? await db.select().from(memberships).where(and(eq(memberships.organizationId, device.organizationId), eq(memberships.userId, user.userId))).limit(1) : [];
    if (!isOwner && !membership) return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    const [updated] = await db.update(featureOperations).set({ status: 'rejected', approverId: user.userId, updatedAt: new Date() })
      .where(eq(featureOperations.id, operation.id)).returning();
    await db.insert(auditEvents).values({ eventType: 'feature_operation_rejected', actorId: user.userId, actorType: 'user', targetType: 'device', targetId: operation.deviceId, action: operation.action, result: 'success', details: { operationId: operation.id }, ipAddress: req.ip });
    res.json({ operation: updated, message: 'Operation request rejected. No endpoint action was executed.' });
  } catch (error) {
    logger.error({ error }, 'Failed to reject feature operation');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

