import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './infra/logger.js';

/**
 * Start the Fastify server
 */
async function start() {
  try {
    logger.info({
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      provider: env.SECRET_PROVIDER,
    }, 'Starting Secrets Management Demo API');

    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0', // Listen on all network interfaces
    });

    logger.info({
      port: env.PORT,
      documentation: `http://localhost:${env.PORT}/docs`,
      health: `http://localhost:${env.PORT}/health`,
    }, 'Server started successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to start server');
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Start the server
start();
