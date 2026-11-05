/**
 * Audit logging middleware.
 * Logs all API requests with user context for security auditing.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { AuthRequest } from './auth.js';

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = authReq.user?.userId || 'anonymous';
    
    // Only log API requests (not static assets)
    if (req.path.startsWith('/api/')) {
      logger.info({
        audit: true,
        eventType: 'api_request',
        userId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }, 'audit:api_request');
      
      // Log security-relevant events separately
      if (isSecurityEvent(req.method, req.path)) {
        logger.warn({
          audit: true,
          eventType: 'security_event',
          userId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          ip: req.ip,
        }, 'audit:security_event');
      }
    }
  });
  
  next();
}

function isSecurityEvent(method: string, path: string): boolean {
  const securityPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/devices/*/approve',
    '/devices/*/revoke',
  ];
  
  if (method === 'POST' && path.includes('/auth/')) return true;
  if (path.includes('/approve') || path.includes('/revoke')) return true;
  if (method === 'DELETE') return true;
  
  return securityPaths.some(p => {
    const regex = new RegExp('^' + p.replace('*', '[^/]+') + '$');
    return regex.test(path);
  });
}
