import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomFieldWriter } from "../../settings/infrastructure/custom-field-writer.js";
import { TagWriter } from "../../settings/infrastructure/tag-writer.js";
import { eq, sql } from "drizzle-orm";
import { companies, createDbClient, withOrgContext, type SparkDb } from "@spark/db";
import type { Company, CompanyId, CreateCompanyInput, OrgId, UpdateCompanyInput } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class CompaniesRepository {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");

  constructor(private readonly eventWriter: DomainEventWriter, private readonly customFields: CustomFieldWriter, private readonly tagWriter: TagWriter) {}

  async create(orgId: OrgId, input: CreateCompanyInput): Promise<{ company: Company; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx.insert(companies).values({
        id: input.id,
        orgId,
        parentCompanyId: input.parentCompanyId ?? null,
        ownerId: input.ownerId ?? null,
        name: input.name,
        legalName: input.legalName ?? null,
        taxId: input.taxId ?? null,
        website: input.website ?? null,
        industry: input.industry ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
      }).returning();
      if (!row) throw new Error("Company insert returned no row.");
      const company = toCompany(row);
      // Espelha os campos personalizados nas colunas tipadas, na mesma transação (ADR-0035).
      if (input.customFields !== undefined) await this.customFields.write(tx, orgId, "company", company.id, input.customFields);
      if (input.tags !== undefined) await this.tagWriter.write(tx, orgId, "company", company.id, input.tags);
      await this.eventWriter.append(tx, { orgId, companyId: company.id, type: "company.created", data: { name: company.name } });
      return { company, txid };
    });
  }

  async update(orgId: OrgId, id: CompanyId, input: UpdateCompanyInput): Promise<{ company: Company; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const { customFields: _customFields, tags: _tags, ...columns } = input;
      const [row] = await tx.update(companies).set({ ...columns, updatedAt: new Date() }).where(eq(companies.id, id)).returning();
      if (!row) throw new NotFoundException(`Company ${id} not found.`);
      const company = toCompany(row);
      // Espelha os campos personalizados nas colunas tipadas, na mesma transação (ADR-0035).
      if (input.customFields !== undefined) await this.customFields.write(tx, orgId, "company", company.id, input.customFields);
      if (input.tags !== undefined) await this.tagWriter.write(tx, orgId, "company", company.id, input.tags);
      await this.eventWriter.append(tx, { orgId, companyId: company.id, type: "company.updated", data: { fields: Object.keys(input) } });
      return { company, txid };
    });
  }

  async archive(orgId: OrgId, id: CompanyId, archived: boolean): Promise<{ company: Company; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx.update(companies).set({ deletedAt: archived ? new Date() : null, updatedAt: new Date() }).where(eq(companies.id, id)).returning();
      if (!row) throw new NotFoundException(`Company ${id} not found.`);
      const company = toCompany(row);
      await this.eventWriter.append(tx, { orgId, companyId: company.id, type: archived ? "company.archived" : "company.restored" });
      return { company, txid };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  if (!rows[0]) throw new Error("Could not obtain the transaction's txid.");
  return Number(rows[0].txid);
}

function toCompany(row: typeof companies.$inferSelect): Company {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  } as Company;
}
