/**
 * Health check routes.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { logger } from '../logger.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'nexlink-server',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check database connectivity
    await db.execute(sql`SELECT 1`);
    
    res.json({ 
      ready: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Readiness check failed');
    res.status(503).json({ 
      ready: false,
      database: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});
