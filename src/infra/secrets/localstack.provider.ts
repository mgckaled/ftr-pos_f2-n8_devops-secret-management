import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { createLogger } from '../logger.js';
import type { ISecretsProvider, LocalStackProviderConfig } from './types.js';
import { ProviderInitError, SecretLoadError } from './types.js';

const logger = createLogger({ provider: 'localstack' });

/**
 * LocalStack (AWS Secrets Manager) provider implementation
 * Connects to LocalStack or real AWS Secrets Manager
 */
export class LocalStackProvider implements ISecretsProvider {
  readonly name = 'localstack' as const;
  private client: SecretsManagerClient;
  private config: LocalStackProviderConfig;

  constructor(config: LocalStackProviderConfig) {
    this.config = config;

    try {
      this.client = new SecretsManagerClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        ...(config.endpoint && { endpoint: config.endpoint }),
      });

      logger.info({
        region: config.region,
        secretName: config.secretName,
        useLocalStack: config.useLocalStack,
        endpoint: config.endpoint || 'default AWS endpoint',
      }, 'LocalStack provider initialized');
    } catch (error) {
      throw new ProviderInitError(
        'localstack',
        'Failed to initialize AWS Secrets Manager client',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Loads secrets from AWS Secrets Manager (or LocalStack)
   * @returns Promise resolving to key-value pairs of secrets
   * @throws {SecretLoadError} If unable to retrieve secrets
   */
  async loadSecrets(): Promise<Record<string, string>> {
    try {
      logger.debug({
        secretName: this.config.secretName,
      }, 'Loading secrets from AWS Secrets Manager');

      const command = new GetSecretValueCommand({
        SecretId: this.config.secretName,
      });

      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error('Secret has no SecretString value');
      }

      const secrets = JSON.parse(response.SecretString) as Record<string, string>;
      const secretKeys = Object.keys(secrets);

      logger.info({
        count: secretKeys.length,
        keys: secretKeys,
        versionId: response.VersionId,
      }, 'Secrets loaded successfully from AWS Secrets Manager');

      return secrets;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({
        error: errorMessage,
        secretName: this.config.secretName,
      }, 'Failed to load secrets from AWS Secrets Manager');

      throw new SecretLoadError(
        'localstack',
        `Failed to retrieve secret '${this.config.secretName}': ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Checks if AWS Secrets Manager is accessible
   * @returns Promise resolving to true if service is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple check: try to describe the secret without retrieving its value
      const command = new GetSecretValueCommand({
        SecretId: this.config.secretName,
      });

      await this.client.send(command);

      logger.debug({
        secretName: this.config.secretName,
      }, 'LocalStack health check passed');

      return true;
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
        secretName: this.config.secretName,
      }, 'LocalStack health check failed');
      return false;
    }
  }
}
