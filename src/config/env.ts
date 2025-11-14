import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Environment variables schema with Zod validation
 * Ensures type-safety and runtime validation for all env vars
 */
const envSchema = z.object({
  // Application settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),

  // Secret provider selection
  SECRET_PROVIDER: z.enum(['vault', 'localstack']).default('vault'),

  // Vault configuration (required when SECRET_PROVIDER=vault)
  VAULT_ADDR: z.string().url().default('http://localhost:8200'),
  VAULT_TOKEN: z.string().default('root'),
  VAULT_SECRET_PATH: z.string().default('secret/data/widget-server'),

  // AWS/LocalStack configuration (required when SECRET_PROVIDER=localstack)
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().default('test'),
  AWS_SECRET_ACCESS_KEY: z.string().default('test'),
  AWS_SECRET_NAME: z.string().default('/widget-server/secrets'),

  // LocalStack specific
  USE_LOCALSTACK: z.string().transform(val => val === 'true').default('false'),
  LOCALSTACK_ENDPOINT: z.string().url().default('http://localhost:4566'),
});

/**
 * Validated and type-safe environment variables
 * @throws {z.ZodError} If validation fails
 */
export const env = envSchema.parse(process.env);

/**
 * TypeScript type inferred from Zod schema
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Schema for secrets loaded from Vault or LocalStack
 * Validates that all required secrets are present and valid
 */
export const secretsSchema = z.object({
  // Database configuration
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(8),
  DATABASE_NAME: z.string().min(1),

  // Cloudflare R2 configuration (optional)
  CLOUDFLARE_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_ENDPOINT: z.string().url().optional(),

  // New Relic configuration (optional)
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  NEW_RELIC_APP_NAME: z.string().optional(),
});

/**
 * TypeScript type for validated secrets
 */
export type Secrets = z.infer<typeof secretsSchema>;

/**
 * Validates and transforms raw secrets from providers
 * @param secrets - Raw secrets object from Vault or LocalStack
 * @returns Validated and type-safe secrets
 * @throws {z.ZodError} If secrets are invalid or missing required fields
 */
export function validateSecrets(secrets: Record<string, unknown>): Secrets {
  try {
    return secretsSchema.parse(secrets);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');

      throw new Error(`Secret validation failed: ${issues}`);
    }
    throw error;
  }
}
