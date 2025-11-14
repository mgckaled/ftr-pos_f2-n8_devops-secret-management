import vault from 'node-vault';
import { createLogger } from '../logger.js';
import type { ISecretsProvider, VaultProviderConfig } from './types.js';
import { ProviderInitError, SecretLoadError } from './types.js';

const logger = createLogger({ provider: 'vault' });

/**
 * HashiCorp Vault provider implementation
 * Connects to Vault and retrieves secrets from KV v2 engine
 */
export class VaultProvider implements ISecretsProvider {
  readonly name = 'vault' as const;
  private client: vault.client;
  private config: VaultProviderConfig;

  constructor(config: VaultProviderConfig) {
    this.config = config;

    try {
      this.client = vault({
        apiVersion: config.apiVersion || 'v1',
        endpoint: config.endpoint,
        token: config.token,
      });

      logger.info({
        endpoint: config.endpoint,
        secretPath: config.secretPath,
      }, 'Vault provider initialized');
    } catch (error) {
      throw new ProviderInitError(
        'vault',
        'Failed to initialize Vault client',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Loads secrets from Vault KV v2 engine
   * @returns Promise resolving to key-value pairs of secrets
   * @throws {SecretLoadError} If unable to read secrets from Vault
   */
  async loadSecrets(): Promise<Record<string, string>> {
    try {
      logger.debug({
        path: this.config.secretPath,
      }, 'Loading secrets from Vault');

      // Read secret from Vault KV v2 (path format: secret/data/path)
      const response = await this.client.read(this.config.secretPath);

      if (!response?.data?.data) {
        throw new Error('Invalid response format from Vault');
      }

      const secrets = response.data.data as Record<string, string>;
      const secretKeys = Object.keys(secrets);

      logger.info({
        count: secretKeys.length,
        keys: secretKeys,
      }, 'Secrets loaded successfully from Vault');

      return secrets;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({
        error: errorMessage,
        path: this.config.secretPath,
      }, 'Failed to load secrets from Vault');

      throw new SecretLoadError(
        'vault',
        `Failed to read secrets from path '${this.config.secretPath}': ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Checks if Vault is accessible and healthy
   * @returns Promise resolving to true if Vault is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.health();
      const isHealthy = health.sealed === false && health.initialized === true;

      logger.debug({
        sealed: health.sealed,
        initialized: health.initialized,
        healthy: isHealthy,
      }, 'Vault health check');

      return isHealthy;
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Vault health check failed');
      return false;
    }
  }
}
