<!-- markdownlint-disable -->

# Bloco A - HashiCorp Vault: Gerenciamento de Segredos em DevOps

## 1. Resumo Executivo

O gerenciamento seguro de informações sensíveis representa um dos pilares fundamentais na construção de aplicações modernas e resilientes. O Bloco A aborda a implementação do HashiCorp Vault como solução centralizada para o armazenamento, controle de acesso e gerenciamento de segredos em ambientes de desenvolvimento e produção. O conteúdo apresenta desde conceitos fundamentais até a integração prática com aplicações Node.js, explorando a engine KV (Key-Value) versão 2, políticas de acesso (ACL), autenticação via token e boas práticas de segurança no ciclo de vida de secrets.

A disciplina demonstra a evolução do tratamento de informações sensíveis, partindo de arquivos `.env` até soluções enterprise-grade como o Vault, estabelecendo uma base sólida para arquiteturas que priorizam segurança, auditabilidade e conformidade com padrões de mercado.

## 2. Introdução e Conceitos

### 2.1. O Problema do Gerenciamento de Segredos

Em ambientes de desenvolvimento e produção, aplicações dependem de informações sensíveis para funcionar adequadamente. Essas informações incluem:

- Credenciais de acesso a bancos de dados (usuário, senha, strings de conexão)
- Chaves de API para serviços externos (AWS Access Keys, CloudFlare tokens)
- Certificados digitais e chaves privadas
- Tokens de autenticação e autorização
- Chaves de criptografia

Tradicionalmente, desenvolvedores utilizam arquivos `.env` para gerenciar essas variáveis de ambiente. Embora essa abordagem resolva problemas básicos como evitar hardcoding de credenciais no código-fonte e permitir configurações multiambiente (development, staging, production), ela apresenta limitações críticas de segurança:

1. **Exposição em Repositórios**: Arquivos `.env` podem ser inadvertidamente versionados em sistemas de controle como Git, expondo segredos publicamente.
2. **Falta de Auditoria**: Não há registro de quem acessou ou modificou determinado segredo.
3. **Ausência de Rotação Automatizada**: Credenciais permanecem estáticas, aumentando o risco em caso de comprometimento.
4. **Controle de Acesso Limitado**: Não existe granularidade no controle de quem pode acessar quais segredos.
5. **Armazenamento em Texto Claro**: Informações ficam disponíveis em texto plano nos servidores.

### 2.2. HashiCorp Vault: Visão Geral

O HashiCorp Vault é uma ferramenta open-source desenvolvida pela HashiCorp (mesma empresa responsável por Terraform, Nomad, Consul, Packer e Vagrant) para gerenciamento centralizado de segredos e proteção de dados sensíveis. O Vault oferece:

- **Armazenamento Criptografado**: Todos os dados são criptografados em repouso e em trânsito.
- **Secrets Dinâmicos**: Geração de credenciais temporárias com tempo de vida (TTL) configurável.
- **Rotação Automatizada**: Capacidade de rotacionar credenciais automaticamente.
- **Controle de Acesso Granular**: Políticas (ACL) baseadas em paths e capabilities.
- **Auditoria Completa**: Logs detalhados de todas as operações.
- **Múltiplos Métodos de Autenticação**: Token, JWT, LDAP, Kubernetes, AWS IAM, entre outros.

O Vault está disponível em duas modalidades:

1. **Open Source**: Versão gratuita com funcionalidades essenciais.
2. **Enterprise/HCP (HashiCorp Cloud Platform)**: Versão paga com recursos avançados como replicação, disaster recovery e suporte empresarial.

### 2.3. Arquitetura e Conceitos-Chave

#### 2.3.1. Secrets Engines

Secrets Engines são componentes que armazenam, geram ou criptografam dados. Cada engine é montada em um path específico e possui funcionalidades distintas:

- **KV (Key-Value)**: Armazenamento de pares chave-valor. Disponível nas versões v1 (sem versionamento) e v2 (com versionamento).
- **PKI**: Geração de certificados X.509.
- **Database**: Geração dinâmica de credenciais de banco de dados.
- **AWS/Azure/GCP**: Geração de credenciais temporárias para provedores de nuvem.
- **Transit**: Criptografia como serviço (encryption-as-a-service).

#### 2.3.2. Políticas de Acesso (ACL)

O Vault utiliza políticas baseadas em HCL (HashiCorp Configuration Language) ou JSON para definir permissões. As capabilities (capacidades) incluem:

- `create`: Criar novos dados.
- `read`: Ler dados existentes.
- `update`: Atualizar dados existentes.
- `delete`: Remover dados.
- `list`: Listar chaves em um path.
- `patch`: Modificar parcialmente dados (KV v2).

Exemplo de política ACL:

```hcl
path "secret/data/widget-server/*" {
  capabilities = ["read"]
}

path "secret/metadata/widget-server/*" {
  capabilities = ["list"]
}
```

#### 2.3.3. Autenticação e Tokens

O Vault suporta múltiplos métodos de autenticação. O mais básico é o token-based authentication:

- **Root Token**: Token de superusuário criado durante a inicialização do Vault. Deve ser usado apenas para configuração inicial.
- **Service Tokens**: Tokens gerados para aplicações e serviços, com permissões limitadas por políticas.
- **Batch Tokens**: Tokens leves e descartáveis, ideais para operações de alta escala.

#### 2.3.4. KV Secrets Engine v2

A engine KV v2 oferece versionamento de segredos, permitindo:

- Armazenar múltiplas versões de um mesmo segredo.
- Soft delete: Marcar versões como deletadas sem remover permanentemente.
- Rollback: Reverter para versões anteriores.
- Configuração de TTL (Time-To-Live) e número máximo de versões.

A estrutura de paths na KV v2 segue o padrão:

- **Data Path**: `/secret/data/<path>` - Para operações de leitura e escrita.
- **Metadata Path**: `/secret/metadata/<path>` - Para operações de listagem e gerenciamento de metadados.

## 3. Implementação Prática com Node.js

### 3.1. Instalação e Configuração do Vault

#### 3.1.1. Opções de Instalação

O Vault pode ser instalado de três formas principais:

1. **Instalação Local**: Download do binário do Vault a partir do site oficial da HashiCorp.
2. **Docker**: Utilização de containers Docker para ambientes de desenvolvimento.
3. **HashiCorp Cloud Platform (HCP)**: Serviço gerenciado na nuvem.

Para ambientes de desenvolvimento, o modo Dev é recomendado:

```bash
vault server -dev
```

O modo Dev apresenta características específicas:

- Vault não é selado (unsealed) automaticamente.
- Root token é exibido no console.
- Dados são armazenados em memória (não persistentes).
- Execução em `http://127.0.0.1:8200`.

#### 3.1.2. Configuração Inicial

Após iniciar o Vault em modo Dev, as seguintes informações são fornecidas:

```bash
Unseal Key: <unseal-key>
Root Token: <root-token>
```

O token root deve ser utilizado para configurar o Vault e criar políticas e tokens adicionais.

### 3.2. Criação de Secrets na Engine KV v2

#### 3.2.1. Interface Web

A interface web do Vault está disponível em `http://127.0.0.1:8200/ui` e permite:

1. Navegação visual pelos secrets engines.
2. Criação de secrets através de formulários.
3. Visualização do histórico de versões.
4. Gerenciamento de políticas de acesso.

#### 3.2.2. Criação via CLI

```bash
# Habilitar KV v2 engine (se não existir)
vault secrets enable -path=secret kv-v2

# Criar um secret
vault kv put secret/widget-server-staging \
  CLOUDFLARE_ACCESS_KEY_ID="<key>" \
  CLOUDFLARE_SECRET_ACCESS_KEY="<secret>" \
  DATABASE_USER="root" \
  DATABASE_PASSWORD="secret123" \
  DATABASE_NAME="widget_server" \
  DATABASE_HOST="localhost" \
  DATABASE_PORT="5432" \
  NEW_RELIC_APP_NAME="Widget Server" \
  NEW_RELIC_LICENSE_KEY="<license>"

# Ler um secret
vault kv get secret/widget-server-staging

# Listar secrets
vault kv list secret/

# Visualizar versões específicas
vault kv get -version=2 secret/widget-server-staging
```

#### 3.2.3. Estrutura de Paths

Para uma aplicação com múltiplos ambientes:

```plaintext
secret/
├── widget-server-development/
│   ├── database credentials
│   ├── api keys
│   └── service tokens
├── widget-server-staging/
│   ├── database credentials
│   ├── api keys
│   └── service tokens
└── widget-server-production/
    ├── database credentials
    ├── api keys
    └── service tokens
```

### 3.3. Integração com Aplicação Node.js

#### 3.3.1. Instalação da Biblioteca node-vault

A biblioteca oficial `node-vault` é mantida pela HashiCorp e fornece interface completa para operações com o Vault:

```bash
pnpm install node-vault
```

Características da biblioteca:

- Suporte a todas as APIs do Vault.
- Métodos para leitura, escrita, atualização e deleção de secrets.
- Suporte a autenticação por token, AppRole, Kubernetes, entre outros.
- Promessas nativas do JavaScript (async/await).

#### 3.3.2. Configuração do Cliente Vault

Criação de arquivo `src/infra/secret.ts`:

```typescript
import vault from 'node-vault';

const SECRET_API_VERSION = process.env.SECRET_API_VERSION || 'v1';
const SECRET_API_ENDPOINT = process.env.SECRET_API_ENDPOINT || 'http://127.0.0.1:8200';
const SECRET_TOKEN = process.env.SECRET_TOKEN || 'root';

const vaultOptions = {
  apiVersion: SECRET_API_VERSION,
  endpoint: SECRET_API_ENDPOINT,
  token: SECRET_TOKEN,
};

const vaultClient = vault(vaultOptions);

export default vaultClient;
```

Justificativas para a estrutura:

1. **Separação de Responsabilidades**: Código de integração isolado do código de negócio.
2. **Configuração Externa**: Parâmetros de conexão através de variáveis de ambiente.
3. **Reutilização**: Cliente único exportado para toda a aplicação.

#### 3.3.3. Leitura de Secrets no Bootstrap da Aplicação

Modificação do arquivo `src/server.ts`:

```typescript
import vault from './infra/secret';
import { logger } from './infra/logger';

async function bootstrap() {
  try {
    // Leitura de secrets do Vault
    const secretPath = 'secret/data/widget-server-staging';
    const response = await vault.read(secretPath);

    // Extração dos dados
    const secrets = response.data.data;

    logger.info('Secrets loaded from Vault', {
      path: secretPath,
      keys: Object.keys(secrets),
    });

    // Injeção no process.env
    Object.entries(secrets).forEach(([key, value]) => {
      process.env[key] = value as string;
    });

    // Inicialização da aplicação
    const app = await createApp();
    const port = process.env.PORT || 3000;

    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });

  } catch (error) {
    logger.error('Failed to bootstrap application', { error });
    process.exit(1);
  }
}

bootstrap();
```

Princípios implementados:

1. **Bootstrap Assíncrono**: Secrets são carregados antes da inicialização da aplicação.
2. **Fail-Fast**: Aplicação não inicia se não conseguir carregar secrets.
3. **Injeção em Memória**: Secrets são injetados no `process.env` para compatibilidade com bibliotecas existentes.
4. **Logging Estruturado**: Registro de operações para auditoria e debugging.

#### 3.3.4. Estrutura de Variáveis de Ambiente

Arquivo `src/config/env.ts`:

```typescript
export const env = {
  cloudflare: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
    bucketName: process.env.CLOUDFLARE_BUCKET_NAME!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    endpoint: process.env.CLOUDFLARE_ENDPOINT!,
  },
  database: {
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT!, 10),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    name: process.env.DATABASE_NAME!,
  },
  newRelic: {
    appName: process.env.NEW_RELIC_APP_NAME!,
    licenseKey: process.env.NEW_RELIC_LICENSE_KEY!,
  },
};
```

Vantagens dessa estrutura:

1. **Type Safety**: TypeScript valida tipos em tempo de compilação.
2. **Centralização**: Ponto único de acesso a variáveis de ambiente.
3. **Validação**: Uso do operador `!` (non-null assertion) garante que variáveis obrigatórias existam.
4. **Organização**: Agrupamento lógico por domínio (cloudflare, database, etc.).

### 3.4. Políticas de Acesso e Segurança

#### 3.4.1. Princípio do Menor Privilégio

Aplicações devem possuir apenas as permissões necessárias para operar. Para uma aplicação que apenas lê secrets:

```hcl
# Política: widget-server-read-only

# Permite leitura de dados
path "secret/data/widget-server-staging/*" {
  capabilities = ["read"]
}

# Permite listagem de metadados
path "secret/metadata/widget-server-staging/*" {
  capabilities = ["list"]
}
```

Aplicação da política:

```bash
# Criar política
vault policy write widget-server-read-only policy.hcl

# Criar token associado à política
vault token create -policy=widget-server-read-only
```

#### 3.4.2. Token Lifecycle Management

Tokens devem possuir tempo de vida limitado:

```bash
# Token com TTL de 1 hora
vault token create \
  -policy=widget-server-read-only \
  -ttl=1h \
  -renewable

# Token com número limitado de usos
vault token create \
  -policy=widget-server-read-only \
  -use-limit=100
```

#### 3.4.3. Configuração de ACL Avançada

Exemplo de política com múltiplas capabilities:

```hcl
# Política para CI/CD pipeline

# Leitura de secrets de staging
path "secret/data/widget-server-staging/*" {
  capabilities = ["read"]
}

# Escrita de secrets de desenvolvimento
path "secret/data/widget-server-development/*" {
  capabilities = ["create", "update", "patch", "read", "delete"]
}

# Listagem de todos os ambientes
path "secret/metadata/*" {
  capabilities = ["list"]
}

# Negação explícita para produção
path "secret/data/widget-server-production/*" {
  capabilities = ["deny"]
}
```

### 3.5. Boas Práticas de Integração

#### 3.5.1. Desacoplamento da Aplicação

A aplicação idealmente não deveria conhecer a existência do Vault. Essa responsabilidade deve ser delegada à camada de infraestrutura:

**Abordagem 1: Init Container (Kubernetes)**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: widget-server
spec:
  initContainers:
  - name: vault-agent
    image: vault:1.15
    command:
    - vault
    - agent
    - -config=/vault/config/agent.hcl
    volumeMounts:
    - name: vault-config
      mountPath: /vault/config
    - name: shared-data
      mountPath: /vault/secrets
  containers:
  - name: application
    image: widget-server:latest
    volumeMounts:
    - name: shared-data
      mountPath: /app/secrets
```

**Abordagem 2: Sidecar Pattern**

Um container auxiliar (sidecar) mantém a conexão com o Vault e injeta secrets dinamicamente:

```yaml
containers:
- name: vault-agent
  image: vault:1.15
  # Configuração do Vault Agent
- name: application
  image: widget-server:latest
  # Aplicação principal
```

**Abordagem 3: Vault Agent Injector (Mutating Webhook)**

Utilização de annotations no Kubernetes para injeção automática:

```yaml
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/agent-inject-secret-database: "secret/data/widget-server-staging"
    vault.hashicorp.com/role: "widget-server"
```

#### 3.5.2. Tratamento de Erros e Resiliência

```typescript
async function loadSecrets(retries = 3, delay = 1000): Promise<Record<string, string>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await vault.read('secret/data/widget-server-staging');
      return response.data.data;
    } catch (error) {
      logger.warn(`Attempt ${attempt} failed to load secrets`, { error });

      if (attempt === retries) {
        logger.error('All attempts to load secrets failed');
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw new Error('Failed to load secrets after all retries');
}
```

#### 3.5.3. Caching e Performance

Evitar chamadas repetitivas ao Vault:

```typescript
class SecretManager {
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private cacheTTL = 60000; // 1 minuto

  async getSecret(key: string): Promise<string> {
    const cached = this.cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const response = await vault.read(`secret/data/widget-server-staging`);
    const value = response.data.data[key];

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTTL,
    });

    return value;
  }
}
```

#### 3.5.4. Rotação de Secrets

Implementação de listener para rotação automática:

```typescript
class SecretRotationManager {
  private rotationInterval = 3600000; // 1 hora

  startRotationWatcher() {
    setInterval(async () => {
      try {
        const newSecrets = await loadSecrets();

        Object.entries(newSecrets).forEach(([key, value]) => {
          process.env[key] = value;
        });

        logger.info('Secrets rotated successfully');
      } catch (error) {
        logger.error('Failed to rotate secrets', { error });
      }
    }, this.rotationInterval);
  }
}
```

### 3.6. Monitoramento e Auditoria

#### 3.6.1. Configuração de Audit Device

O Vault permite habilitar dispositivos de auditoria:

```bash
# Habilitar audit log em arquivo
vault audit enable file file_path=/var/log/vault/audit.log

# Habilitar audit log via syslog
vault audit enable syslog
```

Exemplo de entrada de log:

```json
{
  "time": "2024-01-15T10:30:45.123Z",
  "type": "response",
  "auth": {
    "client_token": "hmac-sha256:...",
    "accessor": "hmac-sha256:...",
    "display_name": "widget-server-token",
    "policies": ["widget-server-read-only", "default"]
  },
  "request": {
    "id": "abc123",
    "operation": "read",
    "path": "secret/data/widget-server-staging",
    "remote_address": "192.168.1.100"
  },
  "response": {
    "status": 200
  }
}
```

#### 3.6.2. Métricas e Observabilidade

Integração com sistemas de monitoramento:

```typescript
import { Counter, Histogram } from 'prom-client';

const vaultRequestCounter = new Counter({
  name: 'vault_requests_total',
  help: 'Total number of Vault requests',
  labelNames: ['operation', 'status'],
});

const vaultRequestDuration = new Histogram({
  name: 'vault_request_duration_seconds',
  help: 'Duration of Vault requests',
  labelNames: ['operation'],
});

async function readSecretWithMetrics(path: string) {
  const startTime = Date.now();

  try {
    const result = await vault.read(path);

    vaultRequestCounter.inc({ operation: 'read', status: 'success' });
    vaultRequestDuration.observe({ operation: 'read' }, (Date.now() - startTime) / 1000);

    return result;
  } catch (error) {
    vaultRequestCounter.inc({ operation: 'read', status: 'error' });
    throw error;
  }
}
```

### 3.7. Alternativas e Comparações

#### 3.7.1. AWS Secrets Manager

Serviço gerenciado pela AWS para armazenamento de secrets:

**Vantagens:**
- Integração nativa com serviços AWS (RDS, Lambda, ECS).
- Rotação automática para bancos de dados RDS.
- Criptografia via AWS KMS.
- Alta disponibilidade gerenciada.

**Desvantagens:**
- Vendor lock-in (específico da AWS).
- Custo por secret armazenado e por requisição.
- Latência adicional em ambientes multi-cloud.

#### 3.7.2. Azure Key Vault

Solução da Microsoft Azure:

**Vantagens:**
- Integração com Active Directory.
- Suporte a HSM (Hardware Security Module).
- Gerenciamento de certificados SSL/TLS.

**Desvantagens:**
- Limitado ao ecossistema Azure.
- Complexidade de configuração de permissões (RBAC + Access Policies).

#### 3.7.3. Google Cloud Secret Manager

Solução do Google Cloud Platform:

**Vantagens:**
- Versionamento automático.
- Integração com Cloud IAM.
- Replicação multi-regional.

**Desvantagens:**
- Menor maturidade comparado a AWS e Azure.
- Vendor lock-in.

#### 3.7.4. Kubernetes Secrets e ConfigMaps

Recursos nativos do Kubernetes:

**Secrets:**
- Armazenamento base64 (não é criptografia real).
- Adequado para ambientes exclusivamente Kubernetes.
- Integração via volumes ou variáveis de ambiente.

**ConfigMaps:**
- Para dados não sensíveis.
- Separação de configuração do código.

**Limitações:**
- Sem rotação automática.
- Criptografia dependente do backend (etcd encryption at rest).
- Sem auditoria granular.

#### 3.7.5. Comparação Resumida

| Característica | Vault | AWS Secrets Manager | Azure Key Vault | GCP Secret Manager | K8s Secrets |
|---|---|---|---|---|---|
| Open Source | Sim | Não | Não | Não | Sim |
| Multi-Cloud | Sim | Não | Não | Não | Sim |
| Secrets Dinâmicos | Sim | Limitado | Limitado | Não | Não |
| Rotação Automática | Sim | Sim (RDS) | Sim | Sim | Não |
| Auditoria | Sim | Sim | Sim | Sim | Limitado |
| Criptografia Transit | Sim | Sim | Sim | Sim | Configurável |
| Custo | Licença (HCP) | Pay-per-use | Pay-per-use | Pay-per-use | Gratuito |

## 4. Conclusões

### 4.1. Principais Aprendizados

O Bloco A estabeleceu fundamentos essenciais para o gerenciamento seguro de segredos em ambientes DevOps:

1. **Evolução das Práticas**: A transição de arquivos `.env` para soluções centralizadas como Vault representa um avanço significativo em segurança, auditabilidade e conformidade.

2. **Princípio de Zero Trust**: O Vault implementa controles de acesso granulares baseados no princípio do menor privilégio, garantindo que cada componente do sistema tenha acesso apenas às informações estritamente necessárias.

3. **Arquitetura Desacoplada**: A separação entre a camada de aplicação e a camada de secrets management através de sidecars, init containers e agents permite maior flexibilidade e portabilidade.

4. **Secrets como Código**: A utilização de políticas ACL versionadas e configurações declarativas permite aplicar práticas de Infrastructure as Code ao gerenciamento de segredos.

5. **Observabilidade e Auditoria**: A capacidade de rastrear todas as operações com secrets fornece visibilidade essencial para conformidade com regulações como GDPR, LGPD, SOC 2 e PCI-DSS.

### 4.2. Impacto na Arquitetura de Aplicações

A adoção do Vault influencia decisões arquiteturais em múltiplas dimensões:

**Segurança:**
- Eliminação de credenciais hardcoded no código-fonte.
- Redução da superfície de ataque através de tokens com TTL.
- Implementação de rotação automática de credenciais.

**Operações:**
- Centralização do gerenciamento de segredos em múltiplos ambientes.
- Simplificação do processo de onboarding de novos serviços.
- Redução de incidentes relacionados a credenciais expostas.

**Conformidade:**
- Auditoria completa de acesso a dados sensíveis.
- Segregação de responsabilidades (separation of duties).
- Criptografia end-to-end de secrets.

### 4.3. Próximos Passos

O conhecimento adquirido no Bloco A serve como base para tópicos avançados:

1. **Integração com Kubernetes**: Utilização de Vault Agent Injector e External Secrets Operator para injeção automática de secrets em pods.

2. **Secrets Dinâmicos**: Configuração de engines como Database, AWS e PKI para geração de credenciais temporárias e certificados on-demand.

3. **Alta Disponibilidade**: Implementação de clusters Vault com backend distribuído (Consul, etcd) e replicação multi-datacenter.

4. **Automação com Terraform**: Provisionamento de políticas, secrets engines e configurações do Vault como código.

5. **Rotação Zero-Downtime**: Implementação de estratégias de rotação de segredos sem interrupção de serviço.

### 4.4. Considerações Finais

O HashiCorp Vault estabelece-se como solução robusta e flexível para gerenciamento de segredos em arquiteturas modernas. Sua capacidade de integração com múltiplos ambientes (on-premises, cloud, hybrid) e suporte a diversos métodos de autenticação o tornam adequado para cenários desde startups até organizações enterprise.

A implementação de Vault em conjunto com práticas DevOps como CI/CD, Infrastructure as Code e Observabilidade cria um ecossistema onde segurança não é um obstáculo, mas sim um enabler para agilidade e inovação.

## 5. Referências Bibliográficas

### 5.1. Documentação Oficial

HASHICORP. **Vault Documentation**. HashiCorp Developer Portal, 2024. Disponível em: https://developer.hashicorp.com/vault/docs. Acesso em: 12 nov. 2024.

HASHICORP. **KV Secrets Engine - Version 2**. HashiCorp Developer Portal, 2024. Disponível em: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2. Acesso em: 12 nov. 2024.

HASHICORP. **Vault Policies**. HashiCorp Developer Portal, 2024. Disponível em: https://developer.hashicorp.com/vault/docs/concepts/policies. Acesso em: 12 nov. 2024.

HASHICORP. **Vault Authentication Methods**. HashiCorp Developer Portal, 2024. Disponível em: https://developer.hashicorp.com/vault/docs/auth. Acesso em: 12 nov. 2024.

### 5.2. Bibliotecas e Ferramentas

HASHICORP. **node-vault: HashiCorp Vault client for Node.js**. NPM Registry, 2024. Disponível em: https://www.npmjs.com/package/node-vault. Acesso em: 12 nov. 2024.

HASHICORP. **Vault Helm Chart**. GitHub, 2024. Disponível em: https://github.com/hashicorp/vault-helm. Acesso em: 12 nov. 2024.

EXTERNAL SECRETS OPERATOR. **External Secrets Operator Documentation**. External Secrets, 2024. Disponível em: https://external-secrets.io. Acesso em: 12 nov. 2024.

### 5.3. Especificações e Padrões

OPEN CONTAINER INITIATIVE. **OCI Runtime Specification**. Open Container Initiative, 2024. Disponível em: https://github.com/opencontainers/runtime-spec. Acesso em: 12 nov. 2024.

KUBERNETES. **Kubernetes Secrets Documentation**. Kubernetes Documentation, 2024. Disponível em: https://kubernetes.io/docs/concepts/configuration/secret/. Acesso em: 12 nov. 2024.

CLOUD NATIVE COMPUTING FOUNDATION. **SPIFFE/SPIRE Documentation**. CNCF Projects, 2024. Disponível em: https://spiffe.io/docs/. Acesso em: 12 nov. 2024.

### 5.4. Segurança e Compliance

OWASP FOUNDATION. **OWASP Top 10 - 2021**. OWASP, 2021. Disponível em: https://owasp.org/Top10/. Acesso em: 12 nov. 2024.

NIST. **NIST Special Publication 800-57: Recommendation for Key Management**. National Institute of Standards and Technology, 2020. Disponível em: https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final. Acesso em: 12 nov. 2024.

CENTER FOR INTERNET SECURITY. **CIS Kubernetes Benchmark**. CIS, 2024. Disponível em: https://www.cisecurity.org/benchmark/kubernetes. Acesso em: 12 nov. 2024.

### 5.5. Provedores de Cloud

AMAZON WEB SERVICES. **AWS Secrets Manager Documentation**. AWS Documentation, 2024. Disponível em: https://docs.aws.amazon.com/secretsmanager/. Acesso em: 12 nov. 2024.

MICROSOFT AZURE. **Azure Key Vault Documentation**. Microsoft Learn, 2024. Disponível em: https://learn.microsoft.com/azure/key-vault/. Acesso em: 12 nov. 2024.

GOOGLE CLOUD. **Secret Manager Documentation**. Google Cloud Documentation, 2024. Disponível em: https://cloud.google.com/secret-manager/docs. Acesso em: 12 nov. 2024.

### 5.6. Artigos e Whitepapers

HASHICORP. **Zero Trust Security with HashiCorp Vault**. HashiCorp Whitepaper, 2023. Disponível em: https://www.hashicorp.com/resources/zero-trust-security. Acesso em: 12 nov. 2024.

HASHICORP. **Dynamic Database Credentials with Vault**. HashiCorp Learn, 2024. Disponível em: https://developer.hashicorp.com/vault/tutorials/db-credentials. Acesso em: 12 nov. 2024.

CLOUD NATIVE COMPUTING FOUNDATION. **Secrets Management in Cloud Native Environments**. CNCF Blog, 2023. Disponível em: https://www.cncf.io/blog/. Acesso em: 12 nov. 2024.

## 6. Apêndices

### Apêndice A: Comandos Essenciais do Vault CLI

#### A.1. Operações com Secrets

```bash
# Escrever secret
vault kv put secret/myapp/config \
  username=admin \
  password=secret123

# Ler secret
vault kv get secret/myapp/config

# Ler versão específica
vault kv get -version=2 secret/myapp/config

# Listar secrets
vault kv list secret/

# Deletar versão específica (soft delete)
vault kv delete secret/myapp/config

# Deletar versões específicas
vault kv delete -versions=1,2 secret/myapp/config

# Recuperar versão deletada
vault kv undelete -versions=1 secret/myapp/config

# Destruir permanentemente
vault kv destroy -versions=1 secret/myapp/config

# Visualizar metadados
vault kv metadata get secret/myapp/config

# Deletar todos os dados e metadados
vault kv metadata delete secret/myapp/config

# Atualizar campos específicos (patch)
vault kv patch secret/myapp/config password=newpassword123
```

#### A.2. Gerenciamento de Políticas

```bash
# Criar política a partir de arquivo
vault policy write my-policy policy.hcl

# Ler política
vault policy read my-policy

# Listar políticas
vault policy list

# Deletar política
vault policy delete my-policy

# Formatar arquivo HCL
vault policy fmt policy.hcl
```

#### A.3. Gerenciamento de Tokens

```bash
# Criar token com política específica
vault token create -policy=my-policy

# Criar token com TTL
vault token create -ttl=1h

# Criar token com número limitado de usos
vault token create -use-limit=10

# Visualizar informações do token atual
vault token lookup

# Visualizar informações de token específico
vault token lookup <token>

# Renovar token
vault token renew

# Revogar token
vault token revoke <token>

# Revogar todos os tokens de uma política
vault token revoke -mode=policy my-policy
```

#### A.4. Secrets Engines

```bash
# Habilitar KV v2
vault secrets enable -version=2 -path=secret kv

# Habilitar KV v1
vault secrets enable -version=1 -path=kv-v1 kv

# Listar engines habilitadas
vault secrets list

# Desabilitar engine
vault secrets disable secret/

# Mover engine para novo path
vault secrets move secret/ newsecret/

# Configurar engine
vault secrets tune -default-lease-ttl=1h secret/
```

#### A.5. Autenticação

```bash
# Login com token
vault login <token>

# Login com método específico
vault login -method=userpass username=myuser

# Logout
vault token revoke -self

# Habilitar método de autenticação
vault auth enable userpass

# Criar usuário
vault write auth/userpass/users/myuser \
  password=mypassword \
  policies=my-policy

# Listar métodos de autenticação
vault auth list
```

### Apêndice B: Exemplos de Políticas ACL

#### B.1. Política Read-Only para Aplicação

```hcl
# read-only-app.hcl
# Política para aplicação com acesso somente leitura

path "secret/data/myapp/*" {
  capabilities = ["read"]
}

path "secret/metadata/myapp/*" {
  capabilities = ["list"]
}
```

#### B.2. Política para CI/CD Pipeline

```hcl
# cicd-policy.hcl
# Política para pipeline de CI/CD

# Leitura de secrets de staging
path "secret/data/staging/*" {
  capabilities = ["read"]
}

# Escrita em ambiente de desenvolvimento
path "secret/data/development/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Negação explícita para produção
path "secret/data/production/*" {
  capabilities = ["deny"]
}

# Acesso ao Transit engine para criptografia
path "transit/encrypt/myapp" {
  capabilities = ["update"]
}

path "transit/decrypt/myapp" {
  capabilities = ["update"]
}
```

#### B.3. Política de Administrador Limitado

```hcl
# admin-limited.hcl
# Administrador com acesso restrito a certos paths

# Gerenciamento completo de secrets
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Gerenciamento de políticas
path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Visualização de audit devices (sem modificação)
path "sys/audit" {
  capabilities = ["read", "list"]
}

# Negação de unseal keys
path "sys/unseal" {
  capabilities = ["deny"]
}

# Negação de modificação de root token
path "auth/token/create-root" {
  capabilities = ["deny"]
}
```

#### B.4. Política com Parâmetros Restritos

```hcl
# restricted-params.hcl
# Política que restringe parâmetros específicos

path "secret/data/database/*" {
  capabilities = ["create", "update", "read"]

  # Somente permite criar secrets com campos específicos
  allowed_parameters = {
    "host" = []
    "port" = ["5432", "3306"]
    "username" = []
    "password" = []
    "database" = []
  }
}

path "secret/data/api-keys/*" {
  capabilities = ["read"]

  # Nega acesso a parâmetros sensíveis específicos
  denied_parameters = {
    "master_key" = []
    "root_password" = []
  }
}
```

#### B.5. Política com Wildcards e Globbing

```hcl
# wildcard-policy.hcl
# Política utilizando padrões de wildcards

# Acesso a todos os ambientes de uma aplicação específica
path "secret/data/myapp/+/database" {
  capabilities = ["read"]
}

# '+' corresponde a um único segmento (e.g., dev, staging, prod)

# Acesso a qualquer nível de hierarquia
path "secret/data/team-a/**" {
  capabilities = ["read", "list"]
}

# '**' corresponde a qualquer número de segmentos
```

#### B.6. Política com Templates

```hcl
# templated-policy.hcl
# Política usando templates para acesso baseado em identidade

# Cada usuário acessa apenas seus próprios secrets
path "secret/data/users/{{identity.entity.name}}/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Acesso baseado em metadados de entidade
path "secret/data/projects/{{identity.entity.metadata.project_id}}/*" {
  capabilities = ["read"]
}

# Acesso baseado em grupos
path "secret/data/groups/{{identity.groups.names.engineering.name}}/*" {
  capabilities = ["read", "list"]
}
```

### Apêndice C: Configurações de Vault Server

#### C.1. Configuração de Desenvolvimento

```hcl
# config-dev.hcl
# Configuração para ambiente de desenvolvimento

ui = true

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}

storage "inmem" {}

disable_mlock = true
```

#### C.2. Configuração de Produção com Consul

```hcl
# config-prod.hcl
# Configuração para produção com backend Consul

ui = true

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/etc/vault/tls/vault.crt"
  tls_key_file  = "/etc/vault/tls/vault.key"
}

storage "consul" {
  address = "consul.service.consul:8500"
  path    = "vault/"
  token   = "${CONSUL_TOKEN}"
}

api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault-node-1.example.com:8201"

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = false
}

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abcd1234-a123-456a-a12b-a123b4cd56ef"
}
```

#### C.3. Configuração com HA (High Availability)

```hcl
# config-ha.hcl
# Configuração para cluster de alta disponibilidade

ui = true

listener "tcp" {
  address     = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file = "/etc/vault/tls/vault.crt"
  tls_key_file  = "/etc/vault/tls/vault.key"
}

storage "raft" {
  path = "/opt/vault/data"
  node_id = "vault-node-1"

  retry_join {
    leader_api_addr = "https://vault-node-2.example.com:8200"
  }

  retry_join {
    leader_api_addr = "https://vault-node-3.example.com:8200"
  }
}

api_addr = "https://vault-node-1.example.com:8200"
cluster_addr = "https://vault-node-1.example.com:8201"

disable_mlock = false
```

### Apêndice D: Scripts de Automação

#### D.1. Script de Inicialização do Vault

```bash
#!/bin/bash
# init-vault.sh
# Script para inicializar e configurar Vault

set -e

VAULT_ADDR="http://127.0.0.1:8200"
VAULT_TOKEN=""

echo "Iniciando Vault..."
vault server -config=/etc/vault/config.hcl &
VAULT_PID=$!

sleep 5

echo "Inicializando Vault..."
INIT_OUTPUT=$(vault operator init -key-shares=5 -key-threshold=3 -format=json)

echo "$INIT_OUTPUT" > /tmp/vault-init.json

VAULT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r '.root_token')
UNSEAL_KEY_1=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[0]')
UNSEAL_KEY_2=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[1]')
UNSEAL_KEY_3=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[2]')

echo "Unsealing Vault..."
vault operator unseal "$UNSEAL_KEY_1"
vault operator unseal "$UNSEAL_KEY_2"
vault operator unseal "$UNSEAL_KEY_3"

export VAULT_TOKEN="$VAULT_TOKEN"

echo "Habilitando KV v2..."
vault secrets enable -version=2 -path=secret kv

echo "Criando políticas..."
vault policy write app-read-only /etc/vault/policies/app-read-only.hcl

echo "Vault inicializado com sucesso!"
echo "Root Token: $VAULT_TOKEN"
echo "IMPORTANTE: Guarde as unseal keys e o root token em local seguro!"
```

#### D.2. Script de Backup

```bash
#!/bin/bash
# backup-vault.sh
# Script para backup de snapshots do Vault

set -e

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
BACKUP_DIR="${BACKUP_DIR:-/backup/vault}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Criando snapshot do Vault..."
vault operator raft snapshot save "${BACKUP_DIR}/vault-snapshot-${TIMESTAMP}.snap"

echo "Comprimindo snapshot..."
gzip "${BACKUP_DIR}/vault-snapshot-${TIMESTAMP}.snap"

echo "Removendo snapshots antigos (mais de 7 dias)..."
find "${BACKUP_DIR}" -name "vault-snapshot-*.snap.gz" -mtime +7 -delete

echo "Backup concluído: vault-snapshot-${TIMESTAMP}.snap.gz"
```

#### D.3. Script de Rotação de Token

```bash
#!/bin/bash
# rotate-token.sh
# Script para rotação automatizada de tokens

set -e

POLICY_NAME="${1:-app-read-only}"
TOKEN_TTL="${2:-24h}"
OUTPUT_FILE="${3:-/etc/app/vault-token}"

echo "Criando novo token com política ${POLICY_NAME}..."
NEW_TOKEN=$(vault token create \
  -policy="${POLICY_NAME}" \
  -ttl="${TOKEN_TTL}" \
  -format=json | jq -r '.auth.client_token')

echo "Atualizando arquivo de token..."
echo "$NEW_TOKEN" > "$OUTPUT_FILE"
chmod 600 "$OUTPUT_FILE"

echo "Revogando token antigo (se existir)..."
if [ -f "${OUTPUT_FILE}.old" ]; then
  OLD_TOKEN=$(cat "${OUTPUT_FILE}.old")
  vault token revoke "$OLD_TOKEN" || true
fi

mv "$OUTPUT_FILE" "${OUTPUT_FILE}.old"
echo "$NEW_TOKEN" > "$OUTPUT_FILE"

echo "Rotação de token concluída!"
```

### Apêndice E: Integração com Docker Compose

#### E.1. Docker Compose para Desenvolvimento

```yaml
# docker-compose.yml
version: '3.8'

services:
  vault:
    image: vault:1.15
    container_name: vault-dev
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: 'root'
      VAULT_DEV_LISTEN_ADDRESS: '0.0.0.0:8200'
    cap_add:
      - IPC_LOCK
    volumes:
      - ./vault/config:/vault/config
      - ./vault/data:/vault/data
      - ./vault/logs:/vault/logs
    command: server -dev

  application:
    build: .
    container_name: widget-server
    depends_on:
      - vault
    environment:
      SECRET_API_ENDPOINT: 'http://vault:8200'
      SECRET_API_VERSION: 'v1'
      SECRET_TOKEN: 'root'
    ports:
      - "3000:3000"
```

#### E.2. Docker Compose com Consul Backend

```yaml
# docker-compose-ha.yml
version: '3.8'

services:
  consul:
    image: consul:1.16
    container_name: consul
    ports:
      - "8500:8500"
    command: agent -server -ui -bootstrap-expect=1 -client=0.0.0.0

  vault:
    image: vault:1.15
    container_name: vault
    ports:
      - "8200:8200"
    depends_on:
      - consul
    environment:
      VAULT_ADDR: 'http://0.0.0.0:8200'
    cap_add:
      - IPC_LOCK
    volumes:
      - ./vault/config/config.hcl:/vault/config/config.hcl
      - ./vault/data:/vault/data
      - ./vault/logs:/vault/logs
    command: server -config=/vault/config/config.hcl
```

### Apêndice F: Configuração de Vault Agent

#### F.1. Configuração de Vault Agent para Injeção de Secrets

```hcl
# vault-agent.hcl
# Configuração do Vault Agent para injeção automática

pid_file = "/var/run/vault-agent.pid"

vault {
  address = "https://vault.example.com:8200"
}

auto_auth {
  method {
    type = "kubernetes"

    config = {
      role = "widget-server"
    }
  }

  sink {
    type = "file"

    config = {
      path = "/vault/secrets/.vault-token"
    }
  }
}

template {
  source      = "/vault/templates/database.tmpl"
  destination = "/vault/secrets/database.env"

  wait {
    min = "2s"
    max = "10s"
  }
}

template {
  source      = "/vault/templates/api-keys.tmpl"
  destination = "/vault/secrets/api-keys.env"
}
```

#### F.2. Template de Secrets

```tmpl
{{/* database.tmpl */}}
{{- with secret "secret/data/widget-server-production" }}
DATABASE_HOST={{ .Data.data.DATABASE_HOST }}
DATABASE_PORT={{ .Data.data.DATABASE_PORT }}
DATABASE_USER={{ .Data.data.DATABASE_USER }}
DATABASE_PASSWORD={{ .Data.data.DATABASE_PASSWORD }}
DATABASE_NAME={{ .Data.data.DATABASE_NAME }}
{{- end }}
```

### Apêndice G: Glossário e Termos Técnicos

**ACL (Access Control List)**: Lista de controle de acesso que define permissões granulares para recursos específicos no Vault.

**Agent**: Daemon do Vault que roda em background para automatizar autenticação e gerenciamento de secrets.

**Audit Device**: Componente que registra todas as requisições e respostas do Vault para fins de auditoria.

**Authentication Method**: Método de verificação de identidade suportado pelo Vault (token, LDAP, Kubernetes, etc.).

**Backend**: Sistema de armazenamento utilizado pelo Vault (Consul, etcd, filesystem, etc.).

**Bootstrap**: Processo inicial de configuração e inicialização de um sistema.

**Capability**: Tipo de operação permitida em uma política (create, read, update, delete, list, patch).

**ConfigMap**: Recurso do Kubernetes para armazenar configurações não sensíveis.

**Dynamic Secrets**: Credenciais geradas sob demanda com tempo de vida limitado.

**Engine**: Componente do Vault responsável por armazenar, gerar ou criptografar dados.

**Entity**: Representação de um usuário ou serviço no sistema de identidade do Vault.

**HCL (HashiCorp Configuration Language)**: Linguagem declarativa utilizada para configurar produtos HashiCorp.

**HSM (Hardware Security Module)**: Dispositivo físico dedicado para operações criptográficas seguras.

**Init Container**: Container que executa antes dos containers principais em um Pod Kubernetes.

**KMS (Key Management Service)**: Serviço para gerenciamento de chaves criptográficas.

**KV (Key-Value)**: Engine do Vault para armazenamento de pares chave-valor.

**Lease**: Tempo de vida de um secret ou token, após o qual ele expira.

**Managed Keys**: Funcionalidade enterprise do Vault para utilizar chaves armazenadas em HSM externo.

**Metadata**: Informações sobre um secret (versões, timestamps, etc.), distintas do conteúdo do secret.

**Mount Path**: Caminho onde uma secrets engine é habilitada no Vault.

**Namespace**: Isolamento lógico de recursos no Vault (funcionalidade enterprise).

**Path**: Localização hierárquica de um recurso no Vault (análogo a filesystem).

**Policy**: Conjunto de regras que define permissões de acesso a paths específicos.

**Raft**: Algoritmo de consenso utilizado pelo Vault para alta disponibilidade.

**Renewable**: Propriedade de um lease que permite sua renovação antes da expiração.

**Root Token**: Token com privilégios máximos no Vault, equivalente a superusuário.

**Seal/Unseal**: Processo de bloqueio/desbloqueio do Vault usando shamir secret shares.

**Secret**: Informação sensível armazenada no Vault (credencial, certificado, chave API, etc.).

**Shamir Secret Sharing**: Algoritmo criptográfico que divide uma chave mestre em múltiplas partes.

**Sidecar**: Container auxiliar que roda ao lado do container principal em um Pod.

**Soft Delete**: Marcação de um secret como deletado sem remover os dados permanentemente.

**Storage Backend**: Sistema utilizado pelo Vault para persistir dados criptografados.

**Template**: Arquivo de modelo utilizado pelo Vault Agent para renderizar secrets.

**Token**: Credencial utilizada para autenticar requisições ao Vault.

**TTL (Time To Live)**: Tempo de vida de um secret ou token antes da expiração.

**Unsealing**: Processo de descriptografar a chave mestre do Vault usando shares.

**Vault Agent Injector**: Mutating webhook do Kubernetes que injeta automaticamente Vault Agents em Pods.

**Version**: Snapshot imutável de um secret na KV v2 engine.

**Wildcard**: Caractere especial usado em paths de políticas para correspondência de padrões (* ou +).

**Zero Trust**: Modelo de segurança que não assume confiança implícita em nenhum componente do sistema.