<!-- markdownlint-disable -->

# Fastify v5 Migration Notes

## Status da Migração

Após análise do código, o projeto está **compatível com Fastify v5** com apenas ajustes mínimos necessários.

## Verificações Realizadas

### APIs Depreciadas (Não Encontradas)
- ✓ `request.connection` - NÃO UTILIZADO
- ✓ `reply.sent` - NÃO UTILIZADO
- ✓ `reply.getResponseTime()` - NÃO UTILIZADO
- ✓ `jsonShortHand` - NÃO UTILIZADO

### Configurações Corretas
- ✓ Logger configurado inline (não custom logger)
- ✓ Schemas Zod completos e válidos
- ✓ Type Provider configurado corretamente

## Mudanças Necessárias

### 1. Node.js Version

O projeto já requer Node.js 20+ conforme `package.json`:

```json
"engines": {
  "node": ">=20.0.0",
  "pnpm": ">=8.0.0"
}
```

✓ Nenhuma alteração necessária.

### 2. Fastify Type Provider Zod

A biblioteca `fastify-type-provider-zod` foi atualizada para v4.0.0 que suporta Fastify v5.

**Possíveis Breaking Changes:**
- Verificar se a API do `validatorCompiler` e `serializerCompiler` mudou
- Testar se `.withTypeProvider<ZodTypeProvider>()` ainda funciona

### 3. Plugins do Fastify

Todos os plugins foram atualizados para versões compatíveis com Fastify v5:

- `@fastify/helmet`: 11.1.1 → 13.0.2
- `@fastify/cors`: 9.0.1 → 11.1.0
- `@fastify/rate-limit`: 9.1.0 → 10.3.0
- `@fastify/swagger`: 8.15.0 → 10.2.0
- `@fastify/swagger-ui`: 4.1.0 → 6.2.0
- `@scalar/fastify-api-reference`: 1.25.0 → 2.8.0

**Ações necessárias:**
- Verificar se há breaking changes nos plugins individuais
- Testar integração do Scalar com nova versão

## Testes Recomendados

Após executar `pnpm install`, testar:

### 1. Inicialização da Aplicação

```bash
pnpm demo:vault
```

Verificar:
- ✓ Aplicação inicia sem erros
- ✓ Logger funciona corretamente
- ✓ Plugins carregam sem warnings

### 2. Health Endpoint

```bash
curl http://localhost:3000/health | jq
```

Verificar:
- ✓ Response com status 200
- ✓ JSON válido
- ✓ Validação Zod funcionando

### 3. Documentação Scalar

Acessar: http://localhost:3000/docs

Verificar:
- ✓ Interface Scalar carrega
- ✓ Todos endpoints listados
- ✓ Schemas exibidos corretamente

### 4. Demo Endpoints

```bash
curl http://localhost:3000/demo/secrets-info | jq
curl http://localhost:3000/demo/database-status | jq
curl http://localhost:3000/demo/provider-comparison | jq
```

Verificar:
- ✓ Todas as rotas respondem
- ✓ Masking de secrets funciona
- ✓ Validação de schemas funciona

### 5. Rate Limiting

```bash
# Fazer múltiplas requisições rápidas
for i in {1..110}; do curl http://localhost:3000/health -w "\n"; done
```

Verificar:
- ✓ Rate limit aplica após 100 requisições
- ✓ Response 429 (Too Many Requests)

### 6. Security Headers

```bash
curl -I http://localhost:3000/health
```

Verificar headers:
- ✓ `X-Content-Type-Options: nosniff`
- ✓ `X-Frame-Options: DENY`
- ✓ `Strict-Transport-Security`
- ✓ `Content-Security-Policy`

## Possíveis Problemas e Soluções

### Problema 1: fastify-type-provider-zod não compatível

**Sintoma**: Erro ao iniciar sobre TypeProvider

**Solução**:
```typescript
// Se necessário, verificar nova API do fastify-type-provider-zod v4
import { createTypeProvider } from 'fastify-type-provider-zod';

const app = Fastify().withTypeProvider(createTypeProvider());
```

### Problema 2: Scalar não renderiza

**Sintoma**: Página /docs vazia ou erro

**Solução**:
Verificar configuração CSP no Helmet. Pode ser necessário ajustar diretivas:

```typescript
contentSecurityPolicy: {
  directives: {
    // Adicionar se necessário
    scriptSrcAttr: ["'unsafe-inline'"],
    // ou desabilitar CSP apenas para /docs
  }
}
```

### Problema 3: Swagger plugins incompatíveis

**Sintoma**: Erro ao registrar @fastify/swagger

**Solução**:
Verificar se ordem de registro mudou ou se há nova configuração necessária.

## Rollback Plan

Se houver problemas críticos, reverter para Fastify v4:

```json
{
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/swagger": "^8.15.0",
    "@fastify/swagger-ui": "^4.1.0",
    "@scalar/fastify-api-reference": "^1.25.0",
    "fastify-type-provider-zod": "^2.0.0",
    "@fastify/helmet": "^11.1.1",
    "@fastify/cors": "^9.0.1",
    "@fastify/rate-limit": "^9.1.0"
  }
}
```

Depois:
```bash
pnpm install
pnpm demo:vault
```

## Próximos Passos

1. Executar `pnpm install` para instalar novas versões
2. Executar testes listados acima
3. Verificar logs do Fastify para deprecation warnings
4. Atualizar documentação se necessário
5. Commit das mudanças

## Referências

- Fastify v5 Migration Guide: https://fastify.dev/docs/v5.0.x/Guides/Migration-Guide-V5/
- fastify-type-provider-zod: https://github.com/turkerdev/fastify-type-provider-zod
- @fastify/helmet changelog: https://github.com/fastify/fastify-helmet/releases
- @scalar/fastify-api-reference: https://github.com/scalar/scalar
