CREATE TABLE "permission_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"capacidades" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "permission_groups" ADD CONSTRAINT "permission_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_groups" ADD CONSTRAINT "user_permission_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_groups" ADD CONSTRAINT "user_permission_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_groups" ADD CONSTRAINT "user_permission_groups_group_id_permission_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."permission_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "permission_groups_isolamento_por_org" ON "permission_groups" AS PERMISSIVE FOR ALL TO "app_user" USING ("permission_groups"."org_id" = current_setting('app.current_org_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "user_permission_groups_isolamento_por_org" ON "user_permission_groups" AS PERMISSIVE FOR ALL TO "app_user" USING ("user_permission_groups"."org_id" = current_setting('app.current_org_id', true)::uuid);