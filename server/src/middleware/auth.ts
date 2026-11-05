/**
 * Authentication middleware.
 * Verifies JWT tokens and attaches user info to request.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header' 
    });
  }
  
  const token = authHeader.slice(7);
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired' 
      });
    }
    
    logger.warn({ error }, 'Invalid token');
    return res.status(401).json({ 
      error: 'INVALID_TOKEN',
      message: 'Access token is invalid' 
    });
  }
}

/**
 * Role-based authorization middleware.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'FORBIDDEN',
        message: `Requires one of roles: ${roles.join(', ')}` 
      });
    }
    
    next();
  };
}
