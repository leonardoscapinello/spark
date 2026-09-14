import type { Sql } from "postgres";

/**
 * Cria um grupo de permissão com as capacidades em linha
 * (`permission_group_capabilities`, ADR-0035).
 *
 * Os testes montavam o grupo com um array jsonb; a capacidade virou tabela, e
 * semear pelo caminho antigo produziria um grupo sem capacidade nenhuma — todo
 * endpoint autenticado responderia 403 sem que houvesse bug no código.
 */
export async function seedPermissionGroup(
  admin: Sql,
  orgId: string,
  groupId: string,
  name: string,
  capabilities: readonly string[],
): Promise<void> {
  await admin`INSERT INTO permission_groups (id, org_id, name) VALUES (${groupId}, ${orgId}, ${name})`;
  if (capabilities.length === 0) return;
  await admin`
    INSERT INTO permission_group_capabilities (org_id, group_id, capability)
    SELECT ${orgId}::uuid, ${groupId}::uuid, capability
    FROM unnest(${admin.array([...capabilities])}::text[]) AS capability
  `;
}
