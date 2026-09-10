/**
 * Role dedicada do app — nunca a `service_role`/superusuário genérico
 * (docs/adr/0005, docs/adr/0022). É ela que carrega as políticas de RLS;
 * a migration de bootstrap (0000) cria essa role no Postgres.
 */
export const APP_ROLE = "app_user" as const;
