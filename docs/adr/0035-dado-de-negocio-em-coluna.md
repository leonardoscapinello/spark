# ADR-0035 — Dado de negócio em coluna, JSON só para documento

**Data:** 14/09/2026
**Estado:** Aceito

## Contexto

O banco acumulou 23 colunas `jsonb`. Parte delas guardava dado que o negócio
precisa consultar: os valores dos campos personalizados de cada pessoa, empresa
e negócio; as opções de um campo de seleção; as marcações; as capacidades de um
grupo de permissão; as respostas de um formulário.

Isso custou três coisas, todas observadas na prática:

1. **Não dá para perguntar.** «Quantos negócios vieram de indicação, somando
   quanto?» exigia varrer todas as linhas e abrir JSON em memória. Com dado em
   coluna é um `GROUP BY` com índice — e é o que um BI ligado ao Postgres
   consegue ler sem que ninguém escreva código para ele.
2. **O banco não valida nada.** Uma escrita que passou texto já serializado
   gravou `"[\"Pro\"]"` — uma string JSON — onde deveria haver `["Pro"]`. O
   Postgres aceitou, porque uma string é JSON válido. A tela quebrou ao ler, e
   o erro só apareceu semanas depois (migrations 0038 e 0039).
3. **O tipo se perde.** Dentro de JSON, `12`, `"12"` e `12.0` convivem. Fora
   dele, uma coluna `numeric` recusa o que não é número e uma `date` recusa o
   que não é data.

## Decisão

**Dado que o negócio consulta, relaciona ou soma vive em coluna, com o tipo
certo, e em tabela própria quando é uma lista.** JSON fica reservado a
documento: um payload externo cru, o desenho de um fluxo, o conteúdo de uma
página, o contexto de uma execução em fila.

O critério de decisão é uma pergunta: **alguém vai querer filtrar, agrupar ou
juntar por isso?** Se sim, é coluna. Se é um bloco que só se lê inteiro e se
grava inteiro, é documento.

Regras que acompanham:

- **Dinheiro é `bigint` em centavos.** Nunca `float`, `double` ou `numeric` com
  casas — já valia em `packages/core/money`, e vale igual no banco.
- **Quantidade fracionada é inteiro numa unidade menor** (milésimos em
  `deal_products.quantity_milli`), e porcentagem é **ponto-base** inteiro. Pelo
  mesmo motivo: conta que fecha.
- **Todo registro tem `id` UUID v7** e `org_id`, com RLS por organização.
- **Texto é `text`**, data é `date`, instante é `timestamptz`, booleano é
  `boolean`. Nada de guardar data como texto.
- **Lista vira tabela**, com `sort_order` quando a ordem importa.
- Enquanto uma coluna `jsonb` de dado de negócio existir, ela carrega um
  `CHECK` de forma (`jsonb_typeof(...) = 'array'` / `'object'`), para o banco
  recusar o que antes absorvia.

## Classificação

**Vira tabela** (dado de negócio):

| Hoje | Vira | Estado |
|---|---|---|
| `custom_field_definitions.options` | `custom_field_options` | tabela criada (0038) |
| `contacts/companies/deals.custom_fields` | `custom_field_values`, coluna por tipo | tabela criada (0038) |
| `contacts/companies/products.tags` | `tags` + vínculo por entidade | a fazer |
| `permission_groups.capabilities` | `permission_group_capabilities` | a fazer |
| `lead_forms.fields` | `lead_form_fields` | a fazer |
| `form_submissions.values` | `form_submission_values`, coluna por tipo | a fazer |
| `integration_connections.config` | `integration_connection_settings` | a fazer |

**Continua JSON** (documento, e o porquê):

| Coluna | Por que é documento |
|---|---|
| `automations.draft_graph`, `automation_versions.graph` | desenho de fluxo; lido e gravado inteiro, versionado como um todo |
| `automation_runs.context`, `automation_run_steps.result` | payload de execução em fila — o caso que o JSON resolve bem |
| `pages.draft_tree`, `page_versions.tree` | árvore de conteúdo da página |
| `events.data`, `audit_logs.data` | registro append-only cujo formato varia por tipo de evento |
| `email_verifications.raw_result`, `mx_records` | resposta crua de serviço externo, guardada como prova |
| `audiences.filter` | definição de consulta, não dado consultado |
| `user_preferences.value` | preferência de interface, por chave, sem relatório em cima |

## Consequências

- Migração em partes, cada uma expand/contract: cria a tabela, copia, o código
  passa a ler dali, e só então a coluna antiga sai. Nenhum passo quebra a
  versão anterior.
- O modelo de campos personalizados é EAV com colunas tipadas. É mais tabela e
  mais junção do que JSON — e é o preço de poder perguntar.
- Sincronização (ADR-0018) ganha tabelas novas na publicação; a tela lê valores
  por junção local em vez de abrir um objeto.
- Quem escrever `jsonb` para dado de negócio daqui em diante está contrariando
  este ADR, e a revisão deve recusar.
