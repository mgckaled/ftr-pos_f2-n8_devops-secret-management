#!/usr/bin/env tsx

/**
 * Vault Setup Script
 *
 * This script automatically configures HashiCorp Vault with sample secrets
 * for development purposes.
 *
 * Prerequisites:
 * - Docker Compose running with Vault container
 * - Vault accessible at http://localhost:8200
 *
 * Usage:
 *   pnpm setup:vault
 */

import vault from 'node-vault';
import { logger } from '../src/infra/logger.js';

interface VaultSetupConfig {
  endpoint: string;
  token: string;
  secretPath: string;
}

interface AppSecrets {
  DATABASE_HOST: string;
  DATABASE_PORT: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  CLOUDFLARE_API_KEY: string;
  NEW_RELIC_LICENSE_KEY: string;
}

const DEFAULT_CONFIG: VaultSetupConfig = {
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN || 'root',
  secretPath: 'secret/app-secrets', // KV v2 path (without /data/)
};

const SAMPLE_SECRETS: AppSecrets = {
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'dev_password_123',
  DATABASE_NAME: 'app_development',
  CLOUDFLARE_API_KEY: 'cf_dev_api_key_example_abc123',
  NEW_RELIC_LICENSE_KEY: 'nr_dev_license_key_example_xyz789',
};

/**
 * Wait for Vault to be ready
 */
async function waitForVault(client: any, maxRetries = 10, retryDelay = 2000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const health = await client.health();
      if (!health.sealed && health.initialized) {
        logger.info('Vault is ready', {
          sealed: health.sealed,
          initialized: health.initialized,
        });
        return;
      }

      logger.warn('Vault is not ready, waiting...', {
        attempt: i + 1,
        maxRetries,
        sealed: health.sealed,
        initialized: health.initialized,
      });
    } catch (error) {
      logger.warn('Failed to connect to Vault, retrying...', {
        attempt: i + 1,
        maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Vault is not ready after maximum retries');
}

/**
 * Enable KV v2 secrets engine if not already enabled
 */
async function ensureKvEngine(client: any, mountPath = 'secret'): Promise<void> {
  try {
    const mounts = await client.mounts();

    if (mounts[`${mountPath}/`]) {
      logger.info('KV secrets engine already enabled', { mountPath });
      return;
    }

    logger.info('Enabling KV v2 secrets engine', { mountPath });

    await client.mount({
      mount_point: mountPath,
      type: 'kv',
      options: {
        version: '2',
      },
    });

    logger.info('KV v2 secrets engine enabled successfully', { mountPath });
  } catch (error) {
    // If error is "path is already in use", it's okay
    if (error instanceof Error && error.message.includes('path is already in use')) {
      logger.info('KV secrets engine already exists', { mountPath });
      return;
    }

    logger.error('Failed to enable KV secrets engine', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Create or update secrets in Vault
 */
async function createSecrets(
  client: any,
  secretPath: string,
  secrets: AppSecrets
): Promise<void> {
  try {
    logger.info('Creating secrets in Vault', {
      path: secretPath,
      secretCount: Object.keys(secrets).length,
    });

    // KV v2 requires writing to path with /data/
    await client.write(`${secretPath}`, {
      data: secrets,
    });

    logger.info('Secrets created successfully', {
      path: secretPath,
      keys: Object.keys(secrets),
    });
  } catch (error) {
    logger.error('Failed to create secrets', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Verify secrets were created correctly
 */
async function verifySecrets(client: any, secretPath: string): Promise<void> {
  try {
    logger.info('Verifying secrets', { path: secretPath });

    // Read from /data/ path for KV v2
    const result = await client.read(`${secretPath}`);

    if (!result?.data?.data) {
      throw new Error('Secrets not found or invalid response structure');
    }

    const loadedSecrets = result.data.data;
    const expectedKeys = Object.keys(SAMPLE_SECRETS);
    const loadedKeys = Object.keys(loadedSecrets);

    const missingKeys = expectedKeys.filter((key) => !loadedKeys.includes(key));

    if (missingKeys.length > 0) {
      throw new Error(`Missing secrets: ${missingKeys.join(', ')}`);
    }

    logger.info('Secrets verified successfully', {
      secretCount: loadedKeys.length,
      keys: loadedKeys,
    });
  } catch (error) {
    logger.error('Failed to verify secrets', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Main setup function
 */
async function setupVault(): Promise<void> {
  const startTime = Date.now();

  logger.info('Starting Vault setup', {
    endpoint: DEFAULT_CONFIG.endpoint,
    secretPath: DEFAULT_CONFIG.secretPath,
  });

  try {
    // Initialize Vault client
    const client = vault({
      apiVersion: 'v1',
      endpoint: DEFAULT_CONFIG.endpoint,
      token: DEFAULT_CONFIG.token,
    });

    // Wait for Vault to be ready
    await waitForVault(client);

    // Ensure KV v2 engine is enabled
    await ensureKvEngine(client, 'secret');

    // Create secrets
    await createSecrets(client, DEFAULT_CONFIG.secretPath, SAMPLE_SECRETS);

    // Verify secrets
    await verifySecrets(client, DEFAULT_CONFIG.secretPath);

    const duration = Date.now() - startTime;

    logger.info('Vault setup completed successfully', {
      duration: `${duration}ms`,
      secretsCreated: Object.keys(SAMPLE_SECRETS).length,
    });

    console.log('\n✓ Vault setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the application: pnpm demo:vault');
    console.log('2. Access the API documentation: http://localhost:3000/docs');
    console.log('3. Check health endpoint: http://localhost:3000/health');
    console.log('\nVault UI: http://localhost:8200/ui (token: root)');
  } catch (error) {
    logger.error('Vault setup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('\n✗ Vault setup failed!');
    console.error('\nTroubleshooting:');
    console.error('1. Ensure Docker Compose is running: docker compose up -d vault');
    console.error('2. Check Vault container status: docker compose ps');
    console.error('3. Check Vault logs: docker compose logs vault');
    console.error(`4. Verify Vault is accessible: curl ${DEFAULT_CONFIG.endpoint}/v1/sys/health`);

    process.exit(1);
  }
}

// Run setup
setupVault();
