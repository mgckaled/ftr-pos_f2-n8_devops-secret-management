import { env } from '../../config/env.js';
import { VaultProvider } from './vault.provider.js';
import { LocalStackProvider } from './localstack.provider.js';
import type { ISecretsProvider, SecretProviderType } from './types.js';
import { ProviderInitError } from './types.js';

/**
 * Factory class for creating secret providers
 * Implements Factory Pattern to abstract provider instantiation
 */
export class SecretsProviderFactory {
  /**
   * Creates a secrets provider based on the specified type
   * @param providerType - Type of provider to create
   * @returns Instantiated provider implementing ISecretsProvider
   * @throws {ProviderInitError} If provider type is unknown
   */
  static create(providerType?: SecretProviderType): ISecretsProvider {
    const provider = providerType || env.SECRET_PROVIDER;

    switch (provider) {
      case 'vault':
        return new VaultProvider({
          endpoint: env.VAULT_ADDR,
          token: env.VAULT_TOKEN,
          secretPath: env.VAULT_SECRET_PATH,
          apiVersion: 'v1',
        });

      case 'localstack':
        return new LocalStackProvider({
          region: env.AWS_REGION,
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          secretName: env.AWS_SECRET_NAME,
          endpoint: env.USE_LOCALSTACK ? env.LOCALSTACK_ENDPOINT : undefined,
          useLocalStack: env.USE_LOCALSTACK,
        });

      default:
        throw new ProviderInitError(
          provider as SecretProviderType,
          `Unknown provider type: ${provider}. Valid options: 'vault', 'localstack'`
        );
    }
  }

  /**
   * Gets the current provider name from environment
   * @returns Current provider type
   */
  static getCurrentProvider(): SecretProviderType {
    return env.SECRET_PROVIDER;
  }

  /**
   * Lists all available provider types
   * @returns Array of available provider types
   */
  static getAvailableProviders(): SecretProviderType[] {
    return ['vault', 'localstack'];
  }
}
