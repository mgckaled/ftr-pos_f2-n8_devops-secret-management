import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { HealthResponseSchema } from './health.schemas.js';
import { env } from '../../config/env.js';

/**
 * Health check routes
 * Provides simple health status endpoint
 */
export const healthRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * GET /health
   * Returns application health status
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Application health check',
        tags: ['Health'],
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async () => {
      const secretsLoaded = !!fastify.secrets && Object.keys(fastify.secrets).length > 0;

      return {
        status: secretsLoaded ? ('healthy' as const) : ('unhealthy' as const),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        provider: env.SECRET_PROVIDER,
        secretsLoaded,
        version: process.env.npm_package_version || '1.0.0',
      };
    }
  );
};
