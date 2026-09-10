# Por que os sistemas anteriores ficaram lentos

> Diagnóstico de `~/Projetos/human-crm` e `~/Projetos/landingsuite`, feito em 10/09/2026.
> Existe porque **a causa raiz define o que o Spark não pode repetir.**

## Resumo: os dois casos têm a mesma causa

Não é NestJS. Não é React. Não é Postgres. Nos dois projetos, o peso vem do **Twenty CRM** — num como fork, no outro como dependência embutida.

---

## Caso 1 — `human-crm`: um fork do Twenty

Um fork do **Twenty CRM**: `"name": "twenty"`, licença **AGPL-3.0**, monorepo Nx com NestJS + GraphQL (Apollo) + TypeORM + React.

Números medidos:

| | |
|---|---|
| Arquivos TypeScript | **31.095** |
| `packages/twenty-server` | 382 MB |
| `packages/twenty-front` | 144 MB |
| `packages/twenty-website` | 554 MB |

## A causa raiz: schema dinâmico por workspace

Não é "React é lento" nem "faltou virtualização" — a tabela de registros **já é virtualizada** (`record-table/virtualization/`). O problema está uma camada abaixo.

Em `workspace-datasource.service.ts`:

```ts
const schemaName = getWorkspaceSchemaName(workspaceId);
await queryRunner.createSchema(schemaName, true);
```

**Cada workspace ganha um schema Postgres próprio, criado em tempo de execução.** Como as tabelas e colunas só existem depois que o workspace é criado, nada pode ser conhecido em tempo de compilação. Isso obriga o sistema a:

1. Construir as entidades do ORM em runtime, a partir de metadata (`engine/twenty-orm/`)
2. Gerar o schema GraphQL em runtime, por workspace (`engine/api/`)
3. Resolver relações dinamicamente — terreno fértil para N+1
4. Manter **duas camadas de cache só para tornar isso tolerável**: `engine/workspace-cache/` e `engine/core-entity-cache/`

O item 4 é o sinal mais claro de todos. **Quando um sistema precisa de uma camada de cache dedicada para tornar sua camada de metadata suportável, a camada de metadata é o custo.**

## Por que isso vira 3 minutos numa máquina de 8 GB

Some, em desenvolvimento:

- Daemon do Nx observando um grafo de 31 mil arquivos
- TypeScript Server indexando o mesmo grafo
- Node do NestJS construindo entidades e schema GraphQL em runtime
- Vite servindo um pacote de front de 144 MB

O heap do Node estoura, o sistema operacional começa a usar swap, e a partir daí **cada operação passa a esperar disco**. Não é lentidão linear: é um degrau. 8 GB é exatamente a faixa em que esse degrau acontece.

Uma tela de leads que deveria custar uma query passa a custar: gerar entidade → montar query GraphQL → resolver relações uma a uma → serializar — tudo isso enquanto a máquina troca páginas com o disco.

## O que o Spark tira daqui

| Lição | Decisão |
|---|---|
| Schema dinâmico em runtime é o custo | **Schema estático.** Campos customizados em JSONB com índice GIN, não em DDL por tenant — [ADR-0021](../adr/0021-schema-estatico-campos-dinamicos.md) |
| Cache existindo para compensar arquitetura é sintoma | Cache só para o que é caro por natureza, nunca para consertar uma escolha estrutural |
| ORM dinâmico esconde N+1 | **Drizzle**, SQL-first: a query que você escreve é a que roda — [ADR-0005](../adr/0005-postgres-supabase-drizzle.md) |
| GraphQL gerado em runtime custa caro | **OpenAPI estático** gerado de Zod, em build — [ADR-0004](../adr/0004-contrato-openapi-primeiro.md) |
| Monorepo de 31 mil arquivos mata a máquina do dev | Turborepo com filtro por mudança; orçamento de tamanho no CI — [ADR-0017](../adr/0017-orcamento-de-performance.md) |
| A rede no caminho da leitura é o teto de velocidade | **Local-first**: a leitura não vai à rede — [ADR-0018](../adr/0018-arquitetura-local-first.md) |
| Três frontends é três vezes o custo e nenhum dono | **Um app**, um design system, quatro alvos de build — [ADR-0020](../adr/0020-design-system-proprio.md) |
| Embutir plataforma de terceiro carrega o peso dela | Dependência é biblioteca, nunca plataforma — [ADR-0014](../adr/0014-construir-vs-adotar-open-source.md) |

---

## Caso 2 — `landingsuite`: o Twenty embutido

Estrutura própria bem organizada — pnpm + Turborepo, `apps/api`, workers separados, `packages/contracts`, Supabase. É essencialmente o desenho que o Spark adota.

Só que:

| Diretório | Tamanho |
|---|---|
| `node_modules` | **1,0 GB** |
| `vendor/twenty` | **335 MB** |
| `twenty-apps/` | 172 MB |
| `apps/` | 471 MB |
| `packages/` (código próprio) | **2,8 MB** |

E o código realmente escrito ali:

| App | Arquivos |
|---|---|
| `apps/studio-ssr` | 70 |
| `apps/web` | 30 |
| `apps/studio` | 3 |

**Cerca de 100 arquivos de código próprio, contra 507 MB de Twenty embutido.**

O landingsuite não ficou pesado pelo que foi escrito. Ficou pesado por carregar o Twenty junto — com `docker-compose.twenty.yml`, `vendor/twenty` e `twenty-apps/` no mesmo repositório. O trabalho próprio é enxuto; o peso é herdado.

Há ainda um agravante estrutural: **três frontends** (`studio`, `studio-ssr`, `web`) em Astro e Next convivendo. Três pipelines de build, três modelos mentais, e nenhum deles dono da tela.

---

## E a licença

`"license": "AGPL-3.0"`. Um fork do Twenty **é AGPL**. Se o Spark nascer daquele código, o Spark inteiro é AGPL — e se um dia for oferecido a clientes, o código todo precisa ser aberto.

Vale para os dois casos: `vendor/twenty` dentro do landingsuite carrega a mesma obrigação.

Isso já estava previsto em [ADR-0014](../adr/0014-construir-vs-adotar-open-source.md), e agora é concreto: **os dois projetos servem como estudo de caso e como referência de modelagem. Nenhuma linha deles entra no Spark, e o Twenty não é dependência, nem fork, nem vendor.**

## A conclusão que orienta o projeto

O Twenty não é lento porque escolheram ferramentas ruins — NestJS, TypeORM e React são ferramentas boas. Ele é lento porque **inseriu uma camada de indireção no caminho crítico**: metadata em runtime entre a intenção do usuário e o dado.

E os dois projetos herdaram esse custo sem herdar a decisão — um por fork, outro por vendor.

Por isso o critério do Spark não é "usar a tecnologia mais nova". É:

> **Menos camadas entre o clique e o dado. Toda camada precisa justificar sua existência com um número.**
