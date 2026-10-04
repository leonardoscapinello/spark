import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { activities, auditLogs, campaigns, companies, contacts, conversations, createAppDbClient, customFieldDefinitions, customFieldGroups, customFieldOptions, deals, serviceCycles, users, withOrgContext, type SparkDb } from "@spark/db";
import { CustomFieldDefinitionSchema, CustomFieldGroupSchema, normalizeCustomFieldValue, type CustomFieldEntity, type OrgId, type SaveCustomFieldGroup, type UpdateCustomFieldMetadata, type UserId, type WriteCustomFieldValue } from "@spark/core";
import { CustomFieldWriter } from "./custom-field-writer.js";
export async function assertFieldGroup(tx: SparkDb, orgId: OrgId, entityType: CustomFieldEntity, groupId: string | null | undefined) {
  if (!groupId) return;
  const [group] = await tx.select().from(customFieldGroups).where(and(eq(customFieldGroups.orgId,orgId),eq(customFieldGroups.id,groupId),eq(customFieldGroups.entityType,entityType),eq(customFieldGroups.archived,false))).limit(1);
  if (!group) throw new BadRequestException("Escolha um grupo ativo da mesma entidade do campo.");
}
@Injectable()
export class FieldAdministrationRepository {
  private readonly db = createAppDbClient();
  constructor(private readonly writer: CustomFieldWriter) {}
  saveGroup(orgId: OrgId, actorUserId: UserId, input: SaveCustomFieldGroup) {
    return withOrgContext(this.db,orgId,async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`fields:${orgId}`},0))`);
      const linked = await tx.select({ id:customFieldDefinitions.id,entityType:customFieldDefinitions.entityType,archivedAt:customFieldDefinitions.archivedAt }).from(customFieldDefinitions).where(and(eq(customFieldDefinitions.orgId,orgId),eq(customFieldDefinitions.groupId,input.id)));
      if (linked.some(f => f.entityType !== input.entityType)) throw new BadRequestException("O grupo já tem campos. Sua entidade não pode ser alterada.");
      if (input.archived && linked.some(f => !f.archivedAt)) throw new BadRequestException("Mova ou arquive os campos ativos antes de arquivar o grupo.");
      const [row] = await tx.insert(customFieldGroups).values({ ...input,orgId }).onConflictDoUpdate({ target:customFieldGroups.id,set:{...input,updatedAt:new Date()},setWhere:eq(customFieldGroups.orgId,orgId) }).returning();
      if (!row) throw new NotFoundException("Grupo não encontrado.");
      await tx.insert(auditLogs).values({orgId,actorUserId,action:"custom_field_group.saved",targetType:"custom_field_group",targetId:input.id,data:input});
      return { group:CustomFieldGroupSchema.parse({...row,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()}),txid:await capture(tx) };
    });
  }
  updateMetadata(orgId:OrgId,actorUserId:UserId,id:string,input:UpdateCustomFieldMetadata) {
    return withOrgContext(this.db,orgId,async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`fields:${orgId}`},0))`);
      const [field] = await tx.select().from(customFieldDefinitions).where(and(eq(customFieldDefinitions.orgId,orgId),eq(customFieldDefinitions.id,id))).limit(1);
      if (!field) throw new NotFoundException("Campo não encontrado.");
      await assertFieldGroup(tx,orgId,field.entityType,input.groupId);
      const [row] = await tx.update(customFieldDefinitions).set({...input,updatedAt:new Date()}).where(and(eq(customFieldDefinitions.orgId,orgId),eq(customFieldDefinitions.id,id))).returning();
      if (!row) throw new NotFoundException("Campo não encontrado.");
      await tx.insert(auditLogs).values({orgId,actorUserId,action:"custom_field.updated",targetType:"custom_field",targetId:id,data:input});
      return {field:CustomFieldDefinitionSchema.parse({...row,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),archivedAt:row.archivedAt?.toISOString() ?? null}),txid:await capture(tx)};
    });
  }
  writeValue(orgId:OrgId,actorUserId:UserId,entityType:CustomFieldEntity,entityId:string,input:WriteCustomFieldValue) {
    return withOrgContext(this.db,orgId,async tx => {
      const table = { contact:contacts,company:companies,deal:deals,conversation:conversations,activity:activities,user:users,campaign:campaigns,service_cycle:serviceCycles }[entityType];
      const [record] = await tx.select({id:table.id}).from(table).where(and(eq(table.orgId,orgId),eq(table.id,entityId))).limit(1).for("update");
      if (!record) throw new NotFoundException("Registro não encontrado.");
      if (entityType === "service_cycle") { const [cycle] = await tx.select({closedAt:serviceCycles.closedAt}).from(serviceCycles).where(eq(serviceCycles.id,entityId)); if (cycle?.closedAt) throw new BadRequestException("O ciclo encerrado preserva seu histórico."); }
      const [field] = await tx.select().from(customFieldDefinitions).where(and(eq(customFieldDefinitions.orgId,orgId),eq(customFieldDefinitions.id,input.fieldId),eq(customFieldDefinitions.entityType,entityType))).limit(1);
      if (!field || field.archivedAt) throw new BadRequestException("Campo indisponível para este registro.");
      const options = await tx.select().from(customFieldOptions).where(and(eq(customFieldOptions.orgId,orgId),eq(customFieldOptions.fieldId,field.id)));
      let value;
      try { value = normalizeCustomFieldValue(CustomFieldDefinitionSchema.parse({...field,createdAt:field.createdAt.toISOString(),updatedAt:field.updatedAt.toISOString(),archivedAt:null}),input.value,options.filter(o => !o.archivedAt).map(o => o.value)); }
      catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Valor inválido."); }
      const changes=await this.writer.write(tx,orgId,entityType,entityId,{[field.key]:value});
      await tx.insert(auditLogs).values({orgId,actorUserId,action:"custom_field.value_updated",targetType:entityType,targetId:entityId,data:{fieldId:field.id,changes}});
      return {txid:await capture(tx)};
    });
  }
}
async function capture(tx:SparkDb) { const rows=await tx.execute<{txid:string}>(sql`SELECT pg_current_xact_id()::xid::text as txid`); return Number(rows[0]?.txid); }
