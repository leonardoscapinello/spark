# ADR-0021 — Schema estático, campos customizados em JSONB

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

Um CRM precisa de campos customizados: cada empresa quer o seu. Existem duas formas de resolver, e a escolha entre elas é a decisão de banco mais consequente do projeto.

**Forma A — DDL dinâmico.** Cada organização ganha schema e colunas próprios, criados em tempo de execução. É o caminho do Twenty, e o diagnóstico está em [`licoes-do-twenty.md`](../arquitetura/licoes-do-twenty.md):

```ts
const schemaName = getWorkspaceSchemaName(workspaceId);
await queryRunner.createSchema(schemaName, true);
```

Como nada é conhecido em tempo de compilação, tudo passa a ser resolvido em runtime: entidades do ORM, schema GraphQL, relações. E aí aparecem duas camadas de cache — `workspace-cache` e `core-entity-cache` — existindo apenas para tornar isso tolerável. **É o sintoma que denuncia a doença.**

O resultado, medido: uma tela de leads levando 3 minutos numa máquina de 8 GB.

**Forma B — schema estático com dado semiestruturado.** As tabelas são fixas e conhecidas em build. Os campos customizados vivem numa coluna `JSONB`, com definições numa tabela de metadata que serve à interface — mas **nunca gera DDL**.

## Decisão

**Forma B, sem exceção. O schema do Spark é estático e conhecido em tempo de compilação.**

```sql
CREATE TABLE contacts (
  id            uuid PRIMARY KEY,          -- UUID v7
  org_id        uuid NOT NULL,
  nome          text NOT NULL,
  email         citext,
  telefone      text,
  score         int  NOT NULL DEFAULT 0,
  custom        jsonb NOT NULL DEFAULT '{}',   -- campos do cliente
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX ON contacts USING gin (custom jsonb_path_ops);
CREATE INDEX ON contacts (org_id, updated_at DESC) WHERE deleted_at IS NULL;
```

E a metadata que descreve os campos para a interface — **sem tocar no schema**:

```sql
CREATE TABLE custom_field_definitions (
  id, org_id, entidade, chave, rotulo,
  tipo,           -- text | number | date | select | multiselect | boolean | money
  opcoes jsonb,
  obrigatorio boolean,
  ordem int
);
```

### As regras que sustentam a decisão

1. **Nenhum `CREATE TABLE`, `ALTER TABLE` ou `CREATE SCHEMA` em tempo de execução.** DDL só por migration versionada no git, revisada em PR.
2. **Um schema, um conjunto de tabelas, isolamento por `org_id` + RLS.** É o padrão que a indústria consolidou em 2026 para SaaS B2B — melhor equilíbrio entre simplicidade, escala e segurança.
3. **Campo customizado que vira essencial é promovido a coluna real**, por migration. Ganha índice dedicado e tipo forte. É uma decisão consciente, não automática.
4. **Índice GIN com `jsonb_path_ops`** cobre filtro e busca em `custom`. Para um campo específico muito consultado, índice de expressão: `CREATE INDEX ON contacts ((custom->>'segmento'))`.
5. **Validação de campo customizado é do domínio**, não do banco: as definições geram um schema Zod em runtime dentro de [`core`](0019-nucleo-compartilhado.md), e ele vale igual no cliente e no servidor.

### Caminho de escala, na ordem

O consenso de 2026 para OLTP multi-tenant, e a ordem importa — **cada passo só depois de o anterior esgotar**:

```
1. Índices e query certos          ← 90% dos casos param aqui
2. Réplicas de leitura
3. Particionar tabelas grandes     ← events e messages, por mês, desde o dia 1
4. Isolar tenant grande em banco dedicado
5. Sharding por org_id             ← último recurso, e provavelmente nunca
```

Particionamento de `events` e `messages` **por mês, desde a primeira migration** — o Postgres suporta replicação lógica de tabela particionada, então isso é compatível com o Electric ([ADR-0018](0018-arquitetura-local-first.md)). Reparticionar depois, com volume, é operação de madrugada.

### Por que isso também é requisito do local-first

O Electric sincroniza via replicação lógica sobre um schema conhecido. **Schema dinâmico por tenant é incompatível com sync engine** — não há como definir shape estável sobre tabelas que ainda não existem.

Ou seja, esta decisão não é só performance: ela é **pré-requisito** do [ADR-0018](0018-arquitetura-local-first.md). Escolher a Forma A fecharia a porta do local-first, e com ela a meta de velocidade.

## Alternativas consideradas

**DDL dinâmico por tenant** (a Forma A). Descartada com evidência medida no próprio ambiente do time. Ela dá flexibilidade máxima ao usuário final e cobra em runtime, em complexidade e na possibilidade de sincronizar.

**EAV** — tabela `entidade / atributo / valor`. Descartada: cada campo vira um JOIN, filtro combinado vira query impossível de otimizar, e o planejador do Postgres perde toda estatística útil. É mais lento que JSONB e muito menos legível.

**Banco por tenant.** Descartado agora, mantido como passo 4 do caminho de escala. Multiplica migration, conexão e operação por cliente, e não faz sentido antes de existir um tenant grande o suficiente para justificar.

**Documento (MongoDB) para o CRM inteiro.** Descartado: perdemos transação multi-tabela, integridade referencial, replicação lógica e o ecossistema Postgres — que é onde o Electric, o Supabase e as extensões vivem.

## Consequências

- Campo customizado tem um teto de sofisticação menor que o de um sistema com DDL dinâmico. **É a troca consciente**: menos flexibilidade extrema, muito mais velocidade e previsibilidade.
- Query sobre `custom` exige atenção ao índice. Monitorar `pg_stat_statements` desde a Fase 1 e promover a coluna real o que aparecer no topo.
- O schema é conhecido em build: Drizzle gera tipos estáticos, o OpenAPI é gerado em build e o Electric define shapes estáveis. **Zero geração em runtime, em qualquer camada.**
- Precisamos de um processo leve para promover campo customizado a coluna — revisão trimestral do que é mais filtrado.
- Fecha a porta para "cada cliente monta o próprio modelo de dados". Se um dia isso virar requisito de produto, é um ADR novo — e um projeto novo.
