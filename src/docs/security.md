<!-- markdownlint-disable -->

# Security Best Practices

## Resumo Executivo

Este documento descreve as práticas de segurança implementadas no projeto de demonstração de gerenciamento de secrets, abrangendo configurações de segurança da aplicação Fastify, proteção de secrets, logging seguro e recomendações para ambientes de produção. O foco é garantir que secrets nunca sejam expostos em logs, responses ou código-fonte, mantendo princípios de defense-in-depth e security-by-default.

## Introdução e Conceitos

### Princípios de Segurança Aplicados

#### 1. Defense in Depth

Múltiplas camadas de segurança para proteger secrets:

- **Network Layer**: Isolamento de rede via Docker
- **Application Layer**: Security headers, rate limiting, CORS
- **Data Layer**: Criptografia, masking, redaction
- **Code Layer**: Type safety, validação em runtime

#### 2. Security by Default

Configurações seguras por padrão:

- Helmet configurado automaticamente
- Secrets mascarados em todas as responses
- Logging com redaction automática
- Fail-fast em caso de falha de segurança

#### 3. Principle of Least Privilege

Acesso mínimo necessário:

- Aplicação acessa apenas secrets que precisa
- Tokens com permissões restritas (produção)
- Validação explícita de schemas com Zod

#### 4. Zero Trust

Não confiar implicitamente em nenhum dado:

- Validação de todas as inputs
- Validação de secrets carregados
- Health checks antes de operações críticas

### Threat Model

Principais ameaças mitigadas:

1. **Exposição de Secrets**: Via logs, errors, responses
2. **Injection Attacks**: SQL injection, command injection
3. **XSS (Cross-Site Scripting)**: Via Content Security Policy
4. **CSRF (Cross-Site Request Forgery)**: Via CORS e headers
5. **DoS (Denial of Service)**: Via rate limiting
6. **Man-in-the-Middle**: Via HSTS em produção

## Configurações de Segurança da Aplicação

### Helmet - Security Headers

#### Configuração Implementada

```typescript
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Scalar UI
      styleSrc: ["'self'", "'unsafe-inline'"],  // Scalar UI
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
});
```

#### Headers Aplicados

##### 1. Content-Security-Policy (CSP)

Previne XSS attacks controlando fontes de recursos:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  object-src 'none';
  frame-src 'none'
```

**Proteção**:
- Bloqueia scripts de origens não confiáveis
- Previne clickjacking (`frame-src 'none'`)
- Restringe fontes de imagens e estilos

**Trade-off**: `'unsafe-inline'` necessário para Scalar UI (documentação). Em produção sem UI, remover.

##### 2. HTTP Strict Transport Security (HSTS)

Força uso de HTTPS:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Proteção**:
- Previne downgrade attacks HTTP
- Protege cookies de interceptação
- Válido por 1 ano

**Requisito**: Aplicação deve estar disponível via HTTPS.

##### 3. X-Frame-Options

Previne clickjacking:

```
X-Frame-Options: DENY
```

**Proteção**: Previne embedding da página em iframes.

##### 4. X-Content-Type-Options

Previne MIME sniffing:

```
X-Content-Type-Options: nosniff
```

**Proteção**: Browser respeita Content-Type declarado.

##### 5. X-DNS-Prefetch-Control

Desabilita DNS prefetching:

```
X-DNS-Prefetch-Control: off
```

**Proteção**: Previne vazamento de informações via DNS.

### CORS Configuration

#### Desenvolvimento vs Produção

```typescript
await app.register(cors, {
  origin: env.NODE_ENV === 'production' ? false : true,
  credentials: true,
});
```

**Desenvolvimento**:
- `origin: true` - Aceita qualquer origem
- Facilita testes locais

**Produção**:
- `origin: false` - Bloqueia CORS por padrão
- Ou configurar lista explícita de origins permitidas:

```typescript
origin: ['https://app.example.com', 'https://admin.example.com']
```

#### Credentials

```typescript
credentials: true
```

**Significado**: Permite envio de cookies e headers de autenticação.

**Segurança**: Combinar com `origin` restritivo em produção.

### Rate Limiting

#### Configuração

```typescript
await app.register(rateLimit, {
  max: 100,                    // Máximo de requisições
  timeWindow: '15 minutes',    // Janela de tempo
});
```

**Proteção**:
- Previne brute-force attacks
- Mitiga DoS attacks
- Protege recursos computacionais

#### Customização por Rota

Para endpoints sensíveis, configurar limites mais restritivos:

```typescript
fastify.get('/admin/sensitive', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute'
    }
  },
  // handler
});
```

#### IP Whitelisting

Para produção, considerar whitelist de IPs confiáveis:

```typescript
await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
  allowList: ['10.0.0.0/8', '172.16.0.0/12'], // IPs internos
});
```

## Proteção de Secrets

### Masking de Valores

#### Em Responses HTTP

Todas as rotas que retornam informações sobre secrets mascaram valores:

```typescript
// src/modules/demo/demo.routes.ts
const firstValue = fastify.secrets[firstKey];

return {
  example: {
    key: firstKey,
    valueMasked: '***' + String(firstValue).slice(-4), // Mostra apenas últimos 4 caracteres
  }
};
```

**Resultado**:
```json
{
  "valueMasked": "***word" // Para "password"
}
```

#### Em Connection Strings

```typescript
const connectionString = hasPassword
  ? `postgresql://${DATABASE_USER}:***@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`
  : 'not-configured';
```

**Resultado**:
```
postgresql://postgres:***@localhost:5432/app_db
```

### Redaction em Logs

#### Configuração do Logger

```typescript
// src/infra/logger.ts
export const logger = pino({
  redact: {
    paths: [
      // Campos específicos
      'password',
      'token',
      'secret',
      'apiKey',
      'accessToken',
      'refreshToken',

      // Padrões wildcard
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',

      // Secrets específicos
      'DATABASE_PASSWORD',
      'CLOUDFLARE_API_KEY',
      'NEW_RELIC_LICENSE_KEY',

      // Headers HTTP
      'req.headers.authorization',
      'req.headers["x-api-key"]',
    ],
    censor: '***REDACTED***',
  },
});
```

#### Teste de Redaction

```typescript
logger.info('User login', {
  username: 'john',
  password: 'secret123',  // Será redactado
  DATABASE_PASSWORD: 'db_pass',  // Será redactado
});

// Output:
// {"username":"john","password":"***REDACTED***","DATABASE_PASSWORD":"***REDACTED***"}
```

#### Redaction Profunda

Redaction funciona em objetos aninhados:

```typescript
logger.info('Config loaded', {
  database: {
    host: 'localhost',
    password: 'secret',  // Será redactado (*.password)
  },
  api: {
    token: 'abc123',  // Será redactado (*.token)
  }
});
```

### Validação de Secrets

#### Schema Zod para Secrets

```typescript
// src/config/env.ts
export const secretsSchema = z.object({
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.string().regex(/^\d+$/),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(8), // Mínimo 8 caracteres
  DATABASE_NAME: z.string().min(1),
  CLOUDFLARE_API_KEY: z.string().min(1),
  NEW_RELIC_LICENSE_KEY: z.string().min(1),
});
```

**Benefícios**:
- Fail-fast se secrets inválidos
- Garantia de type safety
- Validação de formato (regex para PORT)

#### Validação em Runtime

```typescript
// src/plugins/secrets.plugin.ts
const rawSecrets = await provider.loadSecrets();

try {
  const validatedSecrets = validateSecrets(rawSecrets);
  fastify.decorate('secrets', validatedSecrets);
} catch (error) {
  fastify.log.error('Secret validation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  throw new SecretLoadError('Invalid secrets loaded from provider');
}
```

**Proteção**: Aplicação não inicia com secrets inválidos.

### Armazenamento Seguro

#### .env no .gitignore

Arquivo `.gitignore` deve incluir:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Vault data
vault-data/

# LocalStack data
localstack-data/

# Secrets backups
*.key
*.pem
secrets-backup.json
```

#### .env.example

Fornecer template sem valores sensíveis:

```bash
# .env.example
NODE_ENV=development
PORT=3000

SECRET_PROVIDER=vault

VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=your-vault-token-here
VAULT_SECRET_PATH=secret/data/app-secrets

# AWS/LocalStack
USE_LOCALSTACK=true
AWS_REGION=us-east-1
AWS_SECRET_NAME=app-secrets
```

**Nunca commitar** valores reais.

## Segurança no Código

### TypeScript Strict Mode

#### Configuração tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Benefícios**:
- Previne null/undefined errors
- Detecta código não utilizado
- Garante retornos explícitos

### Prevenção de Injection Attacks

#### SQL Injection

Se usar banco de dados, **sempre** usar parameterized queries:

```typescript
// INSEGURO - Não fazer
const query = `SELECT * FROM users WHERE username = '${username}'`;

// SEGURO - Usar prepared statements
const query = 'SELECT * FROM users WHERE username = $1';
const result = await db.query(query, [username]);
```

#### Command Injection

Evitar executar comandos shell com input do usuário:

```typescript
// INSEGURO - Não fazer
import { exec } from 'child_process';
exec(`ls ${userInput}`);

// SEGURO - Usar bibliotecas específicas
import { readdir } from 'fs/promises';
const files = await readdir(userInput);
```

### Input Validation com Zod

#### Validação de Request

```typescript
const RequestSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

fastify.post('/user', {
  schema: {
    body: RequestSchema,
  },
}, async (request, reply) => {
  // request.body é type-safe e validado
});
```

**Proteção**: Rejeita inputs maliciosos antes de processamento.

#### Sanitização de Strings

```typescript
import { escape } from 'validator';

const sanitized = escape(userInput); // Escapa HTML characters
```

## Segurança em Docker

### Network Isolation

```yaml
networks:
  secrets-net:
    driver: bridge
```

**Proteção**:
- Vault e LocalStack em rede isolada
- Não acessíveis de outras redes Docker

### Least Privilege Containers

#### Vault Container

```yaml
cap_add:
  - IPC_LOCK  # Apenas capability necessária
```

**IPC_LOCK**: Permite Vault usar mlock para prevenir swapping de secrets para disco.

#### Read-only Filesystem

Para produção, considerar:

```yaml
vault:
  read_only: true
  tmpfs:
    - /tmp
```

**Proteção**: Previne modificação de binários do container.

### Secrets em Docker

**Nunca** passar secrets via environment variables no docker-compose para produção:

```yaml
# INSEGURO para produção
environment:
  - DATABASE_PASSWORD=secret123

# SEGURO - Usar Docker secrets
secrets:
  - db_password

secrets:
  db_password:
    external: true
```

## Auditoria e Monitoring

### Structured Logging

#### Log de Operações Críticas

```typescript
// Carregamento de secrets
fastify.log.info('Secrets loaded successfully', {
  provider: env.SECRET_PROVIDER,
  count: Object.keys(secrets).length,
  // Nunca logar valores dos secrets
});

// Acesso a secrets
fastify.log.debug('Secret accessed', {
  key: 'DATABASE_PASSWORD',
  // Nunca logar o valor
});
```

#### Logs de Segurança

```typescript
// Falha de autenticação
fastify.log.warn('Authentication failed', {
  ip: request.ip,
  path: request.url,
  timestamp: new Date().toISOString(),
});

// Rate limit excedido
fastify.log.warn('Rate limit exceeded', {
  ip: request.ip,
  limit: 100,
});
```

### Health Checks

#### Verificação de Provider

```typescript
const isHealthy = await provider.healthCheck();
if (!isHealthy) {
  fastify.log.error('Provider health check failed', {
    provider: provider.name,
  });
  throw new ProviderInitError('Provider is not healthy');
}
```

#### Endpoint de Health

```typescript
fastify.get('/health', async (request, reply) => {
  const secretsLoaded = !!fastify.secrets && Object.keys(fastify.secrets).length > 0;

  return {
    status: secretsLoaded ? 'healthy' : 'unhealthy',
    secretsLoaded,
    provider: env.SECRET_PROVIDER,
  };
});
```

**Uso**: Integração com load balancers e orchestrators.

### Alertas

Para produção, configurar alertas para:

1. **Falha de Health Check**: Provider indisponível
2. **Rate Limit Excedido**: Possível ataque
3. **Secrets Inválidos**: Problema de configuração
4. **Erros Repetidos**: Problema de integração

## Checklist de Segurança

### Desenvolvimento

- [ ] `.env` no `.gitignore`
- [ ] Usar secrets de exemplo (não reais)
- [ ] Helmet configurado
- [ ] CORS permissivo (desenvolvimento apenas)
- [ ] Rate limiting configurado
- [ ] Logging com redaction
- [ ] TypeScript strict mode
- [ ] Validação Zod em todas as inputs

### Staging

- [ ] CORS restritivo
- [ ] HTTPS obrigatório
- [ ] Secrets reais em provider seguro (Vault/AWS)
- [ ] Logs estruturados enviados para agregador
- [ ] Health checks configurados
- [ ] Rate limiting ajustado para carga esperada
- [ ] Testes de segurança (OWASP ZAP, etc.)

### Produção

- [ ] HSTS habilitado
- [ ] CSP sem `'unsafe-inline'` (se possível)
- [ ] CORS com whitelist explícita
- [ ] Rate limiting por IP e por token
- [ ] Vault em modo produção (HA, TLS, auto-unseal)
- [ ] IAM roles (AWS) ao invés de access keys
- [ ] Rotação automática de secrets
- [ ] Auditoria contínua (CloudTrail, Vault audit)
- [ ] Monitoring e alertas 24/7
- [ ] Backups regulares de secrets
- [ ] Disaster recovery plan
- [ ] Incident response plan
- [ ] Penetration testing regular

## Boas Práticas

### Rotação de Secrets

#### Frequência Recomendada

| Tipo de Secret | Frequência |
|----------------|------------|
| Database passwords | 90 dias |
| API keys | 180 dias |
| TLS certificates | 365 dias |
| Root tokens | Nunca usar em produção |
| Service tokens | 30 dias |

#### Processo de Rotação

1. **Gerar novo secret** no provider
2. **Atualizar aplicação** para usar novo secret
3. **Verificar funcionamento**
4. **Invalidar secret antigo** após período de grace

#### Rotação Zero-Downtime

```typescript
// Suportar múltiplas credenciais simultaneamente
const passwords = [
  secrets.DATABASE_PASSWORD_CURRENT,
  secrets.DATABASE_PASSWORD_PREVIOUS, // Para período de transição
];

// Tentar conexão com cada uma
for (const password of passwords) {
  try {
    await connectDatabase({ password });
    break;
  } catch (error) {
    continue;
  }
}
```

### Separação de Ambientes

#### Paths Distintos

**Vault**:
```
secret/data/production/app-secrets
secret/data/staging/app-secrets
secret/data/development/app-secrets
```

**AWS Secrets Manager**:
```
production/app-secrets
staging/app-secrets
development/app-secrets
```

#### Configuração por Ambiente

```bash
# .env.production
SECRET_PROVIDER=vault
VAULT_SECRET_PATH=secret/data/production/app-secrets

# .env.staging
SECRET_PROVIDER=vault
VAULT_SECRET_PATH=secret/data/staging/app-secrets

# .env.development
SECRET_PROVIDER=localstack
```

### Princípio do Menor Privilégio

#### Vault Policies

```hcl
# app-production-policy.hcl
path "secret/data/production/app-secrets" {
  capabilities = ["read"]
}

# Negar acesso a outros ambientes
path "secret/data/staging/*" {
  capabilities = ["deny"]
}

path "secret/data/development/*" {
  capabilities = ["deny"]
}
```

#### AWS IAM Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/app-secrets-*"
    },
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:staging/*"
    }
  ]
}
```

### Auditoria Regular

#### Revisão de Acesso

1. **Mensal**: Revisar quem tem acesso a secrets
2. **Trimestral**: Revisar logs de acesso
3. **Anual**: Penetration testing completo

#### Logs a Revisar

1. **Vault Audit Logs**: Quem acessou quais secrets
2. **AWS CloudTrail**: API calls para Secrets Manager/SSM
3. **Application Logs**: Erros de carregamento de secrets
4. **Security Logs**: Rate limiting, autenticação falhada

## Compliance e Regulamentações

### LGPD (Lei Geral de Proteção de Dados)

Requisitos para dados sensíveis:

- [ ] Criptografia em trânsito (TLS)
- [ ] Criptografia em repouso (KMS)
- [ ] Logs de acesso (auditoria)
- [ ] Controle de acesso granular
- [ ] Retention policy definida

### PCI DSS (Payment Card Industry)

Para aplicações que lidam com pagamentos:

- [ ] Secrets nunca armazenados em plain text
- [ ] Rotação regular de credenciais
- [ ] Logging e monitoring de acesso
- [ ] Segregação de ambientes
- [ ] Encryption de dados sensíveis

### SOC 2

Controles de segurança:

- [ ] Controle de acesso baseado em roles
- [ ] Auditoria contínua
- [ ] Incident response plan
- [ ] Backup e disaster recovery
- [ ] Vulnerability management

## Conclusões

### Segurança é um Processo

Segurança não é uma feature única, mas um processo contínuo:

1. **Design**: Security by default desde o início
2. **Implementação**: Seguir best practices
3. **Testing**: Testes de segurança regulares
4. **Monitoring**: Detecção de anomalias
5. **Response**: Plano de resposta a incidentes
6. **Improvement**: Iteração contínua

### Defense in Depth Funciona

Múltiplas camadas de segurança garantem que falha em uma camada não comprometa todo sistema.

### Educação é Fundamental

Toda equipe deve entender:

- Por que secrets não devem ser commitados
- Como usar providers de secrets
- Quando rotar secrets
- Como responder a incidentes

## Referências Bibliográficas

1. OWASP. (2024). OWASP Top Ten. https://owasp.org/www-project-top-ten/
2. NIST. (2024). NIST Cybersecurity Framework. https://www.nist.gov/cyberframework
3. HashiCorp. (2024). Vault Security Model. https://developer.hashicorp.com/vault/docs/internals/security
4. AWS. (2024). Security Best Practices. https://docs.aws.amazon.com/security/
5. Fastify. (2024). Security Best Practices. https://fastify.dev/docs/latest/Guides/Security/
6. Helmet. (2024). Helmet Documentation. https://helmetjs.github.io/

## Apêndice

### Glossário e Termos Técnicos

- **CSP (Content Security Policy)**: Header HTTP que previne XSS
- **CSRF (Cross-Site Request Forgery)**: Ataque que força usuário a executar ações não intencionadas
- **Defense in Depth**: Estratégia de múltiplas camadas de segurança
- **DoS (Denial of Service)**: Ataque que torna serviço indisponível
- **HSTS (HTTP Strict Transport Security)**: Header que força HTTPS
- **Least Privilege**: Princípio de conceder apenas permissões necessárias
- **Masking**: Ocultação parcial de dados sensíveis
- **MITM (Man-in-the-Middle)**: Interceptação de comunicação
- **Redaction**: Remoção completa de dados sensíveis em logs
- **Security by Default**: Configurações seguras por padrão
- **SQL Injection**: Injeção de código SQL malicioso
- **XSS (Cross-Site Scripting)**: Injeção de scripts maliciosos em páginas web
- **Zero Trust**: Modelo de segurança que não confia implicitamente em nada
