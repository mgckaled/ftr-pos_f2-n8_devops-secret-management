# Questionário Avaliativo

## Questão 1

**Pergunta:** No contexto do Secret Manager da AWS, qual é o formato dos dados retornados quando você recupera uma secret?

**Resposta**: JSON string

**Justificativa**: O AWS Secrets Manager retorna secrets primariamente no formato JSON string quando você utiliza o campo SecretString na resposta da API. Embora o serviço tecnicamente suporte também dados binários através do campo SecretBinary, a grande maioria dos casos de uso e a forma recomendada pela AWS é armazenar secrets como strings JSON estruturadas. Isso é especialmente verdadeiro para credenciais de banco de dados, chaves de API e outros secrets comuns, onde o Secrets Manager automaticamente estrutura os dados em formato JSON com campos como username, password, host, port, etc. Quando você recupera uma secret usando GetSecretValue, o valor retornado no campo SecretString é uma string JSON que você precisa parsear na sua aplicação para acessar os valores individuais. Este formato JSON permite armazenar múltiplos valores relacionados em uma única secret de forma estruturada e facilita rotação automática de credenciais complexas.

---

## Questão 2

**Pergunta:** Qual biblioteca é recomendada para integrar aplicações Node.js com o HashiCorp Vault?

**Resposta:** node-vault

**Justificativa:** A biblioteca `node-vault` é a solução mais popular e recomendada para integrar aplicações Node.js com o HashiCorp Vault, fornecendo uma interface JavaScript idiomática e baseada em Promises para interagir com a API REST do Vault. Esta biblioteca abstrai a complexidade das chamadas HTTP diretas ao Vault, oferecendo métodos convenientes para operações comuns como autenticação (suportando múltiplos métodos como tokens, AppRole, Kubernetes, etc.), leitura e escrita de secrets em diversos backends (KV v1, KV v2, databases dinâmicos, etc.), gerenciamento de leases e renovação automática de tokens, e operações administrativas como configuração de políticas e engines. A `node-vault` é mantida ativamente pela comunidade, possui documentação abrangente, suporta tanto callbacks quanto Promises/async-await para integração com código moderno, e oferece configuração flexível de endpoints, timeout, certificados TLS e outras opções de conexão. Alternativas como `vault-sdk` ou chamadas diretas usando clientes HTTP como `axios` são possíveis, mas `node-vault` permanece como escolha padrão por seu ecossistema maduro, facilidade de uso e cobertura completa das funcionalidades do Vault, reduzindo significativamente o boilerplate necessário para implementar secret management seguro em aplicações Node.js.

---

## Questão 3

**Pergunta:** O HashiCorp Vault oferece qual recurso avançado para gerenciamento de secrets?

**Resposta:** Rotação automática de chaves e controle de expiração

**Justificativa:** O HashiCorp Vault oferece recursos avançados de rotação automática de credenciais e gerenciamento de ciclo de vida com controle de expiração (TTL - Time To Live) que representam capacidades críticas para segurança moderna de secrets. A rotação automática permite que o Vault regenere periodicamente credenciais como senhas de banco de dados, chaves de API e certificados sem intervenção manual, reduzindo drasticamente a janela de exposição caso uma credencial seja comprometida. O sistema de leases e TTL associa cada secret a um período de validade após o qual é automaticamente revogado, forçando aplicações a renovarem credenciais regularmente e garantindo que secrets antigos não permaneçam válidos indefinidamente. Para secrets dinâmicos, o Vault pode gerar credenciais sob demanda com permissões mínimas necessárias e automaticamente revogá-las quando não mais necessárias. Engines especializados como database secrets engine conectam-se diretamente a sistemas de banco de dados para criar usuários temporários com privilégios específicos, rotacionando senhas root automaticamente sem impactar aplicações. Esta automação elimina práticas inseguras como senhas hardcoded ou compartilhadas entre ambientes, implementa princípio de menor privilégio temporal, reduz superfície de ataque através de credenciais efêmeras, e garante conformidade com políticas de segurança que exigem rotação regular de credenciais sem overhead operacional manual.

---

## Questão 4

**Pergunta:** Qual é a diferença fundamental entre uma chave simétrica e assimétrica no contexto do AWS KMS?

**Resposta:** Chaves simétricas usam a mesma chave para criptografar e descriptografar

**Justificativa:** A diferença fundamental entre criptografia simétrica e assimétrica no AWS KMS reside no modelo de chaves utilizado. Chaves simétricas utilizam a mesma chave secreta tanto para criptografar quanto para descriptografar dados, implementando algoritmos como AES-256, sendo extremamente rápidas e eficientes para criptografar grandes volumes de dados. No KMS, chaves simétricas nunca saem do serviço em formato plaintext, garantindo que o material criptográfico permanece protegido pelos HSMs (Hardware Security Modules) da AWS. Em contraste, chaves assimétricas utilizam um par de chaves matematicamente relacionadas: chave pública (que pode ser compartilhada livremente) para criptografar ou verificar assinaturas, e chave privada (mantida secreta) para descriptografar ou assinar. Chaves assimétricas no KMS suportam algoritmos como RSA e ECC, sendo ideais para casos de uso como assinatura digital, verificação de autenticidade e cenários onde a chave pública precisa ser distribuída para terceiros que criptografam dados que apenas o detentor da chave privada pode descriptografar. Ambos os tipos são gerenciados pelo KMS com controles de acesso, auditoria e rotação, mas a escolha entre simétrica e assimétrica depende do caso de uso específico, requisitos de performance e modelo de distribuição de chaves necessário.

---

## Questão 5

**Pergunta:** Quando se trabalha com Vault, qual é a melhor prática recomendada para organização das configurações?

**Resposta Correta**: Deixar todas as configurações no Vault, criando um ponto único de acesso

**Justificativa**: A melhor prática ao trabalhar com HashiCorp Vault em ambientes de produção é centralizar todas as configurações no Vault, criando um ponto único e auditável de acesso a secrets e configurações. Esta abordagem oferece vantagens significativas: auditoria centralizada de todos os acessos a configurações através dos logs do Vault, controle de acesso unificado via políticas do Vault aplicadas consistentemente, eliminação de configurações dispersas em múltiplos locais que dificultam governança, capacidade de rotação e atualização de configurações sem necessidade de redeploy de aplicações, e rastreabilidade completa de quem acessou quais configurações e quando. Embora mantenha maior complexidade inicial, esta centralização representa arquitetura mais madura e segura para ambientes enterprise onde conformidade, auditoria e segurança são prioritários. O Vault pode armazenar não apenas secrets sensíveis mas também configurações de ambiente, feature flags e outros parâmetros, provendo versionamento, controle de acesso granular e auditoria para todo o espectro de configurações da aplicação através de um único sistema integrado.

---

## Questão 6

**Pergunta:** Para recuperar um parâmetro criptografado do Parameter Store já descriptografado, qual parâmetro deve ser usado no comando GetParameter?

**Resposta:** WithDecryption: true

**Justificativa:** No AWS Systems Manager Parameter Store, quando você armazena um parâmetro como SecureString (tipo que usa criptografia via AWS KMS), ele é armazenado de forma criptografada. Para recuperar o valor já descriptografado através do comando GetParameter da API ou CLI, é necessário especificar o parâmetro `WithDecryption: true` (ou `--with-decryption` na CLI). Quando este parâmetro é definido como true, o Parameter Store automaticamente descriptografa o valor usando a chave KMS apropriada antes de retornar a resposta, desde que a entidade chamadora possua as permissões IAM necessárias tanto para acessar o parâmetro quanto para usar a chave KMS para descriptografia (ações `ssm:GetParameter` e `kms:Decrypt`). Se `WithDecryption` for omitido ou definido como false, o valor retornado será a string criptografada em Base64, que não é utilizável pela aplicação. Esta abordagem de opt-in explícito para descriptografia oferece flexibilidade: aplicações podem escolher recuperar valores criptografados para repassá-los sem descriptografar localmente, ou obter valores plaintext prontos para uso quando apropriado. O uso correto deste parâmetro é essencial para aplicações que dependem de configurações sensíveis armazenadas de forma segura no Parameter Store, garantindo que credenciais sejam recuperadas em formato utilizável enquanto permanecem protegidas em repouso e trânsito.

---

## Questão 7

**Pergunta:** Em um ambiente de produção com Kubernetes, qual dessas abordagens é a mais recomendada para injeção de secrets?

**Resposta:** Utilizar sidecar containers para injetar as secrets como variáveis de ambiente

**Justificativa:** A abordagem mais recomendada para injeção segura de secrets em ambientes Kubernetes de produção é utilizar sidecar containers especializados que se integram com sistemas de secret management externos como HashiCorp Vault, AWS Secrets Manager ou Azure Key Vault para injetar secrets dinamicamente nos pods. Soluções como Vault Agent Injector (via annotations), External Secrets Operator, ou Secrets Store CSI Driver implementam padrão sidecar que autentica automaticamente com o sistema de secrets externo, recupera credenciais necessárias e as disponibiliza para o container da aplicação através de volumes montados ou variáveis de ambiente, renovando-as automaticamente antes da expiração. Esta abordagem oferece vantagens significativas: secrets nunca são armazenados diretamente no Kubernetes (evitando exposição via etcd), aplicações não precisam implementar lógica de autenticação e recuperação de secrets, rotação automática de credenciais é transparente para a aplicação, auditoria centralizada de acesso a secrets é mantida no sistema externo, e separação clara de responsabilidades entre gestão de infraestrutura e código da aplicação. Alternativas como Kubernetes Secrets nativos são menos seguras pois armazenam dados apenas em Base64 no etcd, enquanto hardcoding ou arquivos `.env` em containers violam princípios fundamentais de segurança. O padrão sidecar representa melhores práticas modernas para secret management em arquiteturas cloud-native.

---

## Questão 8

**Pergunta:** No Parameter Store, quando você cria um parâmetro como "Secure String", qual serviço da AWS é utilizado para criptografia?

**Resposta:** KMS

**Justificativa:** Quando você cria um parâmetro do tipo SecureString no AWS Systems Manager Parameter Store, o serviço automaticamente utiliza o AWS Key Management Service (KMS) para criptografar o valor do parâmetro antes de armazená-lo. O Parameter Store integra-se nativamente com o KMS, permitindo que você escolha entre usar a chave KMS padrão gerenciada pela AWS especificamente para o Parameter Store (aws/ssm) sem custo adicional de armazenamento de chave, ou especificar uma Customer Managed Key (CMK) personalizada que oferece controle mais granular sobre políticas de acesso, rotação e auditoria. Durante operações de gravação (PutParameter), o Parameter Store chama o KMS para criptografar o valor usando a chave especificada antes de persistir no armazenamento, e durante operações de leitura com descriptografia (GetParameter com WithDecryption=true), o serviço chama o KMS para descriptografar o valor antes de retorná-lo, desde que o chamador possua permissões IAM apropriadas tanto para o parâmetro quanto para uso da chave KMS. Esta integração transparente com KMS garante que dados sensíveis estão protegidos em repouso usando criptografia de nível enterprise gerenciada por HSMs (Hardware Security Modules) certificados FIPS 140-2, enquanto mantém trilhas de auditoria completas via CloudTrail de todas as operações criptográficas, atendendo requisitos de compliance e governança de segurança organizacional.

---

## Questão 9

**Pergunta:** Embora os arquivos .env resolvam alguns problemas importantes no desenvolvimento, qual é a principal limitação de segurança que eles ainda apresentam?

**Resposta:** As credenciais ficam visíveis em texto plano no servidor, mesmo não estando no código

**Justificativa:** A principal vulnerabilidade de segurança dos arquivos `.env`, mesmo quando corretamente excluídos do controle de versão via `.gitignore`, é que as credenciais permanecem armazenadas em texto plano (plaintext) no sistema de arquivos do servidor ou ambiente de execução. Esta exposição cria múltiplos vetores de risco: qualquer pessoa com acesso ao servidor (administradores, desenvolvedores com SSH, processos comprometidos) pode ler diretamente as credenciais, backups do sistema de arquivos contêm secrets em texto claro, logs de deployment ou ferramentas de orquestração podem inadvertidamente capturar conteúdo do arquivo, e se o servidor for comprometido através de vulnerabilidades de aplicação (como path traversal, arbitrary file read, ou remote code execution), atacantes podem facilmente exfiltrar todas as credenciais. Além disso, arquivos `.env` não oferecem auditoria de acesso (não há registro de quem leu quais secrets e quando), não suportam rotação automática de credenciais, não implementam controles de acesso granulares por secret individual, e violam princípios de defesa em profundidade ao representar ponto único de falha. Soluções modernas de secret management como Vault, AWS Secrets Manager ou Azure Key Vault resolvem estas limitações criptografando secrets em repouso, fornecendo acesso dinâmico baseado em identidade, mantendo auditoria completa, suportando rotação automática e nunca persistindo secrets em plaintext no filesystem da aplicação.

---

## Questão 10

**Pergunta:** Na AWS, qual é a principal diferença entre o Parameter Store (SSM) e o Secret Manager?

**Resposta:** O Secret Manager oferece rotação automática, o Parameter Store não

**Justificativa:** A diferença fundamental entre AWS Secrets Manager e AWS Systems Manager Parameter Store reside nas capacidades avançadas de gerenciamento de ciclo de vida que o Secrets Manager oferece, especialmente rotação automática de credenciais. O Secrets Manager foi projetado especificamente para secrets de aplicação como credenciais de banco de dados, chaves de API e tokens, oferecendo rotação automática nativa integrada com serviços AWS como RDS, DocumentDB, Redshift e outros, através de funções Lambda que podem ser configuradas para rotacionar secrets em intervalos regulares sem intervenção manual, atualizando tanto o secret armazenado quanto as credenciais no sistema de destino. Em contraste, o Parameter Store é mais genérico e focado em gerenciamento de configuração, não oferecendo capacidades nativas de rotação automática - embora possa armazenar dados sensíveis criptografados via KMS, a rotação deve ser implementada manualmente ou através de automação customizada. Outras diferenças incluem: Secrets Manager cobra por secret armazenado e API calls (aproximadamente $0.40/secret/mês), enquanto Parameter Store oferece tier gratuito para parâmetros standard; Secrets Manager suporta versionamento automático e staging labels para rotação segura, Parameter Store tem versionamento mais básico; Secrets Manager oferece replicação cross-region nativa, Parameter Store requer implementação manual. A escolha depende do caso de uso: Secrets Manager para credenciais críticas que requerem rotação automática, Parameter Store para configurações gerais e quando custo é fator limitante.

---

## Questão 11

**Pergunta:** No Vault, qual é a principal vantagem do sistema de versionamento de secrets?

**Resposta:** Mantém histórico completo das alterações

**Justificativa:** O sistema de versionamento de secrets no HashiCorp Vault, especialmente no KV Secrets Engine v2, mantém histórico completo de todas as versões anteriores de cada secret, oferecendo capacidades críticas de auditoria, recuperação e conformidade. Cada vez que um secret é atualizado, o Vault preserva a versão anterior em vez de sobrescrevê-la, criando trilha imutável de mudanças com metadados incluindo timestamp, quem fez a alteração e número de versão. Esta funcionalidade permite: recuperação de secrets acidentalmente sobrescritos ou deletados (rollback para versões específicas), investigação de incidentes de segurança rastreando quando credenciais específicas estavam em uso, conformidade com requisitos regulatórios que exigem histórico de acesso e modificações, implementação segura de rotação de credenciais onde versões antigas permanecem temporariamente válidas durante período de transição, e capacidade de destruição permanente (destroy) de versões específicas contendo dados comprometidos sem afetar versões correntes. O versionamento pode ser configurado com políticas de retenção definindo quantas versões manter, e suporta soft-delete onde secrets deletados podem ser recuperados antes de destruição permanente. Esta capacidade diferencia Vault de soluções mais simples que apenas armazenam versão atual, fornecendo governança robusta essencial para ambientes empresariais onde rastreabilidade e capacidade de auditoria são requisitos não-negociáveis para gestão de informações sensíveis.

---

## Questão 12

**Pergunta:** No Vault, qual é o formato do path usado para acessar secrets?

**Resposta:** `/secret/data/nome-da-secret`

**Justificativa:** No HashiCorp Vault utilizando o KV Secrets Engine versão 2 (que é a versão recomendada e padrão em instalações modernas), o formato correto do path para acessar secrets inclui o segmento `/data/` na estrutura: `/secret/data/nome-da-secret`. Esta estrutura existe porque o KV v2 separa diferentes tipos de operações em paths distintos: `/secret/data/` é usado para operações de leitura e escrita dos valores dos secrets, enquanto `/secret/metadata/` é utilizado para acessar metadados como informações de versionamento, timestamps e configurações. Esta separação permite controle de acesso mais granular através de políticas do Vault, onde você pode, por exemplo, permitir que uma aplicação leia apenas os dados dos secrets (`/secret/data/*`) mas não acesse metadados ou histórico de versões (`/secret/metadata/*`). O KV v1 (versão legada) utiliza path direto `/secret/nome-da-secret`, mas o v2 com o path `/secret/data/` oferece versionamento automático, soft-delete, e capacidades de auditoria superiores, sendo portanto a versão e formato de path recomendados para ambientes de produção.
