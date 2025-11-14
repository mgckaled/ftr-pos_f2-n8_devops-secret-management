import { z } from 'zod';

/**
 * Secret provider enum
 */
export const SecretProviderSchema = z.enum(['vault', 'localstack']);

/**
 * Secrets info response schema
 */
export const SecretsInfoResponseSchema = z.object({
  provider: SecretProviderSchema,
  totalSecrets: z.number().int().min(0),
  secretKeys: z.array(z.string()),
  loadedAt: z.string().datetime(),
  example: z.object({
    key: z.string(),
    valueMasked: z.string().describe('Last 4 characters of the value'),
  }).optional(),
});

/**
 * Database status response schema
 */
export const DatabaseStatusResponseSchema = z.object({
  configured: z.boolean(),
  host: z.string(),
  port: z.number(),
  database: z.string().optional(),
  user: z.string(),
  passwordLoaded: z.boolean(),
  connectionString: z.string().describe('Masked connection string'),
});

/**
 * Provider comparison item schema
 */
export const ProviderComparisonItemSchema = z.object({
  provider: SecretProviderSchema,
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  setupComplexity: z.enum(['low', 'medium', 'high']),
  cost: z.enum(['free', 'paid', 'freemium']),
  features: z.object({
    rotation: z.boolean(),
    versioning: z.boolean(),
    auditLogs: z.boolean(),
    multiRegion: z.boolean(),
  }),
});

/**
 * Provider comparison response schema
 */
export const ProviderComparisonResponseSchema = z.object({
  currentProvider: SecretProviderSchema,
  availableProviders: z.array(SecretProviderSchema),
  comparison: z.array(ProviderComparisonItemSchema),
});

/**
 * TypeScript types inferred from schemas
 */
export type SecretsInfoResponse = z.infer<typeof SecretsInfoResponseSchema>;
export type DatabaseStatusResponse = z.infer<typeof DatabaseStatusResponseSchema>;
export type ProviderComparisonResponse = z.infer<typeof ProviderComparisonResponseSchema>;
