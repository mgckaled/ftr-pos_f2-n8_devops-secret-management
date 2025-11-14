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

## Vault/Secrets Manager vs Arquivo .env

### Visão Geral

Este projeto demonstra a migração de gerenciamento de secrets tradicional (arquivo `.env`) para soluções profissionais (HashiCorp Vault e AWS Secrets Manager). Compreender as diferenças é fundamental para decisões arquiteturais em produção.

### Arquivo .env: Abordagem Tradicional

#### Como Funciona

```bash
# .env (arquivo em texto plano no servidor)
DATABASE_PASSWORD=senha_super_secreta_123
API_KEY=sk_live_AbCdEf123456
JWT_SECRET=meu_segredo_jwt
```

Aplicação lê diretamente do disco:

```typescript
import dotenv from 'dotenv';
dotenv.config();

const password = process.env.DATABASE_PASSWORD; // Texto plano
```

#### Problemas de Segurança

##### 1. Armazenamento em Texto Plano

```bash
# Qualquer pessoa com acesso ao servidor pode ler
$ cat .env
DATABASE_PASSWORD=senha_super_secreta_123

# Secrets ficam expostos no filesystem
$ grep -r "DATABASE_PASSWORD" /app/
```

**Risco**: Comprometimento total se servidor for invadido.

##### 2. Versionamento Acidental

```bash
# Desenvolvedor esquece de adicionar ao .gitignore
$ git add .
$ git commit -m "fix: bug"
$ git push

# Agora secrets estão no histórico do Git PERMANENTEMENTE
# Mesmo após deletar o arquivo, secrets ficam no histórico
```

**Mitigação**: Requer disciplina manual e ferramentas como git-secrets.

##### 3. Ausência de Auditoria

```typescript
// Impossível saber:
// - Quem acessou DATABASE_PASSWORD?
// - Quando foi acessado?
// - Quantas vezes foi usado?
// - Por qual aplicação/usuário?
```

**Impacto**: Violação de compliance (SOC2, PCI-DSS, HIPAA).

##### 4. Rotação Manual de Secrets

```bash
# Processo para trocar senha do banco:
# 1. Atualizar senha no banco de dados
# 2. Editar .env em TODOS os servidores
# 3. Restart da aplicação (downtime)
# 4. Orar para não ter esquecido nenhum servidor
```

**Problema**: Downtime inevitável, propenso a erros humanos.

##### 5. Sem Controle de Acesso Granular

```bash
# Problema: Junior developer precisa acessar servidor
# Consequência: Ganha acesso a TODOS os secrets

$ ssh production-server
$ cat .env  # Agora tem acesso a API keys de produção
```

**Risco**: Violação do Principle of Least Privilege.

##### 6. Distribuição Manual

```bash
# DevOps precisa:
# 1. Criar .env manualmente para cada ambiente
# 2. Copiar via SSH/FTP para cada servidor
# 3. Compartilhar via Slack/Email (INSEGURO!)
# 4. Manter sincronizado entre 10+ servidores
```

**Problema**: Não escala, propenso a inconsistências.

##### 7. Sem Versionamento de Secrets

```bash
# Alguém sobrescreve .env
$ echo "DATABASE_PASSWORD=nova_senha" > .env

# Senha antiga perdida para sempre
# Rollback impossível
```

### HashiCorp Vault: Solução Profissional

#### Arquitetura de Segurança

```
┌─────────────┐
│  Aplicação  │
└──────┬──────┘
       │ 1. Autentica com token/AppRole
       ↓
┌─────────────────────────────────────────┐
│           HashiCorp Vault               │
│  ┌───────────────────────────────────┐  │
│  │   Encryption at Rest (AES-256)    │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Access Control Lists (ACLs)     │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Audit Logging (Immutable)       │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Secret Versioning               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
       │ 2. TLS/HTTPS obrigatório
       ↓
┌──────────────┐
│   Secrets    │ (criptografados, nunca tocam o disco da app)
└──────────────┘
```

#### Vantagens de Segurança

##### 1. Criptografia em Repouso e Trânsito

```typescript
// Secrets NUNCA existem em texto plano
// - Criptografados no disco do Vault (AES-256-GCM)
// - Transmitidos via TLS 1.3
// - Descriptografados apenas na memória da aplicação

const secrets = await vault.read('secret/data/app-secrets');
// secrets.data nunca toca o disco
```

**Benefício**: Mesmo com acesso físico ao servidor do Vault, secrets são ilegíveis.

##### 2. Controle de Acesso Granular (ACL Policies)

```hcl
# policy-app-readonly.hcl
# Aplicação pode APENAS ler seus próprios secrets
path "secret/data/app-secrets" {
  capabilities = ["read"]
}

# policy-devops-admin.hcl
# DevOps pode gerenciar todos os secrets
path "secret/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# policy-developer.hcl
# Desenvolvedor NÃO tem acesso a secrets de produção
path "secret/data/production/*" {
  capabilities = ["deny"]
}
```

**Benefício**: Principle of Least Privilege aplicado automaticamente.

##### 3. Auditoria Completa e Imutável

```json
// Exemplo de log de auditoria (logs/audit.log)
{
  "time": "2025-01-14T18:30:45.123Z",
  "type": "request",
  "auth": {
    "token_type": "service",
    "display_name": "app-production"
  },
  "request": {
    "operation": "read",
    "path": "secret/data/app-secrets"
  },
  "response": {
    "status": 200
  }
}
```

**Benefício**: Compliance (SOC2, PCI-DSS), forense após incidentes.

##### 4. Rotação Automática de Secrets

```typescript
// Dynamic Database Credentials
// Vault gera credenciais sob demanda, expira automaticamente
const dbCreds = await vault.read('database/creds/app-role');

// Retorno:
// {
//   username: 'v-app-prod-8h9j2k',  // Gerado dinamicamente
//   password: 'A1b2C3d4...',        // Senha aleatória
//   ttl: 86400                      // Expira em 24h
// }

// Após 24h, credenciais expiram automaticamente
// Nova requisição gera novas credenciais
```

**Benefício**: Zero-downtime rotation, reduz janela de exposição.

##### 5. Versionamento de Secrets

```bash
# Vault mantém histórico de todas as versões
$ vault kv get -version=1 secret/app-secrets  # Versão antiga
$ vault kv get -version=2 secret/app-secrets  # Versão atual

# Rollback instantâneo se nova versão causar problemas
$ vault kv rollback -version=1 secret/app-secrets
```

**Benefício**: Disaster recovery, rollback sem downtime.

##### 6. Secrets Dinâmicos

```typescript
// AWS Credentials geradas sob demanda
const awsCreds = await vault.read('aws/creds/deploy-role');

// Vault:
// 1. Conecta na AWS via IAM
// 2. Cria usuário temporário
// 3. Atribui permissões mínimas
// 4. Retorna access_key + secret_key
// 5. Revoga automaticamente após TTL

// access_key: AKIAIOSFODNN7EXAMPLE (válido por 1h)
// secret_key: wJalrXUtnFEMI/K7MDENG... (válido por 1h)
```

**Benefício**: Eliminação de credenciais long-lived.

##### 7. Centralização Multi-Ambiente

```bash
# Mesmo Vault, secrets isolados por namespace
secret/
├── development/
│   └── app-secrets (sem restrições)
├── staging/
│   └── app-secrets (acesso via CI/CD)
└── production/
    └── app-secrets (acesso restrito, auditado)
```

**Benefício**: Single source of truth, gerenciamento centralizado.

### AWS Secrets Manager: Alternativa Gerenciada

#### Vantagens Adicionais sobre Vault

##### 1. Gerenciamento Zero

```typescript
// Sem infraestrutura para manter:
// - Sem servidores Vault para patching
// - Sem backups para configurar
// - Sem HA/clustering para implementar

// AWS cuida de tudo
const client = new SecretsManagerClient({ region: 'us-east-1' });
const secret = await client.send(
  new GetSecretValueCommand({ SecretId: 'app-secrets' })
);
```

**Benefício**: Reduz operational overhead.

##### 2. Integração Nativa AWS

```typescript
// Rotação automática de RDS credentials
const secretConfig = {
  Name: 'rds-credentials',
  RotationLambdaARN: 'arn:aws:lambda:...',
  RotationRules: {
    AutomaticallyAfterDays: 30  // Rotação a cada 30 dias
  }
};

// AWS Lambda automaticamente:
// 1. Gera nova senha no RDS
// 2. Atualiza secret no Secrets Manager
// 3. Testa nova credencial
// 4. Marca versão antiga como deprecated
```

**Benefício**: Zero-touch rotation para serviços AWS.

##### 3. Replicação Multi-Region

```typescript
// Secrets replicados automaticamente
const secret = {
  Name: 'global-api-key',
  ReplicaRegions: [
    { Region: 'us-east-1' },
    { Region: 'eu-west-1' },
    { Region: 'ap-southeast-1' }
  ]
};

// Aplicação em qualquer região acessa localmente
// Latência < 10ms, alta disponibilidade
```

**Benefício**: Global deployment sem complexidade.

### Tabela Comparativa

| Característica | .env | Vault | AWS Secrets Manager |
|---|---|---|---|
| **Criptografia at Rest** | ❌ Texto plano | ✅ AES-256-GCM | ✅ AWS KMS (AES-256) |
| **Criptografia in Transit** | ❌ Depende da app | ✅ TLS obrigatório | ✅ TLS obrigatório |
| **Controle de Acesso (ACL)** | ❌ Nenhum | ✅ Granular (policies) | ✅ IAM policies |
| **Auditoria** | ❌ Nenhuma | ✅ Logs imutáveis | ✅ CloudTrail integration |
| **Rotação de Secrets** | ❌ Manual | ✅ Automática (opcional) | ✅ Automática (nativa) |
| **Versionamento** | ❌ Nenhum | ✅ Histórico completo | ✅ Versões com labels |
| **Secrets Dinâmicos** | ❌ Não | ✅ Sim (DB, AWS, SSH) | ⚠️ Parcial (RDS only) |
| **Multi-Cloud** | ✅ Qualquer | ✅ Qualquer | ❌ AWS only |
| **Custo Operacional** | ✅ Zero | ⚠️ Médio (self-hosted) | ✅ Baixo (managed) |
| **Custo Financeiro** | ✅ Gratuito | ✅ Gratuito (OSS) | ⚠️ $0.40/secret/mês |
| **Compliance** | ❌ Não atende | ✅ SOC2, PCI-DSS | ✅ SOC2, PCI-DSS, HIPAA |
| **Complexidade Setup** | ✅ Trivial | ⚠️ Média | ✅ Baixa |
| **Disaster Recovery** | ❌ Manual | ✅ Backups criptografados | ✅ Automated backups |
| **Latência** | ✅ <1ms (local) | ⚠️ ~10ms (network) | ⚠️ ~15ms (network) |

### Quando Usar Cada Abordagem

#### Arquivo .env: Casos de Uso Aceitáveis

```bash
# ✅ Desenvolvimento local individual
NODE_ENV=development
LOG_LEVEL=debug

# ✅ Configurações não-sensíveis
API_BASE_URL=https://api.example.com
FEATURE_FLAG_NEW_UI=true

# ✅ Protótipos/MVPs (NUNCA produção)
DATABASE_URL=postgres://localhost/dev_db
```

**Regra**: Se pode ser público no GitHub, pode estar no .env.

#### HashiCorp Vault: Ideal Para

```hcl
# ✅ Multi-cloud deployments
# ✅ On-premise + cloud híbrido
# ✅ Necessidade de dynamic secrets
# ✅ Compliance rigoroso (banking, healthcare)
# ✅ Secrets para infraestrutura (Terraform, Ansible)
# ✅ Microsserviços com centenas de secrets
# ✅ Equipe DevOps experiente
```

#### AWS Secrets Manager: Ideal Para

```typescript
// ✅ Workloads 100% na AWS
// ✅ Integração com RDS, DocumentDB, Redshift
// ✅ Time pequeno (sem expertise em Vault)
// ✅ Prioridade: baixo operational overhead
// ✅ Orçamento para custos de managed service
// ✅ Multi-region deployments na AWS
```

### Migração Segura de .env para Vault/Secrets Manager

#### Passo 1: Inventário de Secrets

```bash
# Identificar todos os secrets no .env
$ grep -E "PASSWORD|SECRET|KEY|TOKEN" .env

DATABASE_PASSWORD=...
JWT_SECRET=...
API_KEY=...
```

#### Passo 2: Categorização

```typescript
// Categorizar por sensibilidade e rotação
const secretsInventory = {
  highSensitivity: [
    'DATABASE_PASSWORD',      // Rotação: 30 dias
    'JWT_SECRET',             // Rotação: 90 dias
    'PAYMENT_API_KEY'         // Rotação: manual
  ],
  mediumSensitivity: [
    'CLOUDFLARE_API_KEY',     // Rotação: 180 dias
    'SENDGRID_API_KEY'        // Rotação: manual
  ],
  lowSensitivity: [
    'LOG_LEVEL',              // Não é secret, mover para config
    'API_BASE_URL'            // Não é secret, mover para config
  ]
};
```

#### Passo 3: Migração Gradual

```typescript
// Fase 1: Dual-mode (fallback para .env)
const getSecret = async (key: string) => {
  try {
    // Tenta buscar no Vault primeiro
    const vaultSecret = await vault.read(`secret/data/${key}`);
    return vaultSecret.data.data[key];
  } catch (error) {
    // Fallback para .env (temporário)
    logger.warn(`Fallback to .env for ${key}`);
    return process.env[key];
  }
};

// Fase 2: Apenas Vault (após validação)
const getSecret = async (key: string) => {
  const vaultSecret = await vault.read(`secret/data/${key}`);
  if (!vaultSecret.data.data[key]) {
    throw new Error(`Secret ${key} not found in Vault`);
  }
  return vaultSecret.data.data[key];
};
```

#### Passo 4: Validação e Rollback Plan

```bash
# 1. Deploy em staging com Vault
# 2. Testes de integração completos
# 3. Monitorar por 48h
# 4. Se problemas: rollback para .env
# 5. Se sucesso: deploy em produção

# Rollback plan:
$ git revert <commit-vault-migration>
$ kubectl rollout undo deployment/app
```

### Conclusão: Por Que Migrar?

#### Benefícios Quantificáveis

```
Incidente de Segurança com .env:
- Custo médio de data breach: $4.45M (IBM, 2023)
- Downtime durante rotação: 2-4 horas
- Tempo para identificar comprometimento: 280 dias (média)

Com Vault/Secrets Manager:
- Auditoria em tempo real: identificação em minutos
- Rotação sem downtime: 0 horas
- Auto-revogação: limita janela de exposição para horas (não meses)

ROI = (Custo de breach evitado - Custo de implementação) / Custo de implementação
ROI = ($4.45M - $50k) / $50k = 8,800% ao longo de 5 anos
```

#### Imperativo de Compliance

```
Regulamentações que EXIGEM secrets management adequado:
- PCI-DSS 3.2.1: Requirement 8 (Access Control)
- SOC 2 Type II: CC6.1, CC6.6, CC6.7
- HIPAA: §164.312(a)(2)(i) (Access Control)
- GDPR: Article 32 (Security of Processing)

Multas por não-compliance:
- PCI-DSS: Até $500k por incidente
- GDPR: Até 4% do revenue global anual
- HIPAA: Até $1.5M por ano
```

**Conclusão**: Vault/Secrets Manager não é luxo, é necessidade para qualquer aplicação profissional.

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
