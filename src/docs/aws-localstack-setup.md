<!-- markdownlint-disable -->

# AWS LocalStack Setup Guide

## Resumo Executivo

Este guia fornece instruções completas para configurar e utilizar o LocalStack como emulador de serviços AWS para desenvolvimento local. O LocalStack permite simular AWS Secrets Manager, Systems Manager Parameter Store e KMS sem custos e sem necessidade de conta AWS. O guia abrange instalação via Docker Compose, configuração de secrets e integração com a aplicação Fastify.

## Introdução e Conceitos

### O que é LocalStack

LocalStack é um emulador completo de serviços AWS que roda localmente, permitindo desenvolvimento e testes sem conectar à AWS real. Principais características:

- **Compatibilidade AWS**: APIs 100% compatíveis com serviços AWS
- **Desenvolvimento Local**: Sem necessidade de internet ou conta AWS
- **Custo Zero**: Gratuito para desenvolvimento
- **Rapidez**: Testes e desenvolvimento mais rápidos
- **Offline**: Funciona completamente offline

### Serviços Utilizados

#### 1. AWS Secrets Manager

Serviço gerenciado para armazenamento e rotação de secrets:

- **JSON Storage**: Secrets armazenados como JSON strings
- **Versioning**: Suporte a múltiplas versões
- **Rotation**: Rotação automática de secrets (produção AWS)
- **Encryption**: Criptografia automática com KMS

#### 2. AWS Systems Manager Parameter Store (SSM)

Armazenamento hierárquico de configurações:

- **Hierarchical Structure**: Organização em árvore de paths
- **Types**: String, StringList, SecureString
- **Free Tier**: Gratuito para standard parameters na AWS
- **Integration**: Integração nativa com outros serviços AWS

#### 3. AWS Key Management Service (KMS)

Serviço de gerenciamento de chaves criptográficas:

- **Master Keys**: Criação e gerenciamento de chaves mestras
- **Encryption/Decryption**: APIs para criptografia de dados
- **Audit**: CloudTrail logging de uso de chaves
- **Integration**: Usado por Secrets Manager e SSM

## Pré-requisitos

### Ferramentas Necessárias

1. **Docker Desktop** (Windows/Mac) ou **Docker Engine** (Linux)
   - Versão 20.10 ou superior
   - Docker Compose v2 ou superior

2. **AWS CLI** (Opcional, para testes manuais)
   - Versão 2.x
   - Não requer configuração real de AWS

3. **Node.js e pnpm**
   - Node.js 18+ ou 20+
   - pnpm 8+

### Verificação de Instalação

```bash
# Verificar Docker
docker --version
docker compose version

# Verificar AWS CLI (opcional)
aws --version

# Verificar Node.js e pnpm
node --version
pnpm --version
```

### Portas Utilizadas

- **4566**: LocalStack edge port (todos os serviços)
- **3000**: Aplicação Fastify (default)

Verificar disponibilidade:

```bash
# Windows PowerShell
netstat -ano | findstr :4566
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :4566
lsof -i :3000
```

## Configuração do LocalStack via Docker Compose

### Arquivo docker-compose.yml

O arquivo já está configurado no projeto:

```yaml
version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    container_name: localstack-dev
    ports:
      - "4566:4566"
    environment:
      - SERVICES=secretsmanager,ssm,kms
      - DEBUG=1
      - AWS_DEFAULT_REGION=us-east-1
      - DOCKER_HOST=unix:///var/run/docker.sock
    volumes:
      - ./localstack-data:/var/lib/localstack
      - /var/run/docker.sock:/var/run/docker.sock
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - secrets-net

networks:
  secrets-net:
    driver: bridge
```

### Variáveis de Ambiente Importantes

- **SERVICES**: Lista de serviços AWS a serem emulados
- **DEBUG**: Nível de logging (0 ou 1)
- **AWS_DEFAULT_REGION**: Região AWS padrão
- **DOCKER_HOST**: Socket do Docker para alguns serviços

### Iniciando o LocalStack

1. **Iniciar o container**:

```bash
# Iniciar em background
docker compose up -d localstack

# Verificar logs
docker compose logs -f localstack
```

2. **Aguardar Health Check**:

```bash
# Verificar status do container
docker compose ps

# Deve mostrar "healthy" após alguns segundos
```

3. **Verificar serviços disponíveis**:

```bash
curl http://localhost:4566/_localstack/health | jq
```

Resposta esperada:

```json
{
  "services": {
    "secretsmanager": "available",
    "ssm": "available",
    "kms": "available"
  },
  "edition": "community",
  "version": "4.10.x"
}
```

## Interface Web do LocalStack

### LocalStack Community Edition (Versão Gratuita)

O LocalStack Community Edition NÃO possui interface web gráfica completa como o Vault UI.

#### Endpoints Disponíveis

A versão Community oferece apenas endpoints JSON para diagnóstico:

1. **Health Dashboard**:

```bash
curl http://localhost:4566/_localstack/health | jq
```

Retorna status de todos os serviços configurados (secretsmanager, ssm, kms).

2. **Diagnóstico Completo**:

```bash
curl http://localhost:4566/_localstack/diagnose | jq
```

Retorna informações detalhadas:
- Versão do LocalStack
- Configuração completa
- Status do Docker
- File tree
- Logs recentes

3. **Configuração Atual**:

```bash
curl http://localhost:4566/_localstack/config | jq
```

Retorna todas as variáveis de configuração.

#### Visualizar Secrets via AWS CLI

Para ver os secrets criados, use a AWS CLI:

```bash
# Listar todos os secrets
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    secretsmanager list-secrets \
    --no-sign-request | jq

# Ver conteúdo de um secret específico
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    secretsmanager get-secret-value \
    --secret-id "ARN_DO_SECRET" \
    --no-sign-request | jq
```

Exemplo com o secret criado pelo setup:

```bash
# Listar secrets
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    secretsmanager list-secrets \
    --no-sign-request

# Obter ARN do secret (exemplo)
# arn:aws:secretsmanager:us-east-1:000000000000:secret:app-secrets-AbCdEf

# Ver conteúdo usando ARN
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    secretsmanager get-secret-value \
    --secret-id "arn:aws:secretsmanager:us-east-1:000000000000:secret:app-secrets-AbCdEf" \
    --no-sign-request \
    --query SecretString \
    --output text | jq
```

#### LocalStack Pro (Versão Paga)

A versão Pro oferece recursos adicionais:

- **Interface Web Completa**: Similar ao AWS Console real
- **Resource Browser**: Visualização gráfica de todos os recursos
- **Cloud Pods**: Snapshots persistentes de estado
- **Advanced Features**: Integração com CI/CD, debugging avançado

Mais informações: https://localstack.cloud/pricing

#### Alternativas para Gerenciamento Visual

Para a versão gratuita Community:

1. **LocalStack Desktop** (Gratuito, limitado):
   - Aplicação desktop com UI básica
   - Download: https://localstack.cloud/desktop
   - Recursos limitados comparado à versão Pro

2. **AWS CLI com Scripts**:
   - Scripts bash para operações comuns
   - Automação TypeScript (como `pnpm setup:localstack`)

3. **Commandeer** (Third-party):
   - Ferramenta visual para gerenciar LocalStack e AWS
   - Suporte a múltiplos serviços

#### Comparação de Interfaces

| Recurso | Vault UI (Grátis) | LocalStack Community | LocalStack Pro |
|---|---|---|---|
| **Interface Web** | ✅ Completa | ❌ Apenas JSON | ✅ Completa |
| **Navegação Visual** | ✅ Tree view | ❌ CLI apenas | ✅ Resource browser |
| **Criação de Secrets** | ✅ Forms | ⚠️ CLI/API | ✅ Forms |
| **Versionamento Visual** | ✅ Sim | ❌ CLI apenas | ✅ Sim |
| **Custo** | Gratuito | Gratuito | Pago |

## Configuração do AWS CLI para LocalStack

### Criar Profile AWS CLI

Mesmo sem conta AWS, é necessário configurar credenciais dummy:

```bash
# Configurar profile para LocalStack
aws configure --profile localstack

# Quando solicitado, usar valores dummy:
# AWS Access Key ID: test
# AWS Secret Access Key: test
# Default region name: us-east-1
# Default output format: json
```

### Variáveis de Ambiente

Para comandos AWS CLI apontarem para LocalStack:

```bash
# Windows PowerShell
$env:AWS_ENDPOINT_URL = "http://localhost:4566"
$env:AWS_REGION = "us-east-1"
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"

# Linux/Mac Bash
export AWS_ENDPOINT_URL="http://localhost:4566"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
```

## Criação de Secrets no AWS Secrets Manager

### Via AWS CLI

1. **Criar secret com JSON**:

```bash
# Windows PowerShell
aws secretsmanager create-secret `
  --name app-secrets `
  --secret-string '{\"DATABASE_HOST\":\"localhost\",\"DATABASE_PORT\":\"5432\",\"DATABASE_USER\":\"postgres\",\"DATABASE_PASSWORD\":\"secure_password_123\",\"DATABASE_NAME\":\"app_db\",\"CLOUDFLARE_API_KEY\":\"cf_api_key_example\",\"NEW_RELIC_LICENSE_KEY\":\"nr_license_key_example\"}' `
  --endpoint-url http://localhost:4566 `
  --region us-east-1

# Linux/Mac Bash
aws secretsmanager create-secret \
  --name app-secrets \
  --secret-string '{"DATABASE_HOST":"localhost","DATABASE_PORT":"5432","DATABASE_USER":"postgres","DATABASE_PASSWORD":"secure_password_123","DATABASE_NAME":"app_db","CLOUDFLARE_API_KEY":"cf_api_key_example","NEW_RELIC_LICENSE_KEY":"nr_license_key_example"}' \
  --endpoint-url http://localhost:4566 \
  --region us-east-1
```

2. **Criar secret a partir de arquivo**:

Criar arquivo `secrets.json`:

```json
{
  "DATABASE_HOST": "localhost",
  "DATABASE_PORT": "5432",
  "DATABASE_USER": "postgres",
  "DATABASE_PASSWORD": "secure_password_123",
  "DATABASE_NAME": "app_db",
  "CLOUDFLARE_API_KEY": "cf_api_key_example",
  "NEW_RELIC_LICENSE_KEY": "nr_license_key_example"
}
```

Comando:

```bash
# Windows PowerShell
aws secretsmanager create-secret `
  --name app-secrets `
  --secret-string file://secrets.json `
  --endpoint-url http://localhost:4566 `
  --region us-east-1

# Linux/Mac
aws secretsmanager create-secret \
  --name app-secrets \
  --secret-string file://secrets.json \
  --endpoint-url http://localhost:4566 \
  --region us-east-1
```

3. **Ler secret**:

```bash
aws secretsmanager get-secret-value \
  --secret-id app-secrets \
  --endpoint-url http://localhost:4566 \
  --region us-east-1 | jq
```

### Via API HTTP (curl)

1. **Criar secret**:

```bash
# Windows PowerShell (escape de aspas)
curl -X POST `
  -H "Content-Type: application/x-amz-json-1.1" `
  -H "X-Amz-Target: secretsmanager.CreateSecret" `
  -d '{\"Name\":\"app-secrets\",\"SecretString\":\"{\\\"DATABASE_HOST\\\":\\\"localhost\\\"}\"}' `
  http://localhost:4566/

# Linux/Mac
curl -X POST \
  -H "Content-Type: application/x-amz-json-1.1" \
  -H "X-Amz-Target: secretsmanager.CreateSecret" \
  -d '{"Name":"app-secrets","SecretString":"{\"DATABASE_HOST\":\"localhost\"}"}' \
  http://localhost:4566/
```

### Via SDK (Node.js - Script de Setup)

Será criado script automatizado posteriormente. Exemplo manual:

```typescript
import { SecretsManagerClient, CreateSecretCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const secrets = {
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'secure_password_123',
  DATABASE_NAME: 'app_db',
  CLOUDFLARE_API_KEY: 'cf_api_key_example',
  NEW_RELIC_LICENSE_KEY: 'nr_license_key_example',
};

const command = new CreateSecretCommand({
  Name: 'app-secrets',
  SecretString: JSON.stringify(secrets),
});

await client.send(command);
```

## Criação de Parâmetros no SSM Parameter Store

### Via AWS CLI

1. **Criar parâmetros individuais**:

```bash
# String simples
aws ssm put-parameter \
  --name /app/database/host \
  --value localhost \
  --type String \
  --endpoint-url http://localhost:4566

# SecureString (criptografado)
aws ssm put-parameter \
  --name /app/database/password \
  --value secure_password_123 \
  --type SecureString \
  --endpoint-url http://localhost:4566

# Criar múltiplos parâmetros
aws ssm put-parameter --name /app/database/port --value 5432 --type String --endpoint-url http://localhost:4566
aws ssm put-parameter --name /app/database/user --value postgres --type String --endpoint-url http://localhost:4566
aws ssm put-parameter --name /app/database/name --value app_db --type String --endpoint-url http://localhost:4566
```

2. **Ler parâmetro**:

```bash
# Ler parâmetro específico
aws ssm get-parameter \
  --name /app/database/host \
  --endpoint-url http://localhost:4566

# Ler com descriptografia (SecureString)
aws ssm get-parameter \
  --name /app/database/password \
  --with-decryption \
  --endpoint-url http://localhost:4566

# Ler múltiplos parâmetros por path
aws ssm get-parameters-by-path \
  --path /app/database \
  --with-decryption \
  --endpoint-url http://localhost:4566
```

## Configuração da Aplicação

### Arquivo .env

Crie arquivo `.env` na raiz do projeto (use `.env.example` como base):

```bash
# Application
NODE_ENV=development
PORT=3000

# Secret Provider Selection
SECRET_PROVIDER=localstack

# AWS/LocalStack Configuration
USE_LOCALSTACK=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566

# Secret Configuration
AWS_SECRET_NAME=app-secrets
```

### Estrutura de Credenciais

LocalStack aceita credenciais dummy:

- **Access Key ID**: `test`
- **Secret Access Key**: `test`
- **Region**: Qualquer região válida (ex: `us-east-1`)

## Testando a Integração

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Iniciar Aplicação

```bash
# Usando npm script
pnpm demo:localstack

# Ou diretamente
pnpm dev
```

### 3. Verificar Logs

Logs devem mostrar:

```
[INFO] Loading secrets from provider { provider: 'localstack' }
[INFO] Health check passed for provider { provider: 'localstack' }
[INFO] Secrets loaded successfully { provider: 'localstack', count: 7 }
[INFO] Server started successfully { port: 3000 }
```

### 4. Testar Endpoints

#### Health Check

```bash
curl http://localhost:3000/health | jq
```

Resposta esperada:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.123,
  "provider": "localstack",
  "secretsLoaded": true,
  "version": "1.0.0"
}
```

#### Secrets Info

```bash
curl http://localhost:3000/demo/secrets-info | jq
```

Resposta esperada:

```json
{
  "provider": "localstack",
  "totalSecrets": 7,
  "secretKeys": [
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
    "CLOUDFLARE_API_KEY",
    "NEW_RELIC_LICENSE_KEY"
  ],
  "loadedAt": "2024-01-15T10:30:00.000Z",
  "example": {
    "key": "DATABASE_HOST",
    "valueMasked": "***host"
  }
}
```

#### Database Status

```bash
curl http://localhost:3000/demo/database-status | jq
```

#### Provider Comparison

```bash
curl http://localhost:3000/demo/provider-comparison | jq
```

Mostra comparação detalhada entre Vault e LocalStack.

### 5. Acessar Documentação Interativa

Abra no navegador: http://localhost:3000/docs

A interface Scalar permite testar todos os endpoints interativamente.

## Operações Avançadas

### Versionamento de Secrets

1. **Atualizar secret**:

```bash
aws secretsmanager update-secret \
  --secret-id app-secrets \
  --secret-string '{"DATABASE_PASSWORD":"new_password_456"}' \
  --endpoint-url http://localhost:4566
```

2. **Listar versões**:

```bash
aws secretsmanager list-secret-version-ids \
  --secret-id app-secrets \
  --endpoint-url http://localhost:4566
```

3. **Ler versão específica**:

```bash
aws secretsmanager get-secret-value \
  --secret-id app-secrets \
  --version-id <version-id> \
  --endpoint-url http://localhost:4566
```

### Rotação de Secrets

Em LocalStack, rotação automática não é completamente suportada, mas pode ser simulada manualmente:

```bash
# Criar função Lambda para rotação (simulada)
aws secretsmanager rotate-secret \
  --secret-id app-secrets \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:000000000000:function:rotation \
  --rotation-rules AutomaticallyAfterDays=30 \
  --endpoint-url http://localhost:4566
```

### Deletar Secrets

```bash
# Soft delete (recovery window de 30 dias)
aws secretsmanager delete-secret \
  --secret-id app-secrets \
  --recovery-window-in-days 30 \
  --endpoint-url http://localhost:4566

# Deletar imediatamente (sem recovery)
aws secretsmanager delete-secret \
  --secret-id app-secrets \
  --force-delete-without-recovery \
  --endpoint-url http://localhost:4566
```

### Operações com KMS

1. **Criar chave KMS**:

```bash
aws kms create-key \
  --description "Key for secrets encryption" \
  --endpoint-url http://localhost:4566
```

2. **Listar chaves**:

```bash
aws kms list-keys \
  --endpoint-url http://localhost:4566
```

3. **Criptografar dados**:

```bash
aws kms encrypt \
  --key-id <key-id> \
  --plaintext "sensitive data" \
  --endpoint-url http://localhost:4566
```

## Persistência de Dados

### Volume LocalStack

Dados são persistidos em `./localstack-data/` conforme configuração no Docker Compose:

```yaml
volumes:
  - ./localstack-data:/var/lib/localstack
```

### Backup de Secrets

Exportar secrets para backup:

```bash
# Exportar secret para arquivo
aws secretsmanager get-secret-value \
  --secret-id app-secrets \
  --endpoint-url http://localhost:4566 \
  --query SecretString \
  --output text > backup-secrets.json
```

### Restaurar Secrets

```bash
# Restaurar de backup
aws secretsmanager create-secret \
  --name app-secrets \
  --secret-string file://backup-secrets.json \
  --endpoint-url http://localhost:4566
```

## Troubleshooting

### LocalStack Não Inicia

**Sintoma**: Container falha ao iniciar

**Diagnóstico**:

```bash
# Verificar logs
docker compose logs localstack

# Verificar recursos Docker
docker stats
```

**Soluções**:

1. Aumentar recursos do Docker Desktop (CPU/Memory)
2. Verificar se porta 4566 não está em uso
3. Remover volumes antigos: `docker compose down -v`

### Health Check Falha

**Sintoma**: Container não fica "healthy"

**Diagnóstico**:

```bash
# Testar health endpoint manualmente
curl http://localhost:4566/_localstack/health
```

**Soluções**:

1. Aguardar mais tempo (LocalStack pode demorar para iniciar)
2. Verificar logs para erros específicos
3. Reiniciar container: `docker compose restart localstack`

### Secret Not Found

**Sintoma**: "ResourceNotFoundException: Secret not found"

**Diagnóstico**:

```bash
# Listar secrets disponíveis
aws secretsmanager list-secrets \
  --endpoint-url http://localhost:4566
```

**Soluções**:

1. Verificar nome exato do secret (case-sensitive)
2. Criar secret se não existir
3. Verificar se `AWS_SECRET_NAME` no `.env` está correto

### Erro de Endpoint

**Sintoma**: "Could not connect to endpoint URL"

**Diagnóstico**:

```bash
# Verificar se LocalStack está rodando
docker compose ps

# Testar conectividade
curl http://localhost:4566/_localstack/health
```

**Soluções**:

1. Verificar `AWS_ENDPOINT_URL` no `.env`
2. Verificar `USE_LOCALSTACK=true` no `.env`
3. Verificar se LocalStack container está healthy

### JSON Parse Error

**Sintoma**: "Error parsing SecretString as JSON"

**Diagnóstico**:

```bash
# Verificar formato do secret
aws secretsmanager get-secret-value \
  --secret-id app-secrets \
  --endpoint-url http://localhost:4566 \
  --query SecretString \
  --output text | jq
```

**Soluções**:

1. Garantir que `SecretString` seja JSON válido
2. Usar escape correto de aspas duplas
3. Validar JSON antes de criar secret

## Comparação: LocalStack vs AWS Real

### Diferenças Importantes

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| Custo | Gratuito | Pay-per-use |
| Latência | Baixíssima (local) | Variável (network) |
| Rotação Automática | Não suportada | Totalmente suportada |
| Auditoria | Limitada | CloudTrail completo |
| Multi-Region | Simulado | Real |
| Backup Automático | Não | Automático |
| Encryption | Simulado | KMS real |
| Performance | Depende de hardware local | AWS infrastructure |

### Recursos Não Suportados no LocalStack

1. **Rotação automática de secrets**: Apenas simulação básica
2. **Cross-region replication**: Não replicado realmente
3. **CloudTrail logging**: Logs limitados
4. **IAM policies**: Validação simplificada
5. **VPC endpoints**: Não aplicável

### Quando Usar LocalStack

- **Desenvolvimento local**: Iteração rápida sem custos
- **Testes automatizados**: CI/CD sem dependências externas
- **Treinamento**: Aprender AWS sem gastar
- **Demonstrações**: Provas de conceito

### Quando Usar AWS Real

- **Produção**: Sempre usar AWS real
- **Staging**: Ambiente próximo à produção
- **Features específicas**: Rotação automática, auditoria completa
- **Compliance**: Requisitos de segurança/auditoria

## Migração para AWS Real

### Mudanças Necessárias

1. **Remover endpoint customizado**:

```bash
# .env para produção
# AWS_ENDPOINT_URL=  # Comentar ou remover
USE_LOCALSTACK=false
```

2. **Configurar credenciais reais**:

```bash
# Via AWS CLI
aws configure

# Ou variáveis de ambiente
export AWS_ACCESS_KEY_ID=<real-access-key>
export AWS_SECRET_ACCESS_KEY=<real-secret-key>
export AWS_REGION=us-east-1
```

3. **Criar secrets na AWS real**:

```bash
# Sem --endpoint-url
aws secretsmanager create-secret \
  --name app-secrets \
  --secret-string file://secrets.json
```

4. **Configurar rotação automática**:

```bash
aws secretsmanager rotate-secret \
  --secret-id app-secrets \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:rotation \
  --rotation-rules AutomaticallyAfterDays=30
```

### Checklist para Produção

1. **Segurança**:
   - [ ] Usar IAM roles ao invés de access keys
   - [ ] Configurar KMS customer managed keys
   - [ ] Habilitar CloudTrail logging
   - [ ] Configurar resource policies

2. **Resiliência**:
   - [ ] Configurar cross-region replication
   - [ ] Implementar retry logic na aplicação
   - [ ] Configurar alertas CloudWatch

3. **Compliance**:
   - [ ] Habilitar versioning
   - [ ] Configurar rotação automática
   - [ ] Implementar auditoria regular

4. **Custos**:
   - [ ] Revisar número de secrets
   - [ ] Otimizar número de API calls
   - [ ] Deletar secrets não utilizados

## Conclusões

### Benefícios do LocalStack

1. **Custo Zero**: Desenvolvimento sem custos de AWS
2. **Rapidez**: Iteração rápida sem latência de rede
3. **Offline**: Desenvolvimento sem internet
4. **Consistência**: Ambiente reproduzível para toda equipe

### Limitações do LocalStack

1. **Não é produção**: Apenas para desenvolvimento
2. **Features limitadas**: Alguns recursos AWS não suportados
3. **Diferenças comportamentais**: Pode haver discrepâncias com AWS real

### Recomendações

1. **Desenvolvimento**: Usar LocalStack para iteração rápida
2. **Testes**: Combinar LocalStack (unit) com AWS real (integration)
3. **CI/CD**: LocalStack para testes rápidos, AWS real para validação final
4. **Produção**: Sempre usar AWS real com todas as features de segurança

## Referências Bibliográficas

1. LocalStack. (2024). LocalStack Documentation. https://docs.localstack.cloud/
2. AWS. (2024). AWS Secrets Manager Documentation. https://docs.aws.amazon.com/secretsmanager/
3. AWS. (2024). AWS Systems Manager Parameter Store. https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
4. AWS. (2024). AWS Key Management Service. https://docs.aws.amazon.com/kms/
5. AWS. (2024). AWS SDK for JavaScript v3. https://docs.aws.amazon.com/sdk-for-javascript/v3/

## Apêndice

### Comandos Úteis AWS CLI

```bash
# Secrets Manager
aws secretsmanager list-secrets --endpoint-url http://localhost:4566
aws secretsmanager describe-secret --secret-id app-secrets --endpoint-url http://localhost:4566
aws secretsmanager get-random-password --endpoint-url http://localhost:4566

# SSM Parameter Store
aws ssm describe-parameters --endpoint-url http://localhost:4566
aws ssm get-parameters-by-path --path /app --recursive --endpoint-url http://localhost:4566
aws ssm delete-parameter --name /app/database/host --endpoint-url http://localhost:4566

# KMS
aws kms list-aliases --endpoint-url http://localhost:4566
aws kms describe-key --key-id <key-id> --endpoint-url http://localhost:4566
aws kms decrypt --ciphertext-blob <blob> --endpoint-url http://localhost:4566
```

### Estrutura de Dados JSON para Secrets

```json
{
  "DATABASE_HOST": "localhost",
  "DATABASE_PORT": "5432",
  "DATABASE_USER": "postgres",
  "DATABASE_PASSWORD": "secure_password_123",
  "DATABASE_NAME": "app_db",
  "CLOUDFLARE_API_KEY": "cf_api_key_example",
  "CLOUDFLARE_ZONE_ID": "zone_id_example",
  "NEW_RELIC_LICENSE_KEY": "nr_license_key_example",
  "NEW_RELIC_APP_NAME": "app_name_example",
  "STRIPE_SECRET_KEY": "sk_test_example",
  "SENDGRID_API_KEY": "sg_api_key_example"
}
```

### Glossário e Termos Técnicos

- **ARN (Amazon Resource Name)**: Identificador único de recursos AWS
- **CloudTrail**: Serviço de auditoria e logging da AWS
- **Cross-Region Replication**: Replicação de dados entre regiões AWS
- **Customer Managed Key**: Chave KMS gerenciada pelo cliente
- **Edge Port**: Porta única do LocalStack para todos os serviços
- **IAM (Identity and Access Management)**: Serviço de controle de acesso AWS
- **Lambda**: Serviço de computação serverless da AWS
- **LocalStack**: Emulador de serviços AWS para desenvolvimento local
- **Recovery Window**: Período antes de deletar permanentemente um secret
- **Resource Policy**: Política de acesso anexada a um recurso específico
- **Rotation**: Processo de atualização automática de secrets
- **SecureString**: Tipo de parâmetro SSM criptografado com KMS
- **Version Stage**: Label de versão de secret (AWSCURRENT, AWSPENDING)
- **VPC Endpoint**: Endpoint privado para serviços AWS dentro de VPC
