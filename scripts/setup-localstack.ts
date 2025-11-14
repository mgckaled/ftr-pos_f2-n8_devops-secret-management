#!/usr/bin/env tsx

/**
 * LocalStack Setup Script
 *
 * This script automatically configures LocalStack (AWS emulator) with sample secrets
 * in AWS Secrets Manager for development purposes.
 *
 * Prerequisites:
 * - Docker Compose running with LocalStack container
 * - LocalStack accessible at http://localhost:4566
 *
 * Usage:
 *   pnpm setup:localstack
 */

import {
  SecretsManagerClient,
  CreateSecretCommand,
  GetSecretValueCommand,
  DeleteSecretCommand,
  ResourceExistsException,
} from '@aws-sdk/client-secrets-manager';
import { logger } from '../src/infra/logger.js';

interface LocalStackSetupConfig {
  region: string;
  endpoint: string;
  secretName: string;
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

const DEFAULT_CONFIG: LocalStackSetupConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
  secretName: process.env.AWS_SECRET_NAME || 'app-secrets',
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
 * Create AWS Secrets Manager client configured for LocalStack
 */
function createClient(config: LocalStackSetupConfig): SecretsManagerClient {
  return new SecretsManagerClient({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });
}

/**
 * Wait for LocalStack to be ready
 */
async function waitForLocalStack(maxRetries = 10, retryDelay = 2000): Promise<void> {
  const endpoint = DEFAULT_CONFIG.endpoint;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${endpoint}/_localstack/health`);
      const health = await response.json();

      if (health.services?.secretsmanager === 'available') {
        logger.info({
          services: health.services,
        }, 'LocalStack is ready');
        return;
      }

      logger.warn({
        attempt: i + 1,
        maxRetries,
        services: health.services,
      }, 'LocalStack is not ready, waiting...');
    } catch (error) {
      logger.warn({
        attempt: i + 1,
        maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to connect to LocalStack, retrying...');
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('LocalStack is not ready after maximum retries');
}

/**
 * Delete existing secret if it exists
 */
async function deleteExistingSecret(
  client: SecretsManagerClient,
  secretName: string
): Promise<void> {
  try {
    logger.info({ secretName }, 'Checking if secret already exists');

    await client.send(
      new DeleteSecretCommand({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: true,
      })
    );

    logger.info({ secretName }, 'Deleted existing secret');
  } catch (error: unknown) {
    // If secret doesn't exist, that's okay
    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      logger.info({ secretName }, 'Secret does not exist, proceeding with creation');
      return;
    }

    logger.warn({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error checking/deleting existing secret');
  }
}

/**
 * Create secret in AWS Secrets Manager (LocalStack)
 */
async function createSecret(
  client: SecretsManagerClient,
  secretName: string,
  secrets: AppSecrets
): Promise<void> {
  try {
    logger.info({
      secretName,
      secretCount: Object.keys(secrets).length,
    }, 'Creating secret in LocalStack');

    const command = new CreateSecretCommand({
      Name: secretName,
      SecretString: JSON.stringify(secrets, null, 2),
      Description: 'Development secrets for Secrets Management Demo App',
    });

    const response = await client.send(command);

    logger.info({
      arn: response.ARN,
      name: response.Name,
      versionId: response.VersionId,
    }, 'Secret created successfully');
  } catch (error) {
    if (error instanceof ResourceExistsException) {
      logger.warn({
        secretName,
      }, 'Secret already exists, consider deleting first');
      throw new Error(
        `Secret "${secretName}" already exists. Delete it first or use a different name.`
      );
    }

    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to create secret');
    throw error;
  }
}

/**
 * Verify secret was created correctly
 */
async function verifySecret(
  client: SecretsManagerClient,
  secretName: string
): Promise<void> {
  try {
    logger.info({ secretName }, 'Verifying secret');

    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    const loadedSecrets = JSON.parse(response.SecretString);
    const expectedKeys = Object.keys(SAMPLE_SECRETS);
    const loadedKeys = Object.keys(loadedSecrets);

    const missingKeys = expectedKeys.filter((key) => !loadedKeys.includes(key));

    if (missingKeys.length > 0) {
      throw new Error(`Missing secrets: ${missingKeys.join(', ')}`);
    }

    logger.info({
      secretCount: loadedKeys.length,
      keys: loadedKeys,
      arn: response.ARN,
      versionId: response.VersionId,
    }, 'Secret verified successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to verify secret');
    throw error;
  }
}

/**
 * Main setup function
 */
async function setupLocalStack(): Promise<void> {
  const startTime = Date.now();

  logger.info({
    endpoint: DEFAULT_CONFIG.endpoint,
    region: DEFAULT_CONFIG.region,
    secretName: DEFAULT_CONFIG.secretName,
  }, 'Starting LocalStack setup');

  try {
    // Wait for LocalStack to be ready
    await waitForLocalStack();

    // Create AWS Secrets Manager client
    const client = createClient(DEFAULT_CONFIG);

    // Delete existing secret if it exists
    await deleteExistingSecret(client, DEFAULT_CONFIG.secretName);

    // Create secret
    await createSecret(client, DEFAULT_CONFIG.secretName, SAMPLE_SECRETS);

    // Verify secret
    await verifySecret(client, DEFAULT_CONFIG.secretName);

    const duration = Date.now() - startTime;

    logger.info({
      duration: `${duration}ms`,
      secretsCreated: Object.keys(SAMPLE_SECRETS).length,
    }, 'LocalStack setup completed successfully');

    console.log('\n✓ LocalStack setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the application: pnpm demo:localstack');
    console.log('2. Access the API documentation: http://localhost:3000/docs');
    console.log('3. Check health endpoint: http://localhost:3000/health');
    console.log('\nLocalStack health: http://localhost:4566/_localstack/health');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'LocalStack setup failed');

    console.error('\n✗ LocalStack setup failed!');
    console.error('\nTroubleshooting:');
    console.error('1. Ensure Docker Compose is running: docker compose up -d localstack');
    console.error('2. Check LocalStack container status: docker compose ps');
    console.error('3. Check LocalStack logs: docker compose logs localstack');
    console.error(
      `4. Verify LocalStack is accessible: curl ${DEFAULT_CONFIG.endpoint}/_localstack/health`
    );

    process.exit(1);
  }
}

// Run setup
setupLocalStack();
