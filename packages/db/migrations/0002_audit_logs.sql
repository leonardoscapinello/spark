-- Append-only business audit log (ADR-0013, ADR-0029). No UPDATE/DELETE
-- policy is intentionally present for app_user.
CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "actor_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_isolation_by_org" ON "audit_logs" FOR SELECT TO "app_user"
  USING ("audit_logs"."org_id" = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "audit_logs_insert_by_org" ON "audit_logs" FOR INSERT TO "app_user"
  WITH CHECK ("audit_logs"."org_id" = current_setting('app.current_org_id', true)::uuid);
