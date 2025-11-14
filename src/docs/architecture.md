<!-- markdownlint-disable -->

# Architecture Documentation

## Resumo Executivo

Este documento descreve a arquitetura técnica do projeto de demonstração de gerenciamento de secrets, implementado com Fastify, TypeScript e suporte a múltiplos provedores (HashiCorp Vault e AWS/LocalStack). A arquitetura utiliza padrões modernos como Factory Pattern, Type Providers e validação em runtime com Zod, garantindo type safety end-to-end e segurança em todas as camadas da aplicação.

## Introdução e Conceitos

### Objetivo da Arquitetura

A arquitetura foi projetada para ser:

- **Didática**: Fácil compreensão dos conceitos de secret management
- **Enxuta**: Mínima complexidade sem sacrificar funcionalidades essenciais
- **Segura**: Implementação de best practices de segurança desde o início
- **Extensível**: Suporte a múltiplos provedores através de abstração adequada

### Decisões Técnicas Fundamentais

#### Stack Tecnológico

- **Runtime**: Node.js com TypeScript (strict mode)
- **Framework Web**: Fastify com ZodTypeProvider
- **Validação**: Zod para schemas e type inference
- **Documentação API**: Scalar (interface moderna para OpenAPI)
- **Logging**: Pino com redaction de dados sensíveis
- **Containerização**: Docker Compose para Vault e LocalStack

#### Justificativas

1. **Fastify**: Performance superior ao Express, suporte nativo a TypeScript e plugin ecosystem robusto
2. **Zod**: Validação em runtime com inferência automática de tipos TypeScript
3. **Scalar**: Interface moderna e interativa para documentação OpenAPI
4. **Pino**: Logger de alta performance com suporte a structured logging

## Estrutura do Projeto

### Organização de Diretórios

```
src/
├── config/
│   └── env.ts                 # Validação de environment variables
├── infra/
│   ├── logger.ts              # Configuração do Pino logger
│   └── secrets/
│       ├── types.ts           # Interfaces e tipos
│       ├── factory.ts         # Factory Pattern para providers
│       ├── vault.provider.ts  # Implementação Vault
│       └── localstack.provider.ts  # Implementação LocalStack
├── plugins/
│   └── secrets.plugin.ts      # Plugin Fastify para carregar secrets
├── modules/
│   ├── health/
│   │   ├── health.schemas.ts  # Schemas Zod
│   │   └── health.routes.ts   # Rotas de health check
│   └── demo/
│       ├── demo.schemas.ts    # Schemas Zod
│       └── demo.routes.ts     # Rotas de demonstração
├── docs/                      # Documentação técnica
├── app.ts                     # Configuração do Fastify app
└── server.ts                  # Entry point da aplicação
```

## Camadas da Arquitetura

### 1. Camada de Configuração

#### Environment Validation (`src/config/env.ts`)

**Responsabilidade**: Validar e expor variáveis de ambiente de forma type-safe.

**Implementação**:

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  SECRET_PROVIDER: z.enum(['vault', 'localstack']).default('vault'),
  // Vault configuration
  VAULT_ADDR: z.string().url().default('http://localhost:8200'),
  VAULT_TOKEN: z.string().default('root'),
  // AWS/LocalStack configuration
  USE_LOCALSTACK: z.string().transform(val => val === 'true').default('false'),
  AWS_REGION: z.string().default('us-east-1'),
});
```

**Características**:

- Type coercion automática (strings para numbers/booleans)
- Valores default para desenvolvimento
- Validação com feedback descritivo em caso de erro

### 2. Camada de Infraestrutura

#### Logger (`src/infra/logger.ts`)

**Responsabilidade**: Logging estruturado com redaction de dados sensíveis.

**Implementação**:

```typescript
export const logger = pino({
  level: 'debug',
  redact: {
    paths: [
      'password', 'token', 'secret', 'apiKey',
      '*.password', '*.token', 'DATABASE_PASSWORD',
      'req.headers.authorization',
    ],
    censor: '***REDACTED***',
  },
});
```

**Características**:

- Pretty printing em desenvolvimento
- JSON estruturado em produção
- Redaction automática de campos sensíveis

#### Secret Providers (`src/infra/secrets/`)

**Responsabilidade**: Abstração para carregamento de secrets de múltiplos provedores.

##### Interface Base (`types.ts`)

```typescript
export interface ISecretsProvider {
  name: string;
  loadSecrets(): Promise<Record<string, string>>;
  healthCheck(): Promise<boolean>;
}
```

##### Factory Pattern (`factory.ts`)

**Padrão**: Creational Pattern - Factory Method

**Benefícios**:
- Encapsulamento da lógica de criação
- Facilita adição de novos provedores
- Configuração centralizada

```typescript
export class SecretsProviderFactory {
  static create(providerType?: SecretProviderType): ISecretsProvider {
    const provider = providerType || env.SECRET_PROVIDER;

    switch (provider) {
      case 'vault':
        return new VaultProvider({
          endpoint: env.VAULT_ADDR,
          token: env.VAULT_TOKEN,
          path: env.VAULT_SECRET_PATH,
        });

      case 'localstack':
        return new LocalStackProvider({
          region: env.AWS_REGION,
          secretName: env.AWS_SECRET_NAME,
          useLocalStack: env.USE_LOCALSTACK,
        });

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

##### Vault Provider (`vault.provider.ts`)

**Implementação**:

- Utiliza biblioteca `node-vault`
- Suporta KV v2 engine (path: `secret/data/`)
- Health check verifica status de seal/initialization

**Características**:
- Retry logic para resiliência
- Logging detalhado de operações
- Validação de resposta do Vault

##### LocalStack Provider (`localstack.provider.ts`)

**Implementação**:

- Utiliza `@aws-sdk/client-secrets-manager`
- Suporta endpoint customizado para LocalStack
- Compatível com AWS Secrets Manager real

**Características**:
- Parsing automático de JSON
- Endpoint configurável (LocalStack vs AWS)
- Fallback para credenciais default

### 3. Camada de Plugin

#### Secrets Plugin (`src/plugins/secrets.plugin.ts`)

**Responsabilidade**: Carregar secrets na inicialização e injetar no contexto Fastify.

**Implementação**:

```typescript
const secretsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.log.info('Loading secrets from provider', {
    provider: env.SECRET_PROVIDER,
  });

  const provider = SecretsProviderFactory.create();

  // Health check before loading
  const isHealthy = await provider.healthCheck();
  if (!isHealthy) {
    throw new ProviderInitError(`Provider ${provider.name} is not healthy`);
  }

  // Load secrets
  const rawSecrets = await provider.loadSecrets();

  // Validate with Zod
  const validatedSecrets = validateSecrets(rawSecrets);

  // Inject into process.env
  Object.assign(process.env, validatedSecrets);

  // Decorate Fastify instance
  fastify.decorate('secrets', validatedSecrets);
};
```

**Características**:

- Fail-fast: Falha na inicialização se secrets não podem ser carregados
- Validação em runtime com Zod
- Decoração do Fastify instance para acesso type-safe
- Logging de todas as operações

### 4. Camada de Aplicação

#### App Configuration (`src/app.ts`)

**Responsabilidade**: Configurar Fastify com todos os plugins e segurança.

**Plugins Registrados**:

1. **Helmet**: Security headers (CSP, HSTS, X-Frame-Options)
2. **CORS**: Cross-origin resource sharing
3. **Rate Limit**: 100 requisições por 15 minutos
4. **Swagger**: Documentação OpenAPI
5. **Scalar**: Interface moderna para API docs
6. **Secrets Plugin**: Carregamento de secrets

**Configuração de Segurança**:

```typescript
// Helmet - Security Headers
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Scalar UI
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

// Rate Limiting
await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});
```

### 5. Camada de Rotas

#### Health Routes (`src/modules/health/`)

**Endpoint**: `GET /health`

**Responsabilidade**: Verificar status da aplicação e carregamento de secrets.

**Schema Zod**:

```typescript
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string(),
  uptime: z.number(),
  provider: z.enum(['vault', 'localstack']),
  secretsLoaded: z.boolean(),
  version: z.string(),
});
```

#### Demo Routes (`src/modules/demo/`)

**Endpoints**:

1. `GET /demo/secrets-info`: Informações sobre secrets carregados (valores mascarados)
2. `GET /demo/database-status`: Status de configuração do banco de dados
3. `GET /demo/provider-comparison`: Comparação detalhada entre Vault e LocalStack

**Segurança**:

- Todos os valores de secrets são mascarados (`***` + últimos 4 caracteres)
- Nenhum secret completo é exposto nas respostas
- Logging redacta automaticamente campos sensíveis

## Padrões de Design Utilizados

### Factory Pattern

**Localização**: `src/infra/secrets/factory.ts`

**Objetivo**: Encapsular a criação de secret providers.

**Benefícios**:
- Separação de concerns
- Facilita testes unitários
- Extensibilidade para novos providers

### Plugin Pattern

**Localização**: `src/plugins/secrets.plugin.ts`

**Objetivo**: Modularizar funcionalidades do Fastify.

**Benefícios**:
- Reutilização de código
- Encapsulamento de lógica de inicialização
- Integração com lifecycle do Fastify

### Type Provider Pattern

**Localização**: Todo o projeto (Zod + Fastify)

**Objetivo**: Garantir type safety end-to-end.

**Benefícios**:
- Inferência automática de tipos TypeScript
- Validação em runtime
- Documentação OpenAPI gerada automaticamente

## Fluxo de Dados

### Inicialização da Aplicação

1. **Validação de Environment** (`env.ts`)
   - Lê variáveis de ambiente
   - Valida com Zod
   - Expõe objeto `env` type-safe

2. **Criação do App** (`app.ts`)
   - Instancia Fastify com ZodTypeProvider
   - Registra plugins de segurança (Helmet, CORS, Rate Limit)
   - Registra plugin de secrets

3. **Carregamento de Secrets** (`secrets.plugin.ts`)
   - Factory cria provider apropriado (Vault ou LocalStack)
   - Health check do provider
   - Carrega secrets do provider
   - Valida secrets com Zod
   - Injeta em `process.env` e `fastify.secrets`

4. **Registro de Rotas** (`app.ts`)
   - Rotas de health check
   - Rotas de demonstração
   - Documentação (Scalar)

5. **Start do Servidor** (`server.ts`)
   - Inicia Fastify listener
   - Registra handlers de graceful shutdown
   - Logging de status

### Processamento de Requisição

1. **Request chega ao Fastify**
2. **Middleware de Segurança**:
   - Helmet aplica security headers
   - Rate limiter verifica limites
   - CORS valida origin (se aplicável)
3. **Route Handler**:
   - Zod valida request (params, query, body)
   - Handler acessa `fastify.secrets` de forma type-safe
   - Processa lógica de negócio
4. **Response**:
   - Zod serializa response conforme schema
   - Logging redacta campos sensíveis
   - Response é enviada ao cliente

## Segurança

### Defense in Depth

A aplicação implementa múltiplas camadas de segurança:

#### 1. Network Level

- **Docker Network Isolation**: Vault e LocalStack em rede dedicada
- **Port Binding**: Apenas portas necessárias expostas

#### 2. Application Level

- **Security Headers** (Helmet):
  - Content Security Policy (CSP)
  - HTTP Strict Transport Security (HSTS)
  - X-Frame-Options
  - X-Content-Type-Options

- **Rate Limiting**: Proteção contra abuse
- **CORS**: Controle de cross-origin requests

#### 3. Data Level

- **Secret Redaction**: Logging automático redacta campos sensíveis
- **Masked Responses**: APIs nunca retornam secrets completos
- **Environment Validation**: Zod valida todas as configurações

#### 4. Code Level

- **TypeScript Strict Mode**: Previne erros em compile-time
- **Zod Runtime Validation**: Previne erros em runtime
- **Fail-Fast**: Aplicação não inicia sem secrets válidos

### Secrets Management Best Practices

1. **Nunca commitar secrets**: `.env` no `.gitignore`
2. **Rotação de secrets**: Suportada por ambos providers
3. **Princípio do menor privilégio**: Apenas secrets necessários são carregados
4. **Auditoria**: Logging estruturado de todas as operações
5. **Separação de ambientes**: Environment variables determinam provider e configuração

## Extensibilidade

### Adicionar Novo Provider

Para adicionar suporte a um novo provider de secrets:

1. **Criar Provider Class** (`src/infra/secrets/novo-provider.provider.ts`):

```typescript
export class NovoProvider implements ISecretsProvider {
  name = 'novo-provider';

  async loadSecrets(): Promise<Record<string, string>> {
    // Implementação específica
  }

  async healthCheck(): Promise<boolean> {
    // Implementação específica
  }
}
```

2. **Atualizar Factory** (`src/infra/secrets/factory.ts`):

```typescript
case 'novo-provider':
  return new NovoProvider({ /* config */ });
```

3. **Atualizar Environment Schema** (`src/config/env.ts`):

```typescript
SECRET_PROVIDER: z.enum(['vault', 'localstack', 'novo-provider']),
```

### Adicionar Novas Rotas

1. **Criar Schema Zod** (`src/modules/feature/feature.schemas.ts`)
2. **Criar Routes** (`src/modules/feature/feature.routes.ts`)
3. **Registrar em App** (`src/app.ts`)

## Performance Considerations

### Fastify Performance

- **Async/Await**: Todas as operações I/O são assíncronas
- **Schema Compilation**: Zod schemas compilados na inicialização
- **Pino Logger**: Logger de alta performance com low overhead

### Secret Loading

- **Cache na Inicialização**: Secrets carregados uma vez no startup
- **Fail-Fast**: Aplicação não inicia se secrets não estiverem disponíveis
- **Health Checks**: Docker Compose garante que providers estejam prontos

## Conclusões

### Decisões Arquiteturais Principais

1. **Factory Pattern para Providers**: Abstração adequada sem over-engineering
2. **Zod para Validação**: Type safety end-to-end com minimal overhead
3. **Fastify Plugin System**: Modularização natural e lifecycle management
4. **Security by Default**: Helmet, rate limiting e CORS desde o início

### Trade-offs

| Decisão | Benefício | Custo |
|---------|-----------|-------|
| TypeScript Strict Mode | Type safety máxima | Curva de aprendizado |
| Zod Runtime Validation | Prevenção de erros em runtime | Overhead minimal de validação |
| Fail-Fast Startup | Previne aplicação em estado inválido | Restart necessário se secrets mudarem |
| Docker Compose | Setup simples e reproduzível | Requer Docker instalado |

### Escalabilidade

Para produção, considere:

1. **Secret Rotation**: Implementar polling ou webhook para recarregar secrets
2. **High Availability**: Vault cluster, AWS multi-region
3. **Monitoring**: Integração com APM (New Relic, DataDog)
4. **Caching**: Redis para secrets frequentemente acessados (com TTL curto)

## Referências Bibliográficas

1. HashiCorp. (2024). Vault Documentation. https://developer.hashicorp.com/vault/docs
2. AWS. (2024). AWS Secrets Manager Documentation. https://docs.aws.amazon.com/secretsmanager/
3. Fastify. (2024). Fastify Documentation. https://fastify.dev/docs/latest/
4. Colinhacks. (2024). Zod Documentation. https://zod.dev/
5. OWASP. (2024). OWASP Top Ten. https://owasp.org/www-project-top-ten/
6. LocalStack. (2024). LocalStack Documentation. https://docs.localstack.cloud/

## Apêndice

### Glossário e Termos Técnicos

- **CSP (Content Security Policy)**: Header HTTP que previne XSS attacks
- **Factory Pattern**: Padrão de design para encapsular criação de objetos
- **Fail-Fast**: Estratégia de falhar imediatamente ao detectar erro
- **HSTS (HTTP Strict Transport Security)**: Header que força uso de HTTPS
- **KV (Key-Value)**: Tipo de armazenamento chave-valor
- **Plugin**: Módulo que estende funcionalidades de um framework
- **Rate Limiting**: Limitação de número de requisições por período
- **Redaction**: Ocultação de dados sensíveis em logs
- **Structured Logging**: Logs em formato estruturado (JSON)
- **Type Provider**: Pattern que fornece types em runtime
- **Type Safety**: Garantia de tipos em compile-time e runtime
- **Zod**: Biblioteca de validação com inferência de tipos TypeScript
