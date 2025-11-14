import type { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { SecretsProviderFactory } from '../infra/secrets/factory.js';
import { validateSecrets, type Secrets } from '../config/env.js';
import { logger } from '../infra/logger.js';

/**
 * Augment Fastify types to include secrets decorator
 */
declare module 'fastify' {
  interface FastifyInstance {
    secrets: Secrets;
  }
}

/**
 * Fastify plugin to load and validate secrets from configured provider
 * Decorates Fastify instance with type-safe secrets object
 */
const secretsPlugin: FastifyPluginAsync = async (fastify) => {
  const provider = SecretsProviderFactory.create();

  logger.info({
    provider: provider.name,
  }, 'Loading secrets from provider');

  try {
    // Load raw secrets from provider
    const rawSecrets = await provider.loadSecrets();

    // Validate secrets with Zod schema
    const validatedSecrets = validateSecrets(rawSecrets);

    // Inject into process.env for compatibility with libraries
    Object.entries(validatedSecrets).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = String(value);
      }
    });

    // Decorate Fastify instance with type-safe secrets
    fastify.decorate('secrets', validatedSecrets);

    logger.info({
      provider: provider.name,
      totalSecrets: Object.keys(validatedSecrets).length,
      secretKeys: Object.keys(validatedSecrets),
    }, 'Secrets loaded and validated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      provider: provider.name,
      error: errorMessage,
    }, 'Failed to load secrets');

    // Fail fast: if we can't load secrets, don't start the server
    throw new Error(`Secret loading failed: ${errorMessage}`);
  }
};

/**
 * Export plugin wrapped with fastify-plugin
 * This ensures the decorator is available in the parent scope
 */
export default fastifyPlugin(secretsPlugin, {
  name: 'secrets-plugin',
  fastify: '5.x',
});
