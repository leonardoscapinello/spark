# @spark/db

Drizzle schema + migrations. See `docs/adr/0005`, `docs/adr/0021`, `docs/adr/0022`.

**Only `apps/api`, `apps/worker`, and `apps/scheduler` import this** — the client reads via sync/Electric, never straight from the database (`docs/adr/0026`).

## Two connection roles — don't mix them up

| Role | Used by | RLS |
|---|---|---|
| `postgres` (`DATABASE_URL`) | Migrations, seeding, support | **Bypassed** — never serves a business request |
| `app_user` (`DATABASE_URL_APP`) | Every runtime query from `apps/api`/`worker`/`scheduler` | **Enforced** |

`app_user` is created by migration `0000` (`CREATE ROLE app_user LOGIN`). The password in `.env.example` is only for the local docker-compose Postgres — in production/Supabase Cloud, the secret is born through a separate process, outside git.

## Commands

```bash
pnpm db:generate                # generate a migration from packages/db/src/schema
pnpm db:migrate                 # apply pending migrations to DATABASE_URL (produção)
pnpm test                       # integração só com TEST_DATABASE_URL explícita
```

`db:migrate` runs `scripts/migrate.mjs`, not `drizzle-kit migrate` — the drizzle-kit CLI hangs reproducibly in this kind of environment (the spinner just spins forever, never actually connecting or returning an error). The custom script is deterministic: it reads `migrations/*.sql` in order, applies whatever's missing, and records it in `_spark_migrations`. Use `pnpm db:generate` to create a new migration from the schema — that works fine through the CLI, it's only `migrate` that hangs.

There is no local Postgres fallback. The only persistent database is the
Supabase production project documented in `docs/operacao/ambientes.md`.

## Hand-written migrations, outside drizzle-kit's journal

`0001_electric_publication.sql` (`CREATE PUBLICATION`) is written by hand, never through `drizzle-kit generate` — it doesn't change any table schema, so there's nothing for a diff to generate it from. Practical consequence: drizzle-kit's journal (`migrations/meta/_journal.json`) has no idea it exists, and every `pnpm db:generate` from now on proposes THE NEXT NUMBER IN ITS OWN SEQUENCE (which no longer matches the real next filename — it'll try to propose `0001_*` again, colliding with the hand-written one). **After running `db:generate`, check whether the generated file collides with an existing name** — if it does, rename the `.sql` to the correct number and fix only the `tag` field of the matching entry in `_journal.json` (leave `idx` alone — that's drizzle-kit's own internal bookkeeping; `migrate.mjs` never reads it, it just sorts filenames). This already happened repeatedly during Fase 1 (deals/stages/pipelines added several hand-written publication migrations in a row) — it's the cost of having a migration outside the normal flow, not a bug to chase.

## Migration 0000 — what was hand-edited

`drizzle-kit generate` produces plain table DDL; three things don't come out of it and were edited directly into the generated `.sql` (comments `EDITED 1/3`, `2/3`, `3/3` in the file):

1. `CREATE ROLE app_user` — the RLS policies reference this role; without creating it first, every `CREATE POLICY ... TO app_user` fails.
2. `events` actually partitioned by month (`PARTITION BY RANGE`) — Drizzle's DSL has no declarative partitioning.
3. `GRANT` to `app_user` + the two indexes already promised in `docs/adr/0021` (GIN on `custom_fields`, partial on `org_id, updated_at`).

Any future migration touching these three tables needs to account for these edits — they don't come back on their own from a fresh `drizzle-kit generate`.

## English-only rename (2026-09-11)

Every identifier, column, table, and code comment in this package was
rewritten from Portuguese to English in one pass — domain vocabulary
(`packages/core`) first, then this schema, then the API/data/web layers
that consume it. The database had zero real rows at the time (Fase 0/1,
pre-launch, no staging deployed), so this shipped as a full reset —
migration history wiped and regenerated from the new English schema,
rather than a chain of `ALTER TABLE ... RENAME COLUMN` — this is
mentioned here only so nobody goes looking for the old Portuguese
migration files or wonders why the migration numbering restarted at 0000.
