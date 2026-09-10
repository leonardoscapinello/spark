# @spark/db

Schema Drizzle + migrations. Ver `docs/adr/0005`, `docs/adr/0021`, `docs/adr/0022`.

**Só `apps/api`, `apps/worker` e `apps/scheduler` importam isto** — o cliente lê via sync/Electric, nunca direto do banco (`docs/adr/0026`).

## Dois papéis de conexão — não confundir

| Papel | Uso | RLS |
|---|---|---|
| `postgres` (`DATABASE_URL`) | Migration, seed, suporte | **Bypassa** — nunca serve requisição de negócio |
| `app_user` (`DATABASE_URL_APP`) | Toda query de `apps/api`/`worker`/`scheduler` em runtime | **Aplicada** |

`app_user` é criado pela migration `0000` (`CREATE ROLE app_user LOGIN`). A senha em `.env.example` é só para o Postgres local do docker-compose — em produção/Supabase Cloud, o segredo nasce por processo separado, fora do git.

## Comandos

```bash
docker compose up -d postgres   # sobe o Postgres local (ver nota abaixo)
pnpm db:generate                # gera migration a partir de packages/db/src/schema
pnpm db:migrate                 # aplica migrations/*.sql pendentes
pnpm test                       # inclui o teste de isolamento de RLS — precisa do Postgres em pé e migrado
```

`db:migrate` roda `scripts/migrate.mjs`, não `drizzle-kit migrate` — a CLI do drizzle-kit trava de forma reproduzível neste tipo de ambiente (fica com o spinner girando, sem nunca conectar de verdade nem devolver erro). O script próprio é determinístico: lê `migrations/*.sql` em ordem, aplica o que falta, registra em `_spark_migrations`. Use `pnpm db:generate` pra criar uma migration nova a partir do schema — isso funciona normalmente pela CLI, é só o `migrate` que trava.

### ⚠️ `listen_addresses` — por que o docker-compose tem essa flag

A imagem `supabase/postgres` escuta só em `127.0.0.1`/`::1` por padrão — correto dentro do stack completo deles (tudo na mesma rede Docker, atrás do Kong), errado quando algo de **fora** do container (seu `DATABASE_URL` apontando pra `localhost:5432`) tenta conectar: a conexão chega pela interface do container, não por loopback, e o Postgres a derruba **em silêncio** — nem erro de autenticação, só fecha. `docker-compose.yml` já tem `-c listen_addresses=*` para isso. Se algum dia trocar de imagem base, confirmar que essa flag continua lá.

## Migration 0000 — o que foi editado à mão

`drizzle-kit generate` produz DDL de tabela comum; três coisas não saem dele e foram editadas direto no `.sql` gerado (comentários `EDITADO 1/3`, `2/3`, `3/3` no arquivo):

1. `CREATE ROLE app_user` — as políticas de RLS referenciam essa role; sem criá-la antes, todo `CREATE POLICY ... TO app_user` falha.
2. `events` particionada de verdade por mês (`PARTITION BY RANGE`) — o DSL do Drizzle não tem particionamento declarativo.
3. `GRANT` pra `app_user` + os dois índices já prometidos em `docs/adr/0021` (GIN em `custom_fields`, parcial em `org_id, atualizado_em`).

Toda migration futura que mexer nessas três tabelas precisa considerar essas edições — elas não renascem sozinhas de um novo `drizzle-kit generate`.
