import { Injectable, NotFoundException } from "@nestjs/common"; import { and, eq, sql } from "drizzle-orm"; import { createAppDbClient, customFieldDefinitions, customFieldOptions, withOrgContext, type SparkDb } from "@spark/db"; import { deriveCustomFieldKey, type CreateCustomFieldInput, type CustomFieldDefinition, type CustomFieldDefinitionId, type OrgId, type UpdateCustomFieldOptionsInput, type UserId } from "@spark/core"; import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
@Injectable() export class CustomFieldsRepository { private readonly db: SparkDb = createAppDbClient(); constructor(private readonly events: DomainEventWriter) {}
  create(orgId: OrgId, userId: UserId, input: CreateCustomFieldInput) { return withOrgContext(this.db, orgId, async (tx) => { const key = deriveCustomFieldKey(input.label, input.id); const [row] = await tx.insert(customFieldDefinitions).values({ ...input, key, orgId, createdBy: userId }).returning(); if (!row) throw new Error("Custom field insert returned no row.");
    // As opções viram linhas (ADR-0035) — é delas que o relatório e o filtro leem.
    if (input.options.length > 0) await tx.insert(customFieldOptions).values(input.options.map((value, index) => ({ orgId, fieldId: row.id, value, label: value, sortOrder: index })));
    const txid = await captureTxid(tx); await this.events.append(tx, { orgId, actorUserId: userId, type: "custom_field.created", data: { fieldId: input.id, entityType: input.entityType, key } }); return { field: toField(row), txid }; }); }
  /**
   * Troca a lista de opções de um campo de seleção.
   *
   * Opção que sai é ARQUIVADA, não apagada: um valor já escolhido aponta para
   * ela por chave estrangeira, e apagá-la levaria junto o que a pessoa
   * respondeu. Opção que volta com o mesmo texto é desarquivada, e a ordem da
   * lista vira `sort_order`.
   */
  setOptions(orgId: OrgId, id: CustomFieldDefinitionId, input: UpdateCustomFieldOptionsInput) { return withOrgContext(this.db, orgId, async (tx) => {
    const [field] = await tx.select().from(customFieldDefinitions).where(and(eq(customFieldDefinitions.orgId, orgId), eq(customFieldDefinitions.id, id))).limit(1);
    if (!field) throw new NotFoundException("Campo personalizado não encontrado.");

    const existing = await tx.select().from(customFieldOptions).where(eq(customFieldOptions.fieldId, id));
    const byValue = new Map(existing.map((option) => [option.value, option]));

    for (const [index, value] of input.options.entries()) {
      const current = byValue.get(value);
      if (current) await tx.update(customFieldOptions).set({ label: value, sortOrder: index, archivedAt: null }).where(eq(customFieldOptions.id, current.id));
      else await tx.insert(customFieldOptions).values({ orgId, fieldId: id, value, label: value, sortOrder: index });
    }

    const kept = new Set(input.options);
    for (const option of existing) {
      if (kept.has(option.value) || option.archivedAt !== null) continue;
      await tx.update(customFieldOptions).set({ archivedAt: new Date() }).where(eq(customFieldOptions.id, option.id));
    }

    await tx.update(customFieldDefinitions).set({ updatedAt: new Date() }).where(eq(customFieldDefinitions.id, id));
    const txid = await captureTxid(tx);
    await this.events.append(tx, { orgId, type: "custom_field.updated", data: { fieldId: id, options: input.options.length } });
    return { field: toField(field), txid };
  }); }
  archive(orgId: OrgId, id: CustomFieldDefinitionId, archived: boolean) { return withOrgContext(this.db, orgId, async (tx) => { const [row] = await tx.update(customFieldDefinitions).set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(customFieldDefinitions.orgId, orgId), eq(customFieldDefinitions.id, id))).returning(); if (!row) throw new NotFoundException("Campo personalizado não encontrado."); const txid = await captureTxid(tx); await this.events.append(tx, { orgId, type: "custom_field.archived", data: { fieldId: id, archived } }); return { field: toField(row), txid }; }); }
}
async function captureTxid(tx: SparkDb) { const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`); return Number(rows[0]?.txid); }
function toField(row: typeof customFieldDefinitions.$inferSelect): CustomFieldDefinition { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null } as CustomFieldDefinition; }
