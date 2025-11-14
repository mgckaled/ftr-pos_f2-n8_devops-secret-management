import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import secretsPlugin from './plugins/secrets.plugin.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { demoRoutes } from './modules/demo/demo.routes.js';
import { env } from './config/env.js';

/**
 * Build Fastify application with all plugins and routes
 * @returns Configured Fastify instance
 */
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      // Redact sensitive fields from logs
      redact: {
        paths: [
          'req.headers.authorization',
          'password',
          'token',
          'secret',
          '*.password',
          '*.token',
          '*.secret',
        ],
        censor: '***REDACTED***',
      },
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Set Zod as validator and serializer
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Security: Helmet for security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Scalar UI requires inline scripts
        styleSrc: ["'self'", "'unsafe-inline'"], // Scalar UI requires inline styles
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  });

  // Security: CORS
  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? false : true, // Disable CORS in production by default
    credentials: true,
  });

  // Security: Rate limiting
  await app.register(rateLimit, {
    max: 100, // Maximum 100 requests
    timeWindow: '15 minutes',
  });

  // Swagger/OpenAPI configuration
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Secrets Management Demo API',
        description:
          'Didactic API comparing HashiCorp Vault and AWS Secrets Management (LocalStack)',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Demo', description: 'Secret management demonstrations' },
        { name: 'Providers', description: 'Provider comparisons' },
      ],
    },
  });

  // Scalar UI (modern API documentation)
  await app.register(scalar, {
    routePrefix: '/docs',
    configuration: {
      theme: 'purple',
      darkMode: true,
      layout: 'modern',
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch',
      },
    },
  });

  // Load secrets from configured provider (Vault or LocalStack)
  await app.register(secretsPlugin);

  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(demoRoutes, { prefix: '/demo' });

  // Root endpoint
  app.get('/', async () => {
    return {
      message: 'Secrets Management Demo API',
      documentation: '/docs',
      health: '/health',
      provider: env.SECRET_PROVIDER,
    };
  });

  return app;
}
