# Secret Management em DevOps

Repositório pessoal de registro, referência e suporte para fins de aprendizado, consulta e acompanhamento da disciplina de Secret Management em DevOps (Nível 8), Fase 2 (Estratégia e Inovação), do curso de Pós-Graduação Tech Developer 360, desenvolvido pela Faculdade de Tecnologia Rocketseat (FTR).

## Conteúdo Teórico

### Bloco A - HashiCorp Vault: Gerenciamento de Segredos

O Bloco A apresenta o HashiCorp Vault como solução centralizada e enterprise-grade para gerenciamento de informações sensíveis em ambientes DevOps. O conteúdo explora desde a problemática do armazenamento de credenciais em arquivos .env até a implementação prática de uma arquitetura segura utilizando a engine KV v2, políticas de acesso granulares (ACL) e integração com aplicações Node.js. São abordados conceitos fundamentais como versionamento de secrets, autenticação baseada em tokens, rotação automatizada de credenciais e auditoria completa de acessos, estabelecendo uma base sólida para arquiteturas que priorizam segurança, conformidade e Zero Trust.

A integração prática demonstra o ciclo completo de configuração do Vault em modo Dev, criação de secrets via interface web e CLI, implementação do cliente node-vault para bootstrap assíncrono da aplicação, e estratégias avançadas de desacoplamento através de sidecars e init containers no Kubernetes. O módulo também apresenta comparações detalhadas com alternativas de mercado como AWS Secrets Manager, Azure Key Vault e Google Cloud Secret Manager, fornecendo subsídios para decisões arquiteturais em cenários multi-cloud e híbridos. O material é complementado por apêndices práticos com comandos CLI essenciais, exemplos de políticas ACL, scripts de automação e configurações para ambientes de alta disponibilidade.

> [!NOTE]
> [HashiCorp Vault: Gerenciamento de Segredos em DevOps](./.github/docs/content/bloco-a.md)

---

### Bloco B - AWS Secrets Manager, Systems Manager e KMS

O Bloco B explora o ecossistema nativo da Amazon Web Services para gerenciamento de segredos e configurações, apresentando três serviços complementares: AWS Secrets Manager para gerenciamento completo de secrets com rotação automatizada, AWS Systems Manager Parameter Store para armazenamento hierárquico de configurações e parâmetros, e AWS Key Management Service (KMS) para gerenciamento centralizado de chaves de criptografia. O conteúdo estabelece as diferenças funcionais entre cada serviço, seus modelos de precificação e casos de uso específicos, demonstrando como integrá-los em aplicações Node.js utilizando AWS SDK v3 com arquitetura baseada em comandos. São abordados conceitos essenciais como SecureString vs String no Parameter Store, Customer Managed Keys vs AWS Managed Keys no KMS, e estratégias de versionamento e rotação no Secrets Manager.

A implementação prática abrange desde a configuração inicial do AWS CLI e credenciais IAM até a criação e leitura de secrets via API, incluindo descriptografia automática com KMS, configuração de políticas de chave e integração com serviços gerenciados como RDS e DocumentDB. O módulo apresenta comparação detalhada com HashiCorp Vault, evidenciando trade-offs entre vendor lock-in, custo operacional e profundidade de integração nativa com serviços AWS. O material inclui apêndices com comandos CLI essenciais para operações em Secrets Manager, Parameter Store e KMS, além de glossário técnico com termos específicos do ecossistema AWS de segurança e criptografia.

> [!NOTE]
> [AWS Secrets Manager, Systems Manager e KMS](./.github/docs/content/bloco-b.md)

## Projeto

### Descrição

Projeto prático de demonstração que implementa gerenciamento de secrets utilizando tanto HashiCorp Vault quanto AWS Secrets Manager (via LocalStack), permitindo comparação direta entre as duas abordagens. A aplicação é construída com Fastify, TypeScript, Zod e segue princípios de segurança modernos incluindo security headers (Helmet), rate limiting e logging com redaction de dados sensíveis.

### Stack Tecnológico

- Node.js 18+ com TypeScript (strict mode)
- Fastify com ZodTypeProvider
- Zod para validação e type inference
- Scalar para documentação interativa de API
- Pino para logging estruturado
- Docker Compose para Vault e LocalStack
- Factory Pattern para abstração de providers

### Quick Start

```bash
# 1. Clonar o repositório
git clone <repository-url>
cd f2_n8_devops-secret-management

# 2. Instalar dependências
pnpm install

# 3. Iniciar containers (Vault + LocalStack)
docker compose up -d

# 4a. Setup com Vault
pnpm setup:vault
pnpm demo:vault

# OU

# 4b. Setup com LocalStack
pnpm setup:localstack
pnpm demo:localstack

# 5. Acessar documentação interativa
# http://localhost:3000/docs
```

### Workflow Após Restart dos Containers

IMPORTANTE: Vault Dev Mode não persiste dados após restart.

```bash
# 1. Parar containers
docker compose down

# 2. Iniciar containers
docker compose up -d

# 3. Aguardar health check (10-15 segundos)

# 4a. Vault: Recriar secrets (OBRIGATÓRIO após restart)
pnpm setup:vault
pnpm demo:vault

# 4b. LocalStack: Secrets já persistidos (setup opcional)
pnpm demo:localstack
```

Diferenças de persistência:

- **Vault Dev Mode**: Dados em memória, perdidos ao reiniciar (setup sempre necessário)
- **LocalStack**: Dados persistidos em `./localstack-data` (setup apenas na primeira vez)

### Endpoints Disponíveis

- `GET /health` - Status da aplicação e carregamento de secrets
- `GET /demo/secrets-info` - Informações sobre secrets (valores mascarados)
- `GET /demo/database-status` - Status de configuração do banco de dados
- `GET /demo/provider-comparison` - Comparação detalhada entre Vault e LocalStack
- `GET /docs` - Documentação interativa (Scalar)

### Documentação Técnica

Documentação detalhada disponível em `src/docs/`:

- `architecture.md` - Arquitetura e decisões técnicas
- `vault-setup.md` - Guia completo de setup do Vault
- `aws-localstack-setup.md` - Guia completo de setup do LocalStack
- `security.md` - Práticas de segurança implementadas

### Estrutura do Projeto

```plaintext
f2_n8_devops-secret-management/
├── .github/
│   └── docs/
│       └── content/
│           ├── bloco-a.md              # Documentação HashiCorp Vault
│           ├── bloco-b.md              # Documentação AWS Secrets Manager
│           └── resumes/                # Resumos das aulas
├── src/
│   ├── config/
│   │   └── env.ts                      # Validação de environment com Zod
│   ├── infra/
│   │   ├── logger.ts                   # Pino logger com redaction
│   │   └── secrets/
│   │       ├── types.ts                # Interfaces de providers
│   │       ├── factory.ts              # Factory Pattern
│   │       ├── vault.provider.ts       # Implementação Vault
│   │       └── localstack.provider.ts  # Implementação LocalStack
│   ├── plugins/
│   │   └── secrets.plugin.ts           # Plugin Fastify para secrets
│   ├── modules/
│   │   ├── health/                     # Health check endpoints
│   │   └── demo/                       # Demo endpoints
│   ├── docs/
│   │   ├── architecture.md             # Arquitetura do projeto
│   │   ├── vault-setup.md              # Setup do Vault
│   │   ├── aws-localstack-setup.md     # Setup do LocalStack
│   │   └── security.md                 # Práticas de segurança
│   ├── app.ts                          # Configuração Fastify
│   └── server.ts                       # Entry point
├── scripts/
│   ├── setup-vault.ts                  # Script de setup automatizado Vault
│   └── setup-localstack.ts             # Script de setup automatizado LocalStack
├── docker-compose.yml                  # Vault + LocalStack containers
├── package.json                        # Dependências e scripts
├── tsconfig.json                       # Configuração TypeScript
└── .env.example                        # Template de variáveis de ambiente
```

### Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev                  # Inicia aplicação em modo desenvolvimento
pnpm demo:vault           # Inicia com Vault provider
pnpm demo:localstack      # Inicia com LocalStack provider

# Setup automatizado (TypeScript com tsx)
pnpm setup:vault          # Configura Vault com secrets de exemplo (7 secrets)
pnpm setup:localstack     # Configura LocalStack com secrets de exemplo (7 secrets)

# Build
pnpm build                # Compila TypeScript para JavaScript
pnpm type-check           # Verificação de tipos TypeScript

# Docker
docker compose up -d      # Inicia Vault e LocalStack
docker compose down       # Para containers
docker compose logs -f    # Visualiza logs
docker compose ps         # Status dos containers
```

### Interfaces de Gerenciamento

#### Vault UI

Acesse a interface web do Vault em:

```plainttext
URL: http://localhost:8200/ui
Token: root
Method: Token
```

Recursos disponíveis:

- Navegação visual de secrets engines
- Criação e edição de secrets via UI
- Visualização de versões de secrets (KV v2)
- Gerenciamento de políticas e tokens

#### LocalStack

LocalStack Community Edition não possui interface web gráfica completa.

Endpoints disponíveis:

```bash
# Health check dos serviços
curl http://localhost:4566/_localstack/health | jq

# Diagnóstico completo
curl http://localhost:4566/_localstack/diagnose | jq

# Listar secrets via AWS CLI
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    secretsmanager list-secrets \
    --no-sign-request
```

### Requisitos

- Node.js 18+ ou 20+
- pnpm 10+
- Docker Desktop (Windows/Mac) ou Docker Engine (Linux)
- Docker Compose v2+

### Recursos de Segurança

- Security Headers (Helmet): CSP, HSTS, X-Frame-Options
- CORS configurável por ambiente
- Rate Limiting (100 req/15min)
- Logging com redaction automática de secrets
- Masking de valores em responses HTTP
- Validação em runtime com Zod
- TypeScript strict mode
- Fail-fast em caso de secrets inválidos

### Comparação de Providers

| Característica | HashiCorp Vault | AWS/LocalStack |
|----------------|-----------------|----------------|
| Custo (Dev) | Gratuito | Gratuito (LocalStack) |
| Multi-cloud | Sim | Não (AWS-specific) |
| Dynamic Secrets | Sim | Limitado |
| Rotação Automática | Manual setup | Nativo (AWS) |
| Versionamento | Sim (KV v2) | Sim |
| ACL Granular | Sim | IAM Policies |
| Auditoria | Completa | CloudTrail (AWS) |
| Curva de Aprendizado | Média | Baixa (se já usa AWS) |
