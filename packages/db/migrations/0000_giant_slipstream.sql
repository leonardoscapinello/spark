-- Migration 0000 — fundação: organizations, users, contacts, identities, events.
-- Editada à mão depois do `drizzle-kit generate` em três pontos, marcados
-- abaixo com "EDITADO". Qualquer regeneração futura (`drizzle-kit generate`)
-- NÃO deve sobrescrever este arquivo sem reaplicar as três edições — elas
-- não têm como nascer do schema TS sozinho.

-- ============================================================
-- EDITADO 1/3 — a role dedicada do app (packages/db/src/roles.ts).
-- As políticas de RLS abaixo referenciam "app_user"; sem criá-la antes,
-- todo CREATE POLICY ... TO "app_user" falha. Nunca a service_role/
-- superusuário genérico se conecta como app_user (docs/adr/0005, 0022).
--
-- A senha aqui é SÓ para o Postgres local do docker-compose (mesmo padrão
-- de "spark_dev" já usado em docker-compose.yml). Em produção/Supabase
-- Cloud, este papel nasce por um processo separado, com segredo gerido
-- fora do git — nunca reaproveitar esta senha em nenhum outro ambiente.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev_password';
  END IF;
END
$$;
--> statement-breakpoint

CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado_em" timestamp with time zone,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"desativado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text,
	"telefone" text,
	"score" integer DEFAULT 0 NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"excluido_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"canal" text NOT NULL,
	"valor_externo" text NOT NULL,
	"verificado" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identities_org_canal_valor" UNIQUE("org_id","canal","valor_externo")
);
--> statement-breakpoint
ALTER TABLE "identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- ============================================================
-- EDITADO 2/3 — events particionada por mês de verdade (docs/adr/0021).
-- O `drizzle-kit generate` produz uma tabela comum; o particionamento
-- declarativo não existe no DSL do Drizzle, então isto é escrito à mão.
-- Postgres exige que a coluna de partição esteja em toda PK — por isso a
-- chave composta (id, ocorrido_em), já refletida em packages/db/src/schema/events.ts.
--
-- Manutenção de partição futura (criar o próximo mês automaticamente) é
-- tarefa operacional separada — candidato natural pro apps/scheduler mais
-- adiante. Por ora, cobrimos o mês corrente e mais três.
-- ============================================================
CREATE TABLE "events" (
	"id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"contact_id" uuid,
	"tipo" text NOT NULL,
	"dados" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ocorrido_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_id_ocorrido_em_pk" PRIMARY KEY("id","ocorrido_em")
) PARTITION BY RANGE ("ocorrido_em");
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE TABLE "events_y2026m09" PARTITION OF "events"
	FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
--> statement-breakpoint
CREATE TABLE "events_y2026m10" PARTITION OF "events"
	FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
--> statement-breakpoint
CREATE TABLE "events_y2026m11" PARTITION OF "events"
	FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
--> statement-breakpoint
CREATE TABLE "events_y2026m12" PARTITION OF "events"
	FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
--> statement-breakpoint

ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE POLICY "organizations_isolamento" ON "organizations" AS PERMISSIVE FOR ALL TO "app_user" USING ("organizations"."id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users_isolamento_por_org" ON "users" AS PERMISSIVE FOR ALL TO "app_user" USING ("users"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "contacts_isolamento_por_org" ON "contacts" AS PERMISSIVE FOR ALL TO "app_user" USING ("contacts"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "identities_isolamento_por_org" ON "identities" AS PERMISSIVE FOR ALL TO "app_user" USING ("identities"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "events_isolamento_por_org" ON "events" AS PERMISSIVE FOR ALL TO "app_user" USING ("events"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint

-- ============================================================
-- EDITADO 3/3 — privilégio da role + índices já prometidos em ADR-0021
-- ("índice GIN com jsonb_path_ops cobre filtro em custom") e na visão
-- geral ("org_id, updated_at DESC WHERE deleted_at IS NULL"). RLS restringe
-- QUAIS linhas; o GRANT abaixo é o que permite a operação DML existir —
-- sem ele, app_user não toca nenhuma tabela, política nenhuma importa.
-- ============================================================
GRANT USAGE ON SCHEMA public TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;--> statement-breakpoint

CREATE INDEX "contacts_custom_fields_gin" ON "contacts" USING gin ("custom_fields" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "contacts_org_atualizado_idx" ON "contacts" ("org_id", "atualizado_em" DESC) WHERE "excluido_em" IS NULL;--> statement-breakpoint
CREATE INDEX "events_org_ocorrido_idx" ON "events" ("org_id", "ocorrido_em" DESC);
