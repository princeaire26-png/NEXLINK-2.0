/**
 * Authentication routes.
 * 
 * Handles user registration, login, token refresh, and logout.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

/**
 * POST /api/v1/auth/register
 * Register a new user account.
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'REGISTRATION_FAILED',
        message: 'An account with this email already exists' 
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(body.password, config.bcryptRounds);
    
    // Create user
    const [user] = await db.insert(users).values({
      email: body.email,
      passwordHash,
      name: body.name,
      role: 'owner',
      emailVerified: false,
    }).returning();
    
    // Generate tokens
    const tokens = generateTokens(user.id, user.email, user.role);
    
    logger.info({ userId: user.id, email: user.email }, 'User registered');
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        details: error.errors 
      });
    }
    logger.error({ error }, 'Registration failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Registration failed' });
  }
});

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens.
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (!user) {
      // Use generic message to prevent user enumeration
      return res.status(401).json({ 
        error: 'AUTHENTICATION_FAILED',
        message: 'Invalid email or password' 
      });
    }
    
    // Verify password
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ 
        error: 'AUTHENTICATION_FAILED',
        message: 'Invalid email or password' 
      });
    }
    
    // Check if account is active
    if (!user.active) {
      return res.status(403).json({ 
        error: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled' 
      });
    }
    
    // Generate tokens
    const tokens = generateTokens(user.id, user.email, user.role);
    
    logger.info({ userId: user.id }, 'User logged in');
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        details: error.errors 
      });
    }
    logger.error({ error }, 'Login failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Login failed' });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token.
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const body = refreshSchema.parse(req.body);
    
    // Verify refresh token
    const decoded = jwt.verify(body.refreshToken, config.jwtSecret) as any;
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    res.json({ accessToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    }
    res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
  }
});

/**
 * POST /api/v1/auth/logout
 * Invalidate the current session.
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  // In a full implementation, this would invalidate the token in a blacklist
  logger.info('User logged out');
  res.json({ message: 'Logged out successfully' });
});

function generateTokens(userId: string, email: string, role: string) {
  const accessToken = jwt.sign(
    { userId, email, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId, email, role, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
  
  return { accessToken, refreshToken };
}
