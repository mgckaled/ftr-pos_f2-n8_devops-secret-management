import { z } from 'zod';

/**
 * Health check response schema
 */
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string().datetime(),
  uptime: z.number().describe('Server uptime in seconds'),
  provider: z.string().describe('Current secret provider'),
  secretsLoaded: z.boolean().describe('Whether secrets were loaded successfully'),
  version: z.string().optional(),
});

/**
 * TypeScript type inferred from schema
 */
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
