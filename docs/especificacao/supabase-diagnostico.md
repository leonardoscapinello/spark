# Supabase — diagnóstico antes da inicialização

Data: 11/09/2026. Projeto: `vrxjqqqsoqfaxzanebtf`. Acesso fornecido pelo usuário. Inspeção SQL em transações `READ ONLY`, consultando metadados; nenhuma leitura de registros de clientes ou alteração no banco.

## Resultado observado

| Item | Estado |
| --- | --- |
| Conexão SQL pelo pooler fornecido | Sucesso, TLS habilitado |
| Tabelas em `public` | Nenhuma |
| Schema `drizzle` / tabelas de migration Spark | Não encontrados |
| `_spark_migrations` / `__drizzle_migrations` | Não encontradas |
| Políticas RLS em `public` | Nenhuma; não há tabelas de negócio |
| Role `app_user` | Não encontrada |
| `wal_level` | `logical` |
| Publicações | `supabase_realtime`; publicação Electric ausente |
| Auth JWKS | HTTP 200, chave pública com algoritmo ES256 |
| Configuração local do repositório | Continua usando banco local |

O projeto contém os schemas gerenciados de Auth, Storage, Realtime e outros serviços Supabase. “Sem tabelas Spark” não significa projeto inteiro sem dados. Não foram inspecionados usuários, objetos de armazenamento ou configurações administrativas desses serviços.

## Diferenças que precisam ser resolvidas antes de conectar o app

### 1. Migração escrita para o ambiente local

`packages/db/scripts/migrate.mjs` tenta conceder privilégios por uma conexão derivada para `supabase_admin` e usa o nome de banco local `spark` em um `GRANT`. A conexão remota fornecida usa banco `postgres` e usuário qualificado pelo projeto. Esse procedimento não deve ser executado sem adaptação para o ambiente gerenciado.

A migration inicial cria `app_user` com senha literal de desenvolvimento. O provisionamento remoto deve separar criação/configuração da role e segredo do conteúdo versionado. A aplicação usa role restrita com contexto de tenant; a conexão administrativa de inspeção não deve virar a conexão de runtime.

O runner também executa o SQL e registra a migration em chamadas separadas. Definir atomicidade por migration, lock contra execução concorrente e tratamento de falha antes de inicializar remotamente. Não usar `db:push` para contornar esses pontos.

### 2. Autenticação assimétrica

`apps/api/src/auth/supabase-jwt.guard.ts` verifica tokens usando bytes de `SUPABASE_JWT_SECRET`. O projeto remoto oferece chave pública ES256 via JWKS. O guard atual não implementa verificação por essa chave pública.

Adaptar a verificação para JWKS, issuer/audience e algoritmos esperados, com testes de token válido, expirado, emissor errado e assinatura inválida. A chave secreta de API Supabase fornecida pelo usuário não é um segredo JWT substituto. O endpoint de login de desenvolvimento também assina HS256 e deve continuar restrito ao ambiente de desenvolvimento.

A resposta JWKS confirma disponibilidade de chave; não constitui teste de login real ou prova de que todos os tokens existentes usam esse algoritmo.

### 3. Sincronização

`wal_level=logical` satisfaz uma condição necessária, mas não comprova Electric funcionando. Faltam tabelas, publicação, role/permissões de replicação adequadas, configuração do serviço e teste de sincronização. A conectividade ao pooler SQL não demonstra compatibilidade do mesmo endpoint com a conexão de replicação; esse caminho deve ser configurado separadamente.

## Ordem de preparação proposta

1. Classificar o projeto remoto como desenvolvimento, homologação ou produção. O papel desse ambiente não foi informado.
2. Preparar configuração remota separada da local, com segredos fora do Git.
3. Adaptar e testar provisionamento/migrations e verificação JWT.
4. Aplicar a fundação versionada quando a inicialização desse ambiente estiver definida; depois comparar o schema aplicado.
5. Validar isolamento entre tenants e uma coleção sincronizada.
6. Construir as próximas entidades conforme o [modelo integrado](modelo-de-dados.md).

O diagnóstico fecha a dúvida sobre acesso e estado do banco. Não altera as decisões de produto pendentes nem representa autorização implícita para executar migrations remotas neste levantamento.
