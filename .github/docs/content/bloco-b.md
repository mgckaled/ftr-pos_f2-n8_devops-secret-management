<!-- markdownlint-disable -->

# Bloco B - AWS Secrets Manager, Systems Manager e KMS

## 1. Resumo Executivo

O Bloco B apresenta o ecossistema de gerenciamento de segredos e configurações da Amazon Web Services (AWS), explorando três serviços fundamentais: AWS Secrets Manager, AWS Systems Manager Parameter Store e AWS Key Management Service (KMS). O conteúdo demonstra como esses serviços se complementam para criar uma arquitetura robusta de gerenciamento de informações sensíveis em ambientes cloud-native, com foco em integração com aplicações Node.js utilizando AWS SDK v3.

O módulo estabelece as diferenças funcionais entre cada serviço, suas aplicações específicas e como implementá-los de forma prática em cenários reais de DevOps, incluindo configuração de credenciais AWS, manipulação de secrets via API, criptografia com KMS e rotação automatizada de credenciais para serviços gerenciados como RDS e DocumentDB.

## 2. Introdução e Conceitos

### 2.1. O Ecossistema AWS para Segredos

A Amazon Web Services oferece um conjunto integrado de serviços para gerenciamento de informações sensíveis, cada um com propósitos e características distintas:

**AWS Secrets Manager**: Serviço especializado no gerenciamento completo do ciclo de vida de segredos, incluindo rotação automatizada, versionamento e integração nativa com serviços AWS gerenciados.

**AWS Systems Manager Parameter Store**: Armazenamento centralizado para dados de configuração e strings de parâmetros, com suporte a hierarquias e tipos de dados (String, SecureString, StringList).

**AWS Key Management Service (KMS)**: Serviço de gerenciamento de chaves de criptografia, responsável por criar, controlar e gerenciar chaves criptográficas utilizadas para proteger dados em repouso e em trânsito.

### 2.2. AWS Secrets Manager

#### 2.2.1. Características Principais

O AWS Secrets Manager foi projetado especificamente para gerenciar segredos com alta sensibilidade:

- **Rotação Automatizada**: Suporte nativo para rotação de credenciais em serviços como RDS, DocumentDB, Redshift e bancos de dados customizados.
- **Versionamento**: Mantém histórico completo de versões de secrets, permitindo rollback e auditoria.
- **Criptografia Nativa**: Todos os secrets são criptografados em repouso usando KMS.
- **Replicação Multi-Região**: Capacidade de replicar secrets para múltiplas regiões AWS.
- **Integração Profunda**: APIs e SDKs para integração com aplicações e serviços AWS.

#### 2.2.2. Modelo de Precificação

O Secrets Manager opera em um modelo pay-per-use:

- USD 0.40 por secret armazenado por mês
- USD 0.05 a cada 10.000 chamadas de API
- 30 dias de trial gratuito para novos secrets

**Exemplo de Custo**:
- 100 secrets = USD 40.00/mês
- 1 milhão de chamadas API = USD 5.00

#### 2.2.3. Casos de Uso Recomendados

- Credenciais de banco de dados com rotação automática
- Chaves de API de terceiros com versionamento
- Certificados SSL/TLS com renovação programada
- Tokens de acesso OAuth com refresh automático
- Credenciais de aplicações distribuídas

### 2.3. AWS Systems Manager Parameter Store

#### 2.3.1. Características Principais

O Parameter Store oferece armazenamento hierárquico de configurações:

- **Hierarquia de Parâmetros**: Organização em estrutura de árvore (`/environment/application/parameter`).
- **Tipos de Dados**:
  - **String**: Texto simples não criptografado.
  - **SecureString**: Texto criptografado com KMS.
  - **StringList**: Lista de valores separados por vírgula.
- **Tiers de Serviço**:
  - **Standard**: Até 10.000 parâmetros gratuitos, valores até 4 KB.
  - **Advanced**: Valores até 8 KB, políticas de expiração, preço por parâmetro armazenado.
- **Integração com CloudFormation**: Suporte a referências dinâmicas em templates.

#### 2.3.2. Modelo de Precificação

- **Standard Tier**: Gratuito para armazenamento, USD 0.05 por 10.000 chamadas de API (acima do free tier).
- **Advanced Tier**: USD 0.05 por parâmetro avançado por mês.

#### 2.3.3. Casos de Uso Recomendados

- Variáveis de configuração de aplicações
- Feature flags e parâmetros de comportamento
- Strings de conexão não sensíveis
- Configurações de infraestrutura (AMI IDs, VPC IDs)
- Parâmetros de automação e scripts

### 2.4. AWS Key Management Service (KMS)

#### 2.4.1. Características Principais

O KMS é o serviço central de criptografia da AWS:

- **Tipos de Chaves**:
  - **Symmetric Keys**: Chave única para criptografia e descriptografia (AES-256).
  - **Asymmetric Keys**: Par de chaves pública/privada para assinatura e verificação (RSA, ECC).
- **Gerenciamento de Chaves**:
  - **AWS Managed Keys**: Criadas e gerenciadas automaticamente pela AWS (`aws/service-name`).
  - **Customer Managed Keys (CMK)**: Criadas e controladas pelo cliente com políticas customizadas.
- **Rotação Automática**: Rotação anual automática para chaves simétricas.
- **Auditoria**: Integração com CloudTrail para log de todas as operações de chave.

#### 2.4.2. Modelo de Precificação

- **Customer Managed Keys**: USD 1.00 por chave por mês.
- **Requests**: USD 0.03 por 10.000 requests (varia por tipo de operação).
- **AWS Managed Keys**: Gratuitas.

#### 2.4.3. Casos de Uso Recomendados

- Criptografia de dados em S3, EBS, RDS
- Assinatura digital de artefatos e mensagens
- Geração de chaves para aplicações (Data Encryption Keys)
- Criptografia client-side em aplicações
- Proteção de secrets no Secrets Manager e Parameter Store

### 2.5. Comparação entre Serviços

| Característica | Secrets Manager | Parameter Store | KMS |
|---|---|---|---|
| Propósito Principal | Gerenciamento de secrets | Armazenamento de configurações | Gerenciamento de chaves de criptografia |
| Rotação Automática | Sim (nativa) | Não (requer Lambda) | Sim (para chaves simétricas) |
| Versionamento | Sim | Sim (limitado) | N/A |
| Criptografia | Obrigatória (KMS) | Opcional (SecureString) | N/A (é o serviço de criptografia) |
| Custo | USD 0.40/secret/mês | Gratuito (Standard) | USD 1.00/chave/mês (CMK) |
| Limite de Tamanho | 65 KB | 4 KB (Standard), 8 KB (Advanced) | 4 KB (dados diretos) |
| Integração com RDS | Nativa | Manual | Suporte (criptografia) |
| Replicação Multi-Região | Sim | Não | Sim (Multi-Region Keys) |

## 3. Implementação Prática com Node.js

### 3.1. Configuração Inicial da AWS

#### 3.1.1. Instalação e Configuração do AWS CLI

```bash
# Instalação do AWS CLI v2 (Windows)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Instalação do AWS CLI v2 (Linux/macOS)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verificar instalação
aws --version
```

#### 3.1.2. Configuração de Credenciais

```bash
# Configurar credenciais AWS
aws configure

# Entrada de valores
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

Estrutura de arquivos de configuração:

```plaintext
~/.aws/
├── credentials
│   [default]
│   aws_access_key_id = AKIAIOSFODNN7EXAMPLE
│   aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
│
└── config
    [default]
    region = us-east-1
    output = json
```

### 3.2. AWS Systems Manager Parameter Store

#### 3.2.1. Instalação do SDK

```bash
pnpm install @aws-sdk/client-ssm
```

#### 3.2.2. Configuração do Cliente SSM

Arquivo `src/infra/aws.ts`:

```typescript
import { SSMClient } from '@aws-sdk/client-ssm';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { KMSClient } from '@aws-sdk/client-kms';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

export const ssmClient = new SSMClient({
  region: AWS_REGION,
});

export const secretsManagerClient = new SecretsManagerClient({
  region: AWS_REGION,
});

export const kmsClient = new KMSClient({
  region: AWS_REGION,
});
```

#### 3.2.3. Criação de Parâmetros via AWS CLI

```bash
# Criar parâmetro String (não criptografado)
aws ssm put-parameter \
  --name "/staging/widget-server/CLOUDFLARE_ENDPOINT" \
  --value "https://api.cloudflare.com/client/v4" \
  --type "String" \
  --description "Cloudflare API endpoint" \
  --tags "Key=Environment,Value=staging" "Key=IAC,Value=false"

# Criar parâmetro SecureString (criptografado)
aws ssm put-parameter \
  --name "/staging/widget-server/CLOUDFLARE_ACCESS_KEY_ID" \
  --value "your-access-key-id" \
  --type "SecureString" \
  --description "Cloudflare access key ID" \
  --tags "Key=Environment,Value=staging" "Key=IAC,Value=false"

# Listar parâmetros por path
aws ssm get-parameters-by-path \
  --path "/staging/widget-server" \
  --recursive
```

#### 3.2.4. Leitura de Parâmetros no Node.js

```typescript
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { ssmClient } from './infra/aws';
import { logger } from './infra/logger';

async function getParameter(name: string, withDecryption = true): Promise<string> {
  try {
    const command = new GetParameterCommand({
      Name: name,
      WithDecryption: withDecryption,
    });

    const response = await ssmClient.send(command);

    if (!response.Parameter?.Value) {
      throw new Error(`Parameter ${name} not found or has no value`);
    }

    return response.Parameter.Value;
  } catch (error) {
    logger.error(`Failed to retrieve parameter: ${name}`, { error });
    throw error;
  }
}

// Exemplo de uso no bootstrap
async function loadConfigFromSSM() {
  const cloudflareEndpoint = await getParameter(
    '/staging/widget-server/CLOUDFLARE_ENDPOINT',
    false // Não precisa descriptografar
  );

  const cloudflareAccessKeyId = await getParameter(
    '/staging/widget-server/CLOUDFLARE_ACCESS_KEY_ID',
    true // Descriptografar SecureString
  );

  process.env.CLOUDFLARE_ENDPOINT = cloudflareEndpoint;
  process.env.CLOUDFLARE_ACCESS_KEY_ID = cloudflareAccessKeyId;

  logger.info('Configuration loaded from SSM Parameter Store');
}
```

#### 3.2.5. Leitura em Lote de Parâmetros

```typescript
import { GetParametersByPathCommand } from '@aws-sdk/client-ssm';

async function loadAllParametersByPath(path: string): Promise<Record<string, string>> {
  const parameters: Record<string, string> = {};
  let nextToken: string | undefined;

  do {
    const command = new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken,
    });

    const response = await ssmClient.send(command);

    response.Parameters?.forEach((param) => {
      if (param.Name && param.Value) {
        // Extrair apenas o nome da variável (última parte do path)
        const paramName = param.Name.split('/').pop()!;
        parameters[paramName] = param.Value;
      }
    });

    nextToken = response.NextToken;
  } while (nextToken);

  return parameters;
}

// Uso
const config = await loadAllParametersByPath('/staging/widget-server');
Object.entries(config).forEach(([key, value]) => {
  process.env[key] = value;
});
```

### 3.3. AWS Key Management Service (KMS)

#### 3.3.1. Criação de Customer Managed Key via AWS CLI

```bash
# Criar chave simétrica CMK
aws kms create-key \
  --description "Rocketseat Widget Server encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT \
  --origin AWS_KMS \
  --multi-region false \
  --tags TagKey=Environment,TagValue=staging TagKey=IAC,TagValue=false

# Criar alias para a chave
aws kms create-alias \
  --alias-name alias/rocketseat-widget-server \
  --target-key-id <key-id>

# Habilitar rotação automática
aws kms enable-key-rotation \
  --key-id <key-id>

# Verificar status de rotação
aws kms get-key-rotation-status \
  --key-id <key-id>
```

#### 3.3.2. Política de Chave (Key Policy)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow application to decrypt",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/widget-server-app"
      },
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

#### 3.3.3. Descriptografia Manual com KMS

```typescript
import { DecryptCommand } from '@aws-sdk/client-kms';
import { kmsClient } from './infra/aws';

async function decryptWithKMS(encryptedValue: string): Promise<string> {
  try {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedValue, 'base64'),
    });

    const response = await kmsClient.send(command);

    if (!response.Plaintext) {
      throw new Error('Decryption failed: no plaintext returned');
    }

    const decoder = new TextDecoder();
    return decoder.decode(response.Plaintext);
  } catch (error) {
    logger.error('KMS decryption failed', { error });
    throw error;
  }
}
```

#### 3.3.4. Criptografia de Dados com KMS

```typescript
import { EncryptCommand } from '@aws-sdk/client-kms';

async function encryptWithKMS(plaintext: string, keyId: string): Promise<string> {
  const command = new EncryptCommand({
    KeyId: keyId,
    Plaintext: Buffer.from(plaintext, 'utf-8'),
  });

  const response = await kmsClient.send(command);

  if (!response.CiphertextBlob) {
    throw new Error('Encryption failed: no ciphertext returned');
  }

  return Buffer.from(response.CiphertextBlob).toString('base64');
}
```

### 3.4. AWS Secrets Manager

#### 3.4.1. Instalação do SDK

```bash
pnpm install @aws-sdk/client-secrets-manager
```

#### 3.4.2. Criação de Secret via AWS CLI

```bash
# Criar secret com múltiplos valores
aws secretsmanager create-secret \
  --name "/staging/widget-server" \
  --description "Widget Server application secrets" \
  --secret-string '{
    "CLOUDFLARE_ACCESS_KEY_ID": "your-access-key",
    "CLOUDFLARE_SECRET_ACCESS_KEY": "your-secret-key",
    "DATABASE_PASSWORD": "your-db-password",
    "NEW_RELIC_LICENSE_KEY": "your-newrelic-key"
  }' \
  --kms-key-id alias/rocketseat-widget-server \
  --tags Key=Environment,Value=staging Key=IAC,Value=false

# Atualizar secret existente
aws secretsmanager update-secret \
  --secret-id "/staging/widget-server" \
  --secret-string '{
    "CLOUDFLARE_ACCESS_KEY_ID": "new-access-key",
    "CLOUDFLARE_SECRET_ACCESS_KEY": "new-secret-key"
  }'

# Listar secrets
aws secretsmanager list-secrets

# Descrever secret específico
aws secretsmanager describe-secret \
  --secret-id "/staging/widget-server"
```

#### 3.4.3. Leitura de Secrets no Node.js

```typescript
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { secretsManagerClient } from './infra/aws';

async function getSecret(secretId: string): Promise<Record<string, string>> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: secretId,
    });

    const response = await secretsManagerClient.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretId} has no SecretString value`);
    }

    return JSON.parse(response.SecretString);
  } catch (error) {
    logger.error(`Failed to retrieve secret: ${secretId}`, { error });
    throw error;
  }
}

// Uso no bootstrap da aplicação
async function loadSecretsFromAWS() {
  const secrets = await getSecret('/staging/widget-server');

  Object.entries(secrets).forEach(([key, value]) => {
    process.env[key] = value;
  });

  logger.info('Secrets loaded from AWS Secrets Manager', {
    secretId: '/staging/widget-server',
    keys: Object.keys(secrets),
  });
}
```

#### 3.4.4. Configuração de Rotação Automática

```bash
# Configurar rotação automática (a cada 30 dias)
aws secretsmanager rotate-secret \
  --secret-id "/staging/widget-server" \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRotation \
  --rotation-rules "{\"AutomaticallyAfterDays\": 30}"

# Forçar rotação imediata
aws secretsmanager rotate-secret \
  --secret-id "/staging/widget-server"
```

### 3.5. Estrutura Completa de Bootstrap

Arquivo `src/server.ts`:

```typescript
import { ssmClient, secretsManagerClient } from './infra/aws';
import { GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from './infra/logger';

async function loadConfiguration() {
  try {
    // Carregar configurações não sensíveis do Parameter Store
    const parameterCommand = new GetParametersByPathCommand({
      Path: '/staging/widget-server/config',
      Recursive: true,
      WithDecryption: false,
    });

    const parameterResponse = await ssmClient.send(parameterCommand);
    parameterResponse.Parameters?.forEach((param) => {
      if (param.Name && param.Value) {
        const paramName = param.Name.split('/').pop()!;
        process.env[paramName] = param.Value;
      }
    });

    // Carregar secrets do Secrets Manager
    const secretCommand = new GetSecretValueCommand({
      SecretId: '/staging/widget-server',
    });

    const secretResponse = await secretsManagerClient.send(secretCommand);
    if (secretResponse.SecretString) {
      const secrets = JSON.parse(secretResponse.SecretString);
      Object.entries(secrets).forEach(([key, value]) => {
        process.env[key] = value as string;
      });
    }

    logger.info('Configuration loaded successfully from AWS');
  } catch (error) {
    logger.error('Failed to load configuration from AWS', { error });
    process.exit(1);
  }
}

async function bootstrap() {
  await loadConfiguration();

  const app = await createApp();
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
}

bootstrap();
```

## 4. Conclusões

### 4.1. Principais Aprendizados

O Bloco B estabeleceu compreensão prática dos serviços AWS para gerenciamento de segredos e configurações:

1. **Complementaridade de Serviços**: Secrets Manager, Parameter Store e KMS formam um ecossistema integrado onde cada serviço atende necessidades específicas.

2. **Trade-offs de Custo vs Funcionalidade**: A escolha entre Parameter Store (gratuito/barato) e Secrets Manager (mais caro) depende da necessidade de rotação automática e integração nativa.

3. **Importância do KMS**: Todas as operações de criptografia na AWS passam pelo KMS, tornando seu entendimento fundamental para segurança.

4. **AWS SDK v3**: A migração da AWS para SDK v3 trouxe arquitetura modular baseada em comandos, melhorando tree-shaking e reduzindo tamanho de bundles.

### 4.2. Comparação com HashiCorp Vault

| Aspecto | AWS (Secrets Manager + SSM + KMS) | HashiCorp Vault |
|---|---|---|
| Vendor Lock-in | Alto (específico AWS) | Baixo (multi-cloud) |
| Custo | Pay-per-use (variável) | Licença + Infraestrutura |
| Rotação Automática | Nativa para serviços AWS | Configurável para qualquer serviço |
| Gestão | Totalmente gerenciado | Self-hosted ou HCP |
| Curva de Aprendizado | Moderada | Alta |
| Integração AWS | Nativa e profunda | Requer configuração |

### 4.3. Próximos Passos

O conhecimento adquirido prepara para integrações avançadas:

1. **Kubernetes e AWS**: External Secrets Operator para sincronização automática de secrets do Secrets Manager para Kubernetes Secrets.

2. **CI/CD Pipelines**: Injeção de secrets em pipelines GitHub Actions, GitLab CI usando AWS assumeRole.

3. **Terraform**: Provisionamento de secrets, parâmetros e chaves KMS como Infrastructure as Code.

4. **Monitoramento**: CloudWatch Logs e CloudTrail para auditoria de acesso a secrets e uso de KMS.

## 5. Referências Bibliográficas

### 5.1. Documentação Oficial AWS

AMAZON WEB SERVICES. **AWS Secrets Manager Documentation**. AWS Documentation, 2024. Disponível em: https://docs.aws.amazon.com/secretsmanager/. Acesso em: 12 nov. 2024.

AMAZON WEB SERVICES. **AWS Systems Manager Documentation**. AWS Documentation, 2024. Disponível em: https://docs.aws.amazon.com/systems-manager/. Acesso em: 12 nov. 2024.

AMAZON WEB SERVICES. **AWS Key Management Service Documentation**. AWS Documentation, 2024. Disponível em: https://docs.aws.amazon.com/kms/. Acesso em: 12 nov. 2024.

AMAZON WEB SERVICES. **AWS SDK for JavaScript v3**. AWS Documentation, 2024. Disponível em: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/. Acesso em: 12 nov. 2024.

### 5.2. Bibliotecas e SDKs

AMAZON WEB SERVICES. **@aws-sdk/client-secrets-manager**. NPM Registry, 2024. Disponível em: https://www.npmjs.com/package/@aws-sdk/client-secrets-manager. Acesso em: 12 nov. 2024.

AMAZON WEB SERVICES. **@aws-sdk/client-ssm**. NPM Registry, 2024. Disponível em: https://www.npmjs.com/package/@aws-sdk/client-ssm. Acesso em: 12 nov. 2024.

AMAZON WEB SERVICES. **@aws-sdk/client-kms**. NPM Registry, 2024. Disponível em: https://www.npmjs.com/package/@aws-sdk/client-kms. Acesso em: 12 nov. 2024.

### 5.3. Integrações e Ferramentas

EXTERNAL SECRETS. **External Secrets Operator for Kubernetes**. External Secrets, 2024. Disponível em: https://external-secrets.io/latest/provider/aws-secrets-manager/. Acesso em: 12 nov. 2024.

HASHICORP. **Terraform AWS Provider - Secrets Manager**. Terraform Registry, 2024. Disponível em: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret. Acesso em: 12 nov. 2024.

### 5.4. Segurança e Best Practices

AMAZON WEB SERVICES. **AWS Security Best Practices**. AWS Whitepapers, 2024. Disponível em: https://aws.amazon.com/security/best-practices/. Acesso em: 12 nov. 2024.

AMAZON WEB SERVICES. **AWS Well-Architected Framework - Security Pillar**. AWS Documentation, 2024. Disponível em: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/. Acesso em: 12 nov. 2024.

## 6. Apêndices

### Apêndice A: Comandos AWS CLI Essenciais

#### A.1. Secrets Manager

```bash
# Criar secret
aws secretsmanager create-secret --name my-secret --secret-string "my-secret-value"

# Obter valor do secret
aws secretsmanager get-secret-value --secret-id my-secret

# Atualizar secret
aws secretsmanager update-secret --secret-id my-secret --secret-string "new-value"

# Deletar secret (com período de recuperação)
aws secretsmanager delete-secret --secret-id my-secret --recovery-window-in-days 30

# Restaurar secret deletado
aws secretsmanager restore-secret --secret-id my-secret

# Listar versões do secret
aws secretsmanager list-secret-version-ids --secret-id my-secret
```

#### A.2. Systems Manager Parameter Store

```bash
# Criar parâmetro String
aws ssm put-parameter --name /my/parameter --value "my-value" --type String

# Criar parâmetro SecureString
aws ssm put-parameter --name /my/secure-param --value "secret" --type SecureString

# Obter parâmetro
aws ssm get-parameter --name /my/parameter

# Obter parâmetro com descriptografia
aws ssm get-parameter --name /my/secure-param --with-decryption

# Obter múltiplos parâmetros por path
aws ssm get-parameters-by-path --path /my --recursive

# Deletar parâmetro
aws ssm delete-parameter --name /my/parameter
```

#### A.3. KMS

```bash
# Criar chave
aws kms create-key --description "My encryption key"

# Criar alias
aws kms create-alias --alias-name alias/my-key --target-key-id <key-id>

# Criptografar dados
aws kms encrypt --key-id alias/my-key --plaintext "my data" --output text --query CiphertextBlob

# Descriptografar dados
aws kms decrypt --ciphertext-blob fileb://encrypted.txt --output text --query Plaintext

# Habilitar rotação automática
aws kms enable-key-rotation --key-id <key-id>

# Listar chaves
aws kms list-keys
```

### Apêndice B: Glossário e Termos Técnicos

**AWS Managed Key**: Chave KMS criada e gerenciada automaticamente pela AWS para um serviço específico (prefixo `aws/`).

**CMK (Customer Managed Key)**: Chave KMS criada e gerenciada pelo cliente com controle total sobre políticas e rotação.

**Ciphertext**: Dados criptografados, ilegíveis sem descriptografia.

**CloudTrail**: Serviço AWS para auditoria de chamadas de API e ações na conta.

**Data Encryption Key (DEK)**: Chave gerada pelo KMS para criptografar grandes volumes de dados.

**Envelope Encryption**: Técnica onde dados são criptografados com DEK, e a DEK é criptografada com CMK.

**IAM (Identity and Access Management)**: Serviço AWS para gerenciamento de identidades e permissões.

**Key Policy**: Política de acesso específica de uma chave KMS que define quem pode usar e gerenciar a chave.

**Plaintext**: Dados não criptografados, legíveis.

**Recovery Window**: Período de tempo durante o qual um secret deletado pode ser restaurado (7-30 dias).

**Rotation**: Processo de substituição de credenciais ou chaves por novas versões.

**SecureString**: Tipo de parâmetro do Parameter Store criptografado com KMS.

**Secret**: Informação sensível armazenada no Secrets Manager.

**Symmetric Encryption**: Criptografia que usa a mesma chave para criptografar e descriptografar.

**Asymmetric Encryption**: Criptografia que usa par de chaves (pública/privada).

**Versioning**: Manutenção de múltiplas versões de um secret ou parâmetro.
