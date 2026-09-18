import { Injectable } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  companyRegistrationActivities,
  companyRegistrationMembers,
  companyRegistrationTaxRegimes,
  companyRegistrations,
  createDbClient,
  withOrgContext,
  type SparkDb,
} from "@spark/db";
import {
  companyRegistrationActivityId,
  companyRegistrationId,
  companyRegistrationMemberId,
  companyRegistrationTaxRegimeId,
  type CompanyRegistration,
  type CompanyRegistrationActivity,
  type CompanyRegistrationActivityFacts,
  type CompanyRegistrationFacts,
  type CompanyRegistrationMember,
  type CompanyRegistrationMemberFacts,
  type CompanyRegistrationTaxRegime,
  type CompanyRegistrationTaxRegimeFacts,
  type OrgId,
} from "@spark/core";

export interface RegistrationWrite extends CompanyRegistrationFacts {
  source: string;
  status: CompanyRegistration["status"];
  httpStatus: number | null;
  fetchedAt: Date;
  expiresAt: Date;
  failureCount: number;
}

export interface RegistrationChildren {
  activities: CompanyRegistrationActivityFacts[];
  members: CompanyRegistrationMemberFacts[];
  taxRegimes: CompanyRegistrationTaxRegimeFacts[];
}

export interface RegistrationRecord {
  registration: CompanyRegistration;
  activities: CompanyRegistrationActivity[];
  members: CompanyRegistrationMember[];
  taxRegimes: CompanyRegistrationTaxRegime[];
}

@Injectable()
export class CompanyRegistrationsRepository {
  private readonly db: SparkDb;
  constructor() { this.db = createDbClient(process.env.DATABASE_URL ?? ""); }

  find(orgId: OrgId, taxId: string): Promise<RegistrationRecord | null> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.select().from(companyRegistrations)
        .where(and(eq(companyRegistrations.orgId, orgId), eq(companyRegistrations.taxId, taxId))).limit(1);
      if (!row) return null;
      return {
        registration: toRegistration(row),
        activities: await tx.select().from(companyRegistrationActivities)
          .where(eq(companyRegistrationActivities.registrationId, row.id)).orderBy(asc(companyRegistrationActivities.sortOrder)) as CompanyRegistrationActivity[],
        members: await tx.select().from(companyRegistrationMembers)
          .where(eq(companyRegistrationMembers.registrationId, row.id)).orderBy(asc(companyRegistrationMembers.sortOrder)) as CompanyRegistrationMember[],
        taxRegimes: await tx.select().from(companyRegistrationTaxRegimes)
          .where(eq(companyRegistrationTaxRegimes.registrationId, row.id)).orderBy(asc(companyRegistrationTaxRegimes.year)) as CompanyRegistrationTaxRegime[],
      };
    });
  }

  /**
   * Grava o registro e, quando `children` vem, **substitui** atividades, sócios
   * e regimes por inteiro.
   *
   * Substituir em vez de reconciliar linha a linha porque não há o que
   * preservar: ninguém edita este dado, ele é o retrato da fonte num instante.
   * Tentar casar linha antiga com nova só inventaria identidade onde a Receita
   * não dá nenhuma.
   *
   * Sem `children` (uma tentativa que falhou), os filhos ficam como estavam: o
   * que já se sabia da empresa continua valendo enquanto a fonte não responde.
   */
  save(orgId: OrgId, value: RegistrationWrite, children: RegistrationChildren | null): Promise<RegistrationRecord & { txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const now = new Date();
      const [row] = await tx.insert(companyRegistrations)
        .values({ id: companyRegistrationId.create(), orgId, ...value, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: [companyRegistrations.orgId, companyRegistrations.taxId], set: { ...value, updatedAt: now } })
        .returning();
      if (!row) throw new Error("A gravação do cadastro não devolveu linha.");

      if (children) {
        await tx.delete(companyRegistrationActivities).where(eq(companyRegistrationActivities.registrationId, row.id));
        await tx.delete(companyRegistrationMembers).where(eq(companyRegistrationMembers.registrationId, row.id));
        await tx.delete(companyRegistrationTaxRegimes).where(eq(companyRegistrationTaxRegimes.registrationId, row.id));
        if (children.activities.length > 0) {
          await tx.insert(companyRegistrationActivities)
            .values(children.activities.map((activity) => ({ id: companyRegistrationActivityId.create(), orgId, registrationId: row.id, ...activity })));
        }
        if (children.members.length > 0) {
          await tx.insert(companyRegistrationMembers)
            .values(children.members.map((member) => ({ id: companyRegistrationMemberId.create(), orgId, registrationId: row.id, ...member })));
        }
        if (children.taxRegimes.length > 0) {
          await tx.insert(companyRegistrationTaxRegimes)
            .values(children.taxRegimes.map((regime) => ({ id: companyRegistrationTaxRegimeId.create(), orgId, registrationId: row.id, ...regime })));
        }
      }

      const ids = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text AS txid`);
      if (!ids[0]) throw new Error("Não foi possível obter o txid da transação.");

      return {
        registration: toRegistration(row),
        activities: await tx.select().from(companyRegistrationActivities)
          .where(eq(companyRegistrationActivities.registrationId, row.id)).orderBy(asc(companyRegistrationActivities.sortOrder)) as CompanyRegistrationActivity[],
        members: await tx.select().from(companyRegistrationMembers)
          .where(eq(companyRegistrationMembers.registrationId, row.id)).orderBy(asc(companyRegistrationMembers.sortOrder)) as CompanyRegistrationMember[],
        taxRegimes: await tx.select().from(companyRegistrationTaxRegimes)
          .where(eq(companyRegistrationTaxRegimes.registrationId, row.id)).orderBy(asc(companyRegistrationTaxRegimes.year)) as CompanyRegistrationTaxRegime[],
        txid: Number(ids[0].txid),
      };
    });
  }
}

function toRegistration(row: typeof companyRegistrations.$inferSelect): CompanyRegistration {
  return {
    ...row,
    fetchedAt: row.fetchedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as CompanyRegistration;
}
