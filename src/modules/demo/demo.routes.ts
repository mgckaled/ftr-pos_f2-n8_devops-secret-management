import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  SecretsInfoResponseSchema,
  DatabaseStatusResponseSchema,
  ProviderComparisonResponseSchema,
} from './demo.schemas.js';
import { env } from '../../config/env.js';

/**
 * Demo routes showcasing secrets management
 */
export const demoRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * GET /demo/secrets-info
   * Returns information about loaded secrets (values are masked)
   */
  fastify.get(
    '/secrets-info',
    {
      schema: {
        description: 'Information about loaded secrets (values masked for security)',
        tags: ['Demo'],
        response: {
          200: SecretsInfoResponseSchema,
        },
      },
    },
    async () => {
      const secretKeys = Object.keys(fastify.secrets);
      const firstKey = secretKeys[0];
      const firstValue = firstKey ? fastify.secrets[firstKey as keyof typeof fastify.secrets] : undefined;

      return {
        provider: env.SECRET_PROVIDER,
        totalSecrets: secretKeys.length,
        secretKeys,
        loadedAt: new Date().toISOString(),
        example: firstKey && firstValue
          ? {
              key: firstKey,
              valueMasked: '***' + String(firstValue).slice(-4),
            }
          : undefined,
      };
    }
  );

  /**
   * GET /demo/database-status
   * Returns database configuration status (using loaded secrets)
   */
  fastify.get(
    '/database-status',
    {
      schema: {
        description: 'Database configuration status using loaded secrets',
        tags: ['Demo'],
        response: {
          200: DatabaseStatusResponseSchema,
        },
      },
    },
    async () => {
      const { DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME } =
        fastify.secrets;

      const hasPassword = !!DATABASE_PASSWORD && DATABASE_PASSWORD.length > 0;

      return {
        configured: hasPassword,
        host: DATABASE_HOST,
        port: DATABASE_PORT,
        database: DATABASE_NAME,
        user: DATABASE_USER,
        passwordLoaded: hasPassword,
        connectionString: hasPassword
          ? `postgresql://${DATABASE_USER}:***@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`
          : 'not-configured',
      };
    }
  );

  /**
   * GET /demo/provider-comparison
   * Returns detailed comparison between secret providers
   */
  fastify.get(
    '/provider-comparison',
    {
      schema: {
        description: 'Detailed comparison between Vault and AWS/LocalStack providers',
        tags: ['Providers'],
        response: {
          200: ProviderComparisonResponseSchema,
        },
      },
    },
    async () => {
      return {
        currentProvider: env.SECRET_PROVIDER,
        availableProviders: ['vault', 'localstack'] as ('vault' | 'localstack')[],
        comparison: [
          {
            provider: 'vault' as const,
            pros: [
              'Open-source and free',
              'Multi-cloud support',
              'Dynamic secrets',
              'Granular ACL policies',
              'Active open-source community',
            ],
            cons: [
              'Requires self-hosted infrastructure',
              'Steep learning curve',
              'Complex HA setup',
              'Manual rotation setup required',
            ],
            setupComplexity: 'medium' as const,
            cost: 'free' as const,
            features: {
              rotation: true,
              versioning: true,
              auditLogs: true,
              multiRegion: false,
            },
          },
          {
            provider: 'localstack' as const,
            pros: [
              '100% free for development',
              'AWS API compatibility',
              'No cloud account needed',
              'Fast local development',
              'Offline capability',
            ],
            cons: [
              'Development only (not for production)',
              'Some AWS features not fully supported',
              'Requires Docker',
              'Mock data only',
            ],
            setupComplexity: 'low' as const,
            cost: 'free' as const,
            features: {
              rotation: false,
              versioning: true,
              auditLogs: false,
              multiRegion: false,
            },
          },
        ],
      };
    }
  );
};
