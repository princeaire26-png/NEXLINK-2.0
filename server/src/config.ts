/**
 * Server configuration.
 */

import dotenv from 'dotenv';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
const configuredJwtSecret = process.env.JWT_SECRET;
if (environment === 'production' && (!configuredJwtSecret || configuredJwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}
if (environment === 'production' && (process.env.NEXLINK_DISCOVERY_PROTOCOL || 'wss') !== 'wss') {
  throw new Error('Production NEXLINK LAN discovery must advertise wss. Configure a trusted TLS reverse proxy and NEXLINK_DISCOVERY_PROTOCOL=wss.');
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  // In production, advertise the externally reachable TLS listener (usually 443)
  // provided by the configured HTTPS reverse proxy.
  discoveryPort: parseInt(process.env.NEXLINK_DISCOVERY_PORT || (environment === 'production' ? '443' : (process.env.PORT || '3001')), 10),
  discoveryProtocol: process.env.NEXLINK_DISCOVERY_PROTOCOL || (environment === 'production' ? 'wss' : 'ws'),
  environment,
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://nexlink:nexlink@localhost:5432/nexlink',
  
  // JWT
  jwtSecret: configuredJwtSecret || 'development-only-change-me-before-deployment',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  
  // Rate limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100,
  
  // Security
  bcryptRounds: 12,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
