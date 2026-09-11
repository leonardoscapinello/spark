-- Migration 0000 — foundation: all 11 tables. Hand-edited after
-- `drizzle-kit generate` in three spots, marked below with "EDITED". Any
-- future regeneration (`drizzle-kit generate`) must NOT overwrite this
-- file without reapplying the three edits — they can't be derived from
-- the TS schema alone.

-- ============================================================
-- EDITED 1/3 — the app's own dedicated role (packages/db/src/roles.ts).
-- The RLS policies below reference "app_user"; without creating it first,
-- every CREATE POLICY ... TO "app_user" fails. The service_role/generic
-- superuser never connects as app_user (docs/adr/0005, 0022).
--
-- The password here is ONLY for the local docker-compose Postgres (same
-- "spark_dev" convention already used in docker-compose.yml). In
-- production/Supabase Cloud this role is born through a separate
-- process, with a secret managed outside git — never reuse this password
-- in any other environment.
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
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"supabase_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "users_supabase_user_id_unique" UNIQUE("supabase_user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"score" integer DEFAULT 0 NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"external_value" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identities_org_channel_value" UNIQUE("org_id","channel","external_value")
);
--> statement-breakpoint
ALTER TABLE "identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- ============================================================
-- EDITED 2/3 — events actually partitioned by month (docs/adr/0021).
-- `drizzle-kit generate` produces a plain table; declarative partitioning
-- doesn't exist in Drizzle's DSL, so this is hand-written. Postgres
-- requires the partition column to be in every PK — hence the composite
-- key (id, occurred_at), already reflected in packages/db/src/schema/events.ts.
--
-- Future partition maintenance (creating the next month automatically) is
-- a separate operational task — a natural candidate for apps/scheduler
-- later on. For now, we cover the current month plus three more.
-- ============================================================
CREATE TABLE "events" (
	"id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"contact_id" uuid,
	"type" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_id_occurred_at_pk" PRIMARY KEY("id","occurred_at")
) PARTITION BY RANGE ("occurred_at");
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
CREATE TABLE "permission_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permission_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_permission_groups" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "user_permission_groups_user_id_group_id_pk" PRIMARY KEY("user_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "user_permission_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pipelines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"contact_id" uuid,
	"name" text NOT NULL,
	"amount" bigint NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"expected_close_date" timestamp with time zone,
	"loss_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"contact_id" uuid,
	"deal_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_groups" ADD CONSTRAINT "permission_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_groups" ADD CONSTRAINT "user_permission_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_groups" ADD CONSTRAINT "user_permission_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_groups" ADD CONSTRAINT "user_permission_groups_group_id_permission_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."permission_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "organizations_isolation" ON "organizations" AS PERMISSIVE FOR ALL TO "app_user" USING ("organizations"."id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users_isolation_by_org" ON "users" AS PERMISSIVE FOR ALL TO "app_user" USING ("users"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "contacts_isolation_by_org" ON "contacts" AS PERMISSIVE FOR ALL TO "app_user" USING ("contacts"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "identities_isolation_by_org" ON "identities" AS PERMISSIVE FOR ALL TO "app_user" USING ("identities"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "events_isolation_by_org" ON "events" AS PERMISSIVE FOR ALL TO "app_user" USING ("events"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "permission_groups_isolation_by_org" ON "permission_groups" AS PERMISSIVE FOR ALL TO "app_user" USING ("permission_groups"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "user_permission_groups_isolation_by_org" ON "user_permission_groups" AS PERMISSIVE FOR ALL TO "app_user" USING ("user_permission_groups"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "pipelines_isolation_by_org" ON "pipelines" AS PERMISSIVE FOR ALL TO "app_user" USING ("pipelines"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "stages_isolation_by_org" ON "stages" AS PERMISSIVE FOR ALL TO "app_user" USING ("stages"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "deals_isolation_by_org" ON "deals" AS PERMISSIVE FOR ALL TO "app_user" USING ("deals"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "activities_isolation_by_org" ON "activities" AS PERMISSIVE FOR ALL TO "app_user" USING ("activities"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint

-- ============================================================
-- EDITED 3/3 — role privilege + indexes already promised in ADR-0021
-- ("GIN index with jsonb_path_ops covers filtering on custom") and in the
-- overview ("org_id, updated_at DESC WHERE deleted_at IS NULL"). RLS
-- restricts WHICH rows; the GRANT below is what allows the DML operation
-- to exist at all — without it app_user can't touch any table, no policy matters.
-- ============================================================
GRANT USAGE ON SCHEMA public TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;--> statement-breakpoint

CREATE INDEX "contacts_custom_fields_gin" ON "contacts" USING gin ("custom_fields" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "contacts_org_updated_idx" ON "contacts" ("org_id", "updated_at" DESC) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "events_org_occurred_idx" ON "events" ("org_id", "occurred_at" DESC);