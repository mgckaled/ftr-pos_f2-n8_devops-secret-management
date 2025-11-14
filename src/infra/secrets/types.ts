/**
 * Available secret providers
 */
export type SecretProviderType = 'vault' | 'localstack';

/**
 * Interface that all secret providers must implement
 * Ensures consistent API across different providers (Vault, AWS, etc.)
 */
export interface ISecretsProvider {
  /**
   * Name identifier of the provider
   */
  readonly name: SecretProviderType;

  /**
   * Loads secrets from the provider
   * @returns Promise resolving to key-value pairs of secrets
   * @throws Error if unable to load secrets
   */
  loadSecrets(): Promise<Record<string, string>>;

  /**
   * Health check for the provider connection
   * @returns Promise resolving to boolean indicating if provider is accessible
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Configuration options for Vault provider
 */
export interface VaultProviderConfig {
  endpoint: string;
  token: string;
  secretPath: string;
  apiVersion?: string;
}

/**
 * Configuration options for LocalStack (AWS) provider
 */
export interface LocalStackProviderConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  secretName: string;
  endpoint?: string;
  useLocalStack: boolean;
}

/**
 * Provider initialization error
 */
export class ProviderInitError extends Error {
  constructor(
    public readonly provider: SecretProviderType,
    message: string,
    public readonly cause?: Error
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderInitError';
  }
}

/**
 * Secret loading error
 */
export class SecretLoadError extends Error {
  constructor(
    public readonly provider: SecretProviderType,
    message: string,
    public readonly cause?: Error
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'SecretLoadError';
  }
}
