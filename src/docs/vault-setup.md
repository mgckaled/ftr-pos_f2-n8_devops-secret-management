<!-- markdownlint-disable -->

# Vault Setup Guide

## Resumo Executivo

Este guia fornece instruções passo a passo para configurar e utilizar o HashiCorp Vault em modo desenvolvimento com este projeto. O Vault será executado via Docker Compose e configurado para armazenar secrets utilizando o KV v2 engine. O guia abrange desde a inicialização até a criação de secrets e integração com a aplicação Fastify.

## Introdução e Conceitos

### O que é HashiCorp Vault

HashiCorp Vault é uma ferramenta open-source para gerenciamento seguro de secrets, tokens, senhas, certificados e outros dados sensíveis. Principais características:

- **Secret Storage**: Armazenamento criptografado de dados sensíveis
- **Dynamic Secrets**: Geração de secrets sob demanda
- **Encryption as a Service**: API para criptografia de dados
- **Leasing and Renewal**: Secrets com tempo de vida configurável
- **Revocation**: Capacidade de revogar secrets instantaneamente

### Vault Development Mode

O modo de desenvolvimento do Vault:

- **Auto-unsealing**: Vault inicia automaticamente unsealed
- **In-Memory Storage**: Dados não persistem após restart
- **Root Token Pré-definido**: Token `root` configurado via environment
- **HTTP (não HTTPS)**: Comunicação sem TLS
- **Não recomendado para produção**: Apenas para desenvolvimento local

### Persistência de Dados em Dev Mode

IMPORTANTE: O Vault em modo desenvolvimento NÃO persiste dados após restart do container.

#### Por que os dados são perdidos

O Vault Dev Mode armazena todos os dados em memória (RAM), não em disco:

- **Storage In-Memory**: Todos os secrets existem apenas na RAM do container
- **Sem Volume Mapeado**: Container não possui volume persistente configurado
- **Comportamento Esperado**: Dev mode é projetado para testes rápidos e efêmeros
- **Restart = Reset**: Cada vez que o container reinicia, o Vault volta ao estado inicial

#### Workflow Recomendado

Sempre que reiniciar os containers Docker, siga este fluxo:

```bash
# 1. Parar containers
docker compose down

# 2. Iniciar containers
docker compose up -d

# 3. Aguardar health check (10-15 segundos)
docker compose ps

# 4. Executar setup do Vault (OBRIGATÓRIO)
pnpm setup:vault

# 5. Iniciar aplicação
pnpm demo:vault
```

O script `pnpm setup:vault` é rápido (aproximadamente 60ms) e:
- Verifica se o Vault está pronto
- Habilita KV v2 engine (se necessário)
- Cria todos os 7 secrets de exemplo
- Valida que os secrets foram criados corretamente

#### Comparação com LocalStack

| Característica | Vault Dev Mode | LocalStack |
|---|---|---|
| **Persistência** | Em memória (RAM) | Volume `./localstack-data` |
| **Após restart** | Dados perdidos | Dados mantidos |
| **Setup necessário** | Sempre após restart | Apenas primeira vez |
| **Tempo de setup** | ~60ms | ~1000ms |
| **Volume Docker** | Não configurado | Configurado |

#### Por que não adicionar volume ao Vault Dev Mode?

Adicionar volume ao Vault Dev Mode não resolve o problema porque:

1. **Dev Mode ignora storage backend**: O modo de desenvolvimento força storage in-memory
2. **Configuração específica**: Dev mode sobrescreve qualquer configuração de storage
3. **Simplicidade intencional**: Dev mode é projetado para ser simples e descartável

Para persistência real, seria necessário:
- Sair do dev mode
- Configurar Vault em modo production
- Definir storage backend (file, consul, etc.)
- Gerenciar unseal keys manualmente
- Configurar TLS/HTTPS

Isso adiciona complexidade desnecessária para um projeto didático.

## Pré-requisitos

### Ferramentas Necessárias

1. **Docker Desktop** (Windows/Mac) ou **Docker Engine** (Linux)
   - Versão 20.10 ou superior
   - Docker Compose v2 ou superior

2. **Node.js e pnpm**
   - Node.js 18+ ou 20+
   - pnpm 8+

3. **Verificação de Instalação**:

```bash
# Verificar Docker
docker --version
docker compose version

# Verificar Node.js e pnpm
node --version
pnpm --version
```

### Portas Utilizadas

- **8200**: Vault API e UI
- **3000**: Aplicação Fastify (default)

Certifique-se de que essas portas estão disponíveis:

```bash
# Windows PowerShell
netstat -ano | findstr :8200
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :8200
lsof -i :3000
```

## Configuração do Vault via Docker Compose

### Arquivo docker-compose.yml

O arquivo já está configurado no projeto:

```yaml
version: '3.8'

services:
  vault:
    image: hashicorp/vault:1.15
    container_name: vault-dev
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: 'root'
      VAULT_DEV_LISTEN_ADDRESS: '0.0.0.0:8200'
      VAULT_LOG_LEVEL: 'debug'
      VAULT_ADDR: 'http://127.0.0.1:8200'
    cap_add:
      - IPC_LOCK
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s
    networks:
      - secrets-net

networks:
  secrets-net:
    driver: bridge
```

### Variáveis de Ambiente Importantes

- **VAULT_DEV_ROOT_TOKEN_ID**: Token root para autenticação (desenvolvimento)
- **VAULT_DEV_LISTEN_ADDRESS**: Endereço onde Vault escuta
- **VAULT_LOG_LEVEL**: Nível de logging (debug, info, warn, error)

### Iniciando o Vault

1. **Iniciar o container**:

```bash
# Iniciar em background
docker compose up -d vault

# Verificar logs
docker compose logs -f vault
```

2. **Aguardar Health Check**:

```bash
# Verificar status do container
docker compose ps

# Deve mostrar "healthy" após alguns segundos
```

3. **Verificar UI do Vault**:

Acesse no navegador: http://localhost:8200/ui

- **Token**: `root`
- **Method**: Token

## Criação de Secrets no Vault

### Via Vault CLI (dentro do container)

1. **Acessar o container**:

```bash
docker compose exec vault sh
```

2. **Definir variáveis de ambiente**:

```bash
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='root'
```

3. **Habilitar KV v2 engine** (se não estiver habilitado):

```bash
# Verificar engines habilitados
vault secrets list

# Habilitar KV v2 no path 'secret/'
vault secrets enable -version=2 -path=secret kv
```

4. **Criar secrets**:

```bash
# Criar secret com múltiplas chaves
vault kv put secret/app-secrets \
  DATABASE_HOST=localhost \
  DATABASE_PORT=5432 \
  DATABASE_USER=postgres \
  DATABASE_PASSWORD=secure_password_123 \
  DATABASE_NAME=app_db \
  CLOUDFLARE_API_KEY=cf_api_key_example \
  NEW_RELIC_LICENSE_KEY=nr_license_key_example

# Verificar secret criado
vault kv get secret/app-secrets
```

5. **Ler secret específico**:

```bash
# Ler todos os valores
vault kv get -format=json secret/app-secrets

# Ler apenas um campo específico
vault kv get -field=DATABASE_PASSWORD secret/app-secrets
```

### Via Vault UI

1. **Acessar UI**: http://localhost:8200/ui (token: `root`)

2. **Navegar para Secrets Engine**:
   - Clique em "secret/" no menu lateral

3. **Criar Secret**:
   - Clique em "Create secret"
   - **Path**: `app-secrets`
   - **Secret data**:
     - Key: `DATABASE_HOST`, Value: `localhost`
     - Key: `DATABASE_PORT`, Value: `5432`
     - Key: `DATABASE_USER`, Value: `postgres`
     - Key: `DATABASE_PASSWORD`, Value: `secure_password_123`
     - Key: `DATABASE_NAME`, Value: `app_db`
     - Key: `CLOUDFLARE_API_KEY`, Value: `cf_api_key_example`
     - Key: `NEW_RELIC_LICENSE_KEY`, Value: `nr_license_key_example`
   - Clique em "Save"

4. **Verificar Secret**:
   - Navegue até `secret/app-secrets`
   - Clique no ícone de olho para revelar valores

### Via API HTTP

1. **Criar secret via curl**:

```bash
curl -X POST \
  -H "X-Vault-Token: root" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "DATABASE_HOST": "localhost",
      "DATABASE_PORT": "5432",
      "DATABASE_USER": "postgres",
      "DATABASE_PASSWORD": "secure_password_123",
      "DATABASE_NAME": "app_db",
      "CLOUDFLARE_API_KEY": "cf_api_key_example",
      "NEW_RELIC_LICENSE_KEY": "nr_license_key_example"
    }
  }' \
  http://localhost:8200/v1/secret/data/app-secrets
```

2. **Ler secret via curl**:

```bash
curl -X GET \
  -H "X-Vault-Token: root" \
  http://localhost:8200/v1/secret/data/app-secrets | jq
```

## Configuração da Aplicação

### Arquivo .env

Crie arquivo `.env` na raiz do projeto (use `.env.example` como base):

```bash
# Application
NODE_ENV=development
PORT=3000

# Secret Provider Selection
SECRET_PROVIDER=vault

# Vault Configuration
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=root
VAULT_SECRET_PATH=secret/data/app-secrets
```

### Estrutura do Path no KV v2

No Vault KV v2, o path real inclui `/data/`:

- **UI/CLI**: `secret/app-secrets`
- **API HTTP**: `secret/data/app-secrets`
- **Aplicação**: Configurar `VAULT_SECRET_PATH=secret/data/app-secrets`

## Testando a Integração

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Iniciar Aplicação

```bash
# Usando npm script
pnpm demo:vault

# Ou diretamente
pnpm dev
```

### 3. Verificar Logs

Logs devem mostrar:

```
[INFO] Loading secrets from provider { provider: 'vault' }
[INFO] Health check passed for provider { provider: 'vault' }
[INFO] Secrets loaded successfully { provider: 'vault', count: 7 }
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
  "provider": "vault",
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
  "provider": "vault",
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

Resposta esperada:

```json
{
  "configured": true,
  "host": "localhost",
  "port": "5432",
  "database": "app_db",
  "user": "postgres",
  "passwordLoaded": true,
  "connectionString": "postgresql://postgres:***@localhost:5432/app_db"
}
```

### 5. Acessar Documentação Interativa

Abra no navegador: http://localhost:3000/docs

A interface Scalar permite testar todos os endpoints interativamente.

## Operações Avançadas

### Versionamento de Secrets

KV v2 mantém histórico de versões:

#### Atualizar Secret

```bash
# Via CLI
vault kv put secret/app-secrets \
  DATABASE_PASSWORD=new_password_456

# Via API
curl -X POST \
  -H "X-Vault-Token: root" \
  -H "Content-Type: application/json" \
  -d '{"data": {"DATABASE_PASSWORD": "new_password_456"}}' \
  http://localhost:8200/v1/secret/data/app-secrets
```

#### Listar Versões

```bash
vault kv metadata get secret/app-secrets
```

#### Ler Versão Específica

```bash
# Ler versão 1
vault kv get -version=1 secret/app-secrets

# Via API
curl -X GET \
  -H "X-Vault-Token: root" \
  http://localhost:8200/v1/secret/data/app-secrets?version=1
```

#### Restaurar Versão Anterior

```bash
vault kv rollback -version=1 secret/app-secrets
```

### Deletar Secrets

#### Soft Delete (versão específica)

```bash
# Deleta última versão (pode ser recuperada)
vault kv delete secret/app-secrets

# Deleta versão específica
vault kv delete -versions=2 secret/app-secrets
```

#### Hard Delete (permanente)

```bash
# Deleta permanentemente versão específica
vault kv destroy -versions=1 secret/app-secrets

# Deleta permanentemente todas as versões
vault kv metadata delete secret/app-secrets
```

### Políticas de Acesso (ACL)

#### Criar Política

```bash
# Criar arquivo de política
cat > app-policy.hcl <<EOF
path "secret/data/app-secrets" {
  capabilities = ["read"]
}
EOF

# Aplicar política
vault policy write app-readonly app-policy.hcl
```

#### Criar Token com Política

```bash
# Criar token com política específica
vault token create -policy=app-readonly

# Usar token gerado na aplicação
export VAULT_TOKEN=<token-gerado>
```

## Troubleshooting

### Vault Sealed

**Sintoma**: Erro "Vault is sealed"

**Solução**: Em dev mode, Vault nunca deve ficar sealed. Se ocorrer:

```bash
# Restartar container
docker compose restart vault

# Verificar logs
docker compose logs vault
```

### Erro de Conexão

**Sintoma**: "Error connecting to Vault"

**Diagnóstico**:

```bash
# Verificar se container está rodando
docker compose ps

# Verificar health check
docker compose exec vault vault status

# Testar conectividade
curl http://localhost:8200/v1/sys/health
```

**Soluções**:

1. Verificar se `VAULT_ADDR` está correto no `.env`
2. Verificar se porta 8200 não está bloqueada por firewall
3. Verificar logs do container

### Secret Not Found

**Sintoma**: "Secret not found at path"

**Diagnóstico**:

```bash
# Listar secrets disponíveis
vault kv list secret/

# Verificar path correto
vault kv get secret/app-secrets
```

**Soluções**:

1. Verificar se path inclui `/data/` para API: `secret/data/app-secrets`
2. Criar secret se não existir
3. Verificar permissões do token

### Permission Denied

**Sintoma**: "Permission denied"

**Diagnóstico**:

```bash
# Verificar token atual
echo $VAULT_TOKEN

# Verificar capacidades do token
vault token capabilities secret/data/app-secrets
```

**Soluções**:

1. Usar token `root` em desenvolvimento
2. Verificar políticas aplicadas ao token
3. Criar nova política com permissões adequadas

## Boas Práticas

### Desenvolvimento

1. **Não commitar secrets**: Sempre usar `.env` no `.gitignore`
2. **Usar secrets de exemplo**: Não usar senhas reais em desenvolvimento
3. **Documentar paths**: Manter lista de paths de secrets no README
4. **Restart após mudanças**: Reiniciar aplicação após atualizar secrets no Vault

### Organização de Secrets

1. **Namespacing**: Usar paths hierárquicos:
   - `secret/data/app/production`
   - `secret/data/app/staging`
   - `secret/data/app/development`

2. **Agrupamento lógico**: Agrupar secrets relacionados:
   - `secret/data/database` - Credenciais de banco
   - `secret/data/external-apis` - API keys de serviços externos
   - `secret/data/certificates` - Certificados e chaves

3. **Naming conventions**: Usar nomes descritivos:
   - `DATABASE_URL` ao invés de `DB`
   - `STRIPE_SECRET_KEY` ao invés de `KEY1`

### Segurança

1. **Rotação regular**: Atualizar secrets periodicamente
2. **Princípio do menor privilégio**: Usar políticas restritivas
3. **Auditoria**: Revisar logs de acesso ao Vault
4. **Token TTL**: Em produção, usar tokens com tempo de vida limitado

## Migração para Produção

### Diferenças do Dev Mode

| Aspecto | Development | Production |
|---------|-------------|------------|
| Storage | In-memory | Persistent (Consul, File, Cloud) |
| Unsealing | Automático | Manual ou auto-unseal |
| TLS | Não | Obrigatório |
| Root Token | Pré-definido | Gerado no init |
| HA | Não | Recomendado |

### Checklist para Produção

1. **Infraestrutura**:
   - [ ] Configurar storage backend persistente
   - [ ] Configurar TLS/HTTPS
   - [ ] Configurar High Availability (3+ nodes)
   - [ ] Configurar auto-unseal (Cloud KMS)

2. **Segurança**:
   - [ ] Gerar root token no init e guardá-lo seguramente
   - [ ] Criar políticas de acesso granulares
   - [ ] Configurar audit logging
   - [ ] Implementar rotação automática de secrets

3. **Aplicação**:
   - [ ] Usar tokens com TTL limitado
   - [ ] Implementar renovação automática de tokens
   - [ ] Configurar retry logic robusto
   - [ ] Monitorar saúde do Vault

4. **Monitoramento**:
   - [ ] Configurar alertas de saúde do Vault
   - [ ] Monitorar métricas de performance
   - [ ] Configurar dashboards de auditoria

## Conclusões

### Benefícios do Vault

1. **Centralização**: Único ponto para gerenciar todos os secrets
2. **Versionamento**: Histórico completo de mudanças
3. **Auditoria**: Logs detalhados de todos os acessos
4. **Flexibilidade**: Suporte a múltiplos backends e auth methods

### Limitações em Dev Mode

1. **Não persistente**: Secrets perdidos após restart
2. **Sem TLS**: Comunicação não criptografada
3. **Token estático**: Root token fixo

### Quando Usar Vault

- **Múltiplos ambientes**: Staging, Production, DR
- **Múltiplas aplicações**: Compartilhamento seguro de secrets
- **Compliance**: Requisitos de auditoria e rotação
- **Dynamic secrets**: Geração de credenciais sob demanda

## Referências Bibliográficas

1. HashiCorp. (2024). Vault Documentation. https://developer.hashicorp.com/vault/docs
2. HashiCorp. (2024). Vault API Documentation. https://developer.hashicorp.com/vault/api-docs
3. HashiCorp. (2024). KV Secrets Engine - Version 2. https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
4. HashiCorp. (2024). Production Hardening. https://developer.hashicorp.com/vault/tutorials/operations/production-hardening
5. HashiCorp. (2024). Vault Policies. https://developer.hashicorp.com/vault/docs/concepts/policies

## Apêndice

### Comandos Úteis do Vault CLI

```bash
# Status do Vault
vault status

# Listar secrets engines
vault secrets list

# Listar auth methods
vault auth list

# Listar políticas
vault policy list

# Ler política
vault policy read <policy-name>

# Informações do token atual
vault token lookup

# Renovar token
vault token renew

# Listar secrets em um path
vault kv list secret/

# Metadata de um secret
vault kv metadata get secret/app-secrets

# Criar snapshot (backup)
vault operator raft snapshot save backup.snap
```

### Glossário e Termos Técnicos

- **ACL (Access Control List)**: Lista de permissões para controlar acesso
- **Auto-unseal**: Processo automático de unsealing do Vault usando Cloud KMS
- **Backend**: Sistema de armazenamento usado pelo Vault
- **Dev Mode**: Modo de desenvolvimento do Vault (não seguro)
- **Dynamic Secret**: Secret gerado sob demanda com TTL
- **Engine**: Componente do Vault que fornece funcionalidade específica
- **HA (High Availability)**: Configuração de múltiplos nodes para redundância
- **KV (Key-Value)**: Tipo de secrets engine para armazenamento chave-valor
- **Lease**: Período de validade de um secret
- **Path**: Localização de um secret no Vault
- **Policy**: Conjunto de regras de acesso no Vault
- **Root Token**: Token com permissões administrativas completas
- **Seal/Unseal**: Estado do Vault (lacrado ou operacional)
- **TTL (Time To Live)**: Tempo de vida de um secret ou token
- **Versioning**: Manutenção de histórico de versões de secrets
