# Modelo de dados integrado

Status: implementado e auditado em 14/09/2026. A fonte executável é
`packages/db/src/schema/`; migrations 0038–0049 materializam a normalização e
as garantias descritas aqui.

## Regra de armazenamento

Dado que pode ser filtrado, agrupado, ordenado, somado ou relacionado é coluna
tipada. Lista consultável é tabela filha. JSONB só guarda documento cuja forma
varia e que é lido/gravado como unidade. O Postgres é a única fonte de verdade.

As únicas famílias JSONB deliberadas são:

| Família | Colunas | Motivo |
|---|---|---|
| Automação | `automations.draft_graph`, `automation_versions.graph` | grafo versionado como unidade |
| Execução | `automation_runs.context`, `automation_run_steps.result` | envelope variável de execução |
| Página | `pages.draft_tree`, `page_versions.tree` | árvore de conteúdo |
| Histórico | `events.data`, `audit_logs.data` | payload varia pelo tipo append-only |
| Prova externa | `email_verifications.raw_result` | resposta crua preservada |

Campos personalizados, tags, capacidades, formulários, preferências, filtros de
público, configurações de integração e MX são relacionais (ADR-0035).

## Mapa físico por domínio

| Domínio | Raízes e relações |
|---|---|
| Tenant e acesso | `organizations`, `users`, `permission_groups`, `permission_group_capabilities`, `user_permission_groups`, `teams`, `team_members` |
| Pessoas e empresas | `contacts`, `identities`, `companies`, `tags` e três tabelas de vínculo |
| CRM | `pipelines`, `stages`, `stage_field_rules`, `deals`, `deal_products`, `activities`, `notes` |
| Campos configuráveis | `custom_field_definitions`, `custom_field_options`, `custom_field_values` com uma coluna por tipo |
| Inbox | `conversations`, `messages` particionada, `message_registry`, `canned_replies` |
| Automação | `automations`, `automation_versions`, `automation_runs`, `automation_run_steps`, `automation_timers`, `automation_jobs` |
| Integrações | `integration_connections`, `integration_connection_settings`, `integration_secrets` |
| Catálogo | `products`, `product_variants`, `discount_rules`, `product_tags` |
| Formulários | `lead_forms`, campos/opções, `form_submissions`, valores tipados e chaves públicas |
| Social | `social_channels`, `social_posts` |
| Campanhas | `audiences`, seus status/tags, `campaigns`, destinatários e supressões |
| Páginas e arquivos | `pages`, `page_versions`, `page_public_keys`, `files` |
| Preferências e visões | `user_preferences`, `user_preference_items`, `saved_views` |
| Histórico | `events` particionada, `audit_logs`, verificações de e-mail e seus MX |

## Invariantes garantidos pelo banco

- RLS e `org_id` em toda tabela de negócio sincronizável.
- Toda FK entre tabelas tenant-aware exige pai e filho na mesma organização.
- Etapa pertence ao funil do negócio/regra; versão pertence à automação; canal
  pertence à conexão; variante pertence ao produto; opção pertence ao campo.
- Mensagem e conversa apontam para a mesma pessoa; valor de formulário aponta
  para campo do mesmo formulário; versão publicada pertence à sua raiz.
- Alvo polimórfico de campo personalizado existe, tem o tipo declarado e está
  no tenant. Valor escalar é único por campo/entidade mesmo com `option_id NULL`.
- Nota e atividade têm alvo; scores, probabilidades, duração, quantidades,
  dinheiro, percentuais e estados respeitam os limites do domínio.
- Preferências têm exatamente a coluna escalar compatível com `value_kind`, e
  itens não repetem chave de objeto nem posição de lista.
- E-mail/telefone canônicos de contatos também entram em `identities`; colisão
  com outra pessoa aborta a transação.

## Sync, volume e índices

Toda tabela disponível ao Electric aparece tanto na publicação quanto nas
allowlists de autorização e shape. Tabelas filhas de públicos e preferências
são sincronizadas; a UI remonta os agregados por junção local.

`events` e `messages` são particionadas mensalmente e possuem partição default.
O scheduler mantém o horizonte futuro. `message_registry` garante unicidade
global de ID e `external_id` apesar da chave física particionada.

Há índices pelos acessos centrais: contato por e-mail/telefone e busca textual;
mensagem por conversa/data e estado/data; valores customizados por cada tipo;
negócio por funil/etapa; filas e timers por disponibilidade.

## Regra para evolução

Nova coluna JSONB exige justificar por que o valor é documento indivisível.
Nova FK tenant-aware exige o guard de organização. Nova tabela sincronizada só
entra junto com publicação, shape, autorização e schema de coleção. Alterações
aceitas no modelo são registradas em novo ADR; não reescrevem decisões antigas.
