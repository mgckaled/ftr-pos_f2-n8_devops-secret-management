import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Pino logger configuration with pretty printing in development
 * and JSON output in production
 */
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',

  // Redact sensitive fields from logs
  redact: {
    paths: [
      'password',
      'token',
      'secret',
      'apiKey',
      'accessKey',
      'secretKey',
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
      '*.accessKey',
      '*.secretKey',
      'DATABASE_PASSWORD',
      'VAULT_TOKEN',
      'AWS_SECRET_ACCESS_KEY',
      'CLOUDFLARE_SECRET_ACCESS_KEY',
      'NEW_RELIC_LICENSE_KEY',
    ],
    censor: '***REDACTED***',
  },

  // Pretty printing in development
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  }),
});

/**
 * Creates a child logger with additional context
 * @param context - Context object to bind to logger
 * @returns Child logger instance
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
