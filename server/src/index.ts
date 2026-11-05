/**
 * NEXLINK Server
 * 
 * Main entry point for the NEXLINK backend server.
 * Handles authentication, device management, signaling, and API.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { config } from './config.js';
import { logger } from './logger.js';
import { db } from './db/index.js';
import { devices, deviceIdentities, deviceConnections, deviceMetrics, auditEvents } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { authRouter } from './routes/auth.js';
import { devicesRouter } from './routes/devices.js';
import { enrollmentRouter } from './routes/enrollment.js';
import { monitoringRouter } from './routes/monitoring.js';
import { sessionsRouter } from './routes/sessions.js';
import { auditRouter } from './routes/audit.js';
import { healthRouter } from './routes/health.js';
import { remoteRouter } from './routes/remote.js';
import { featuresRouter } from './routes/features.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { auditMiddleware } from './middleware/audit.js';
import { verifyChallengeProof } from './crypto.js';
import { NexlinkDiscoveryAdvertiser } from './discovery.js';

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
    }, 'request');
  });
  next();
});

// Audit logging middleware
app.use('/api/v1', auditMiddleware);

// Public routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/enrollment', enrollmentRouter);

// Protected routes
app.use('/api/v1/devices', authMiddleware, devicesRouter);
app.use('/api/v1/monitoring', authMiddleware, monitoringRouter);
app.use('/api/v1/sessions', authMiddleware, sessionsRouter);
app.use('/api/v1/audit', authMiddleware, auditRouter);
app.use('/api/v1/remote', authMiddleware, remoteRouter);
app.use('/api/v1/features', authMiddleware, featuresRouter);

// Error handler
app.use(errorHandler);

// ---- WebSocket server for authenticated device connections ----
const wss = new WebSocketServer({ server, path: '/ws' });

// Track active device connections
const activeConnections = new Map<string, {
  ws: WebSocket;
  deviceId: string;
  deviceDbId: string;
  authenticated: boolean;
  connectedAt: Date;
  lastHeartbeat: Date;
  challengeId: string | null;
  challengeData: string | null;
  challengeExpiresAt: number;
}>();

// Heartbeat check interval (every 30 seconds)
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 90000; // 90 seconds without heartbeat = offline

setInterval(() => {
  const now = Date.now();
  for (const [connectionId, conn] of activeConnections) {
    if (now - conn.lastHeartbeat.getTime() > HEARTBEAT_TIMEOUT) {
      logger.warn({ connectionId, deviceId: conn.deviceId }, 'Heartbeat timeout, closing connection');
      conn.ws.close(4002, 'Heartbeat timeout');
      activeConnections.delete(connectionId);
      
      // Update device status to offline
      updateDeviceStatus(conn.deviceDbId, 'offline').catch(err => {
        logger.error({ error: err }, 'Failed to update device status');
      });
    }
  }
}, HEARTBEAT_INTERVAL);

wss.on('connection', (ws, req) => {
  const connectionId = crypto.randomUUID();
  const clientIp = req.socket.remoteAddress;
  logger.info({ connectionId, clientIp }, 'WebSocket connection established');
  
  let authTimeout: NodeJS.Timeout | null = null;
  
  // Initialize connection tracking
  activeConnections.set(connectionId, {
    ws,
    deviceId: '',
    deviceDbId: '',
    authenticated: false,
    connectedAt: new Date(),
    lastHeartbeat: new Date(),
    challengeId: null,
    challengeData: null,
    challengeExpiresAt: 0,
  });
  
  // Require authentication within 30 seconds
  authTimeout = setTimeout(() => {
    const conn = activeConnections.get(connectionId);
    if (conn && !conn.authenticated) {
      logger.warn({ connectionId }, 'WebSocket authentication timeout');
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Authentication timeout' 
      }));
      ws.close(4001, 'Authentication timeout');
      activeConnections.delete(connectionId);
    }
  }, 30000);
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const conn = activeConnections.get(connectionId);
      if (!conn) return;
      
      if (!conn.authenticated) {
        // Handle authentication flow
        if (message.type === 'hello') {
          await handleHello(ws, message, connectionId, conn);
        } else if (message.type === 'auth_proof') {
          const result = await handleAuthProof(ws, message, connectionId, conn);
          if (result.success) {
            if (authTimeout) clearTimeout(authTimeout);
            logger.info({ connectionId, deviceId: conn.deviceId }, 'Device authenticated');
          }
        } else {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Authentication required' 
          }));
        }
        return;
      }
      
      // Handle authenticated messages
      conn.lastHeartbeat = new Date();
      
      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
          
        case 'metrics_report':
          await handleMetricsReport(conn.deviceDbId, message.payload);
          break;
          
        case 'status_update':
          logger.debug({ deviceId: conn.deviceId, status: message.payload }, 'Status update received');
          break;
          
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: `Unknown message type: ${message.type}` 
          }));
      }
    } catch (error) {
      logger.error({ error, connectionId }, 'Invalid WebSocket message');
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', async () => {
    if (authTimeout) clearTimeout(authTimeout);
    const conn = activeConnections.get(connectionId);
    if (conn) {
      if (conn.authenticated) {
        // Update device status
        await updateDeviceStatus(conn.deviceDbId, 'offline');
        
        // Record disconnection
        try {
          await db.update(deviceConnections)
            .set({ 
              status: 'disconnected', 
              disconnectedAt: new Date() 
            })
            .where(eq(deviceConnections.connectionId, connectionId));
        } catch (err) {
          logger.error({ error: err }, 'Failed to update connection record');
        }
        
        logger.info({ connectionId, deviceId: conn.deviceId }, 'Device disconnected');
      } else {
        logger.info({ connectionId }, 'WebSocket connection closed (unauthenticated)');
      }
      activeConnections.delete(connectionId);
    }
  });
  
  ws.on('error', (error) => {
    logger.error({ error, connectionId }, 'WebSocket error');
  });
});

async function handleHello(ws: WebSocket, message: any, connectionId: string, conn: any) {
  // Validate hello message
  if (!message.device_id || !message.public_key) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Invalid hello message: missing required fields' 
    }));
    return;
  }
  
  // Check if device exists and is approved
  const [device] = await db.select().from(devices)
    .where(eq(devices.deviceId, message.device_id))
    .limit(1);
  
  if (!device) {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'Unknown device' 
    }));
    ws.close(4003, 'Unknown device');
    return;
  }
  
  if (!device.approved) {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'Device not approved' 
    }));
    ws.close(4004, 'Device not approved');
    return;
  }
  
  if (device.status === 'revoked') {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'Device revoked' 
    }));
    ws.close(4005, 'Device revoked');
    return;
  }
  
  // Verify public key matches registered identity
  const [identity] = await db.select().from(deviceIdentities)
    .where(and(
      eq(deviceIdentities.deviceId, device.id),
      eq(deviceIdentities.active, true)
    ))
    .limit(1);
  
  if (!identity || identity.publicKey !== message.public_key) {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'Public key mismatch' 
    }));
    ws.close(4006, 'Public key mismatch');
    return;
  }
  
  // Store device info in connection
  conn.deviceId = message.device_id;
  conn.deviceDbId = device.id;
  
  // Generate cryptographic challenge
  const challengeId = crypto.randomUUID();
  const challengeData = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60000; // 60 seconds
  
  conn.challengeId = challengeId;
  conn.challengeData = challengeData;
  conn.challengeExpiresAt = expiresAt;
  
  ws.send(JSON.stringify({
    type: 'auth_challenge',
    challenge_id: challengeId,
    challenge: challengeData,
    expires_at: expiresAt,
  }));
  
  logger.debug({ connectionId, challengeId }, 'Auth challenge sent');
}

async function handleAuthProof(ws: WebSocket, message: any, connectionId: string, conn: any): Promise<{ success: boolean }> {
  // Validate required fields
  if (!message.challenge_id || !message.signature || !message.timestamp) {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'Invalid auth proof: missing required fields' 
    }));
    return { success: false };
  }
  
  // Verify challenge matches
  if (message.challenge_id !== conn.challengeId) {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'Challenge ID mismatch' 
    }));
    return { success: false };
  }
  
  // Check challenge expiration
  if (Date.now() > conn.challengeExpiresAt) {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'Challenge expired' 
    }));
    return { success: false };
  }
  
  // Get device public key
  const [identity] = await db.select().from(deviceIdentities)
    .where(and(
      eq(deviceIdentities.deviceId, conn.deviceDbId),
      eq(deviceIdentities.active, true)
    ))
    .limit(1);
  
  if (!identity) {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'No active identity found' 
    }));
    return { success: false };
  }
  
  // Verify Ed25519 signature against challenge
  const signatureValid = verifyChallengeProof(
    conn.challengeData!,
    message.signature,
    identity.publicKey
  );
  
  if (!signatureValid) {
    ws.send(JSON.stringify({ 
      type: 'auth_rejected', 
      reason: 'Invalid signature' 
    }));
    
    // Log failed authentication attempt
    await db.insert(auditEvents).values({
      eventType: 'auth_failed',
      actorId: conn.deviceDbId,
      actorType: 'device',
      targetType: 'device',
      targetId: conn.deviceDbId,
      action: 'websocket_auth',
      result: 'failure',
      details: { reason: 'invalid_signature', connectionId },
      ipAddress: ws._socket?.remoteAddress,
    });
    
    return { success: false };
  }
  
  // Mark as authenticated
  conn.authenticated = true;
  conn.lastHeartbeat = new Date();
  
  // Invalidate challenge (single-use)
  conn.challengeData = null;
  
  // Generate session token
  const sessionToken = crypto.randomUUID();
  
  // Record connection in database
  try {
    await db.insert(deviceConnections).values({
      id: crypto.randomUUID(),
      deviceId: conn.deviceDbId,
      connectionId,
      sessionToken,
      ipAddress: ws._socket?.remoteAddress,
      status: 'active',
    });
  } catch (err) {
    logger.error({ error: err }, 'Failed to record connection');
  }
  
  // Update device status to online
  await updateDeviceStatus(conn.deviceDbId, 'online');
  
  // Log successful authentication
  await db.insert(auditEvents).values({
    eventType: 'auth_success',
    actorId: conn.deviceDbId,
    actorType: 'device',
    targetType: 'device',
    targetId: conn.deviceDbId,
    action: 'websocket_auth',
    result: 'success',
    details: { connectionId },
    ipAddress: ws._socket?.remoteAddress,
  });
  
  ws.send(JSON.stringify({
    type: 'auth_accepted',
    session_token: sessionToken,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));
  
  return { success: true };
}

async function handleMetricsReport(deviceDbId: string, metrics: any) {
  try {
    // Store metrics in database
    await db.insert(deviceMetrics).values({
      id: crypto.randomUUID(),
      deviceId: deviceDbId,
      cpuPercent: metrics.cpu_percent,
      cpuCores: metrics.cpu_cores,
      memoryTotalBytes: metrics.memory_total_bytes ? BigInt(metrics.memory_total_bytes) : null,
      memoryUsedBytes: metrics.memory_used_bytes ? BigInt(metrics.memory_used_bytes) : null,
      memoryPercent: metrics.memory_percent,
      diskTotalBytes: metrics.disk_total_bytes ? BigInt(metrics.disk_total_bytes) : null,
      diskUsedBytes: metrics.disk_used_bytes ? BigInt(metrics.disk_used_bytes) : null,
      diskPercent: metrics.disk_percent,
      uptimeSeconds: metrics.uptime_seconds ? BigInt(metrics.uptime_seconds) : null,
      hostname: metrics.hostname,
      osName: metrics.os_name,
      osVersion: metrics.os_version,
      architecture: metrics.architecture,
    });
    
    // Update device last_seen and metadata
    await db.update(devices)
      .set({ 
        lastSeenAt: new Date(),
        lastMetricsAt: new Date(),
        metadata: { latestMetrics: metrics },
      })
      .where(eq(devices.id, deviceDbId));
      
  } catch (err) {
    logger.error({ error: err, deviceDbId }, 'Failed to store metrics');
  }
}

async function updateDeviceStatus(deviceDbId: string, status: 'online' | 'offline') {
  try {
    await db.update(devices)
      .set({ 
        status, 
        lastSeenAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(devices.id, deviceDbId));
  } catch (err) {
    logger.error({ error: err, deviceDbId }, 'Failed to update device status');
  }
}

// Health endpoint for active connections
app.get('/api/v1/internal/connections', authMiddleware, (req, res) => {
  const connections = Array.from(activeConnections.entries())
    .filter(([_, conn]) => conn.authenticated)
    .map(([id, conn]) => ({
      connectionId: id,
      deviceId: conn.deviceId,
      connectedAt: conn.connectedAt.toISOString(),
      lastHeartbeat: conn.lastHeartbeat.toISOString(),
    }));
  
  res.json({ connections, total: connections.length });
});

// Start local DNS-SD advertisement. This only publishes a connection hint;
// every agent must still authenticate with the server using Ed25519.
const discovery = new NexlinkDiscoveryAdvertiser();

// Start server
server.listen(config.port, () => {
  logger.info(`NEXLINK Server listening on port ${config.port}`);
  logger.info(`Environment: ${config.environment}`);
  logger.info(`WebSocket endpoint: ws://localhost:${config.port}/ws`);
  discovery.start(config.discoveryPort, config.discoveryProtocol);
  logger.info({ port: config.discoveryPort, protocol: config.discoveryProtocol }, 'NEXLINK LAN discovery advertised as _nexlink-server._tcp.local');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  for (const [id, conn] of activeConnections) {
    conn.ws.close(1001, 'Server shutting down');
  }
  discovery.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down');
  discovery.stop();
  for (const [id, conn] of activeConnections) {
    conn.ws.close(1001, 'Server shutting down');
  }
  server.close(() => {
    process.exit(0);
  });
});
