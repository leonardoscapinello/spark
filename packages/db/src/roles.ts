/**
 * The app's own dedicated role — never the generic `service_role`/superuser
 * (docs/adr/0005, docs/adr/0022). This is what carries the RLS policies;
 * the bootstrap migration (0000) creates this role in Postgres.
 */
export const APP_ROLE = "app_user" as const;
