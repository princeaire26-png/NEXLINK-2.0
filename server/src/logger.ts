/**
 * Structured logger using pino.
 */

import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logLevel,
  transport: config.environment === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  base: { service: 'nexlink-server' },
});
