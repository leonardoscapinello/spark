import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, activities, type SparkDb } from "@spark/db";
import type { Activity, CreateActivityInput, OrgId, ActivityId } from "@spark/core";

@Injectable()
export class ActivitiesRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async create(orgId: OrgId, input: CreateActivityInput): Promise<{ activity: Activity; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await capturarTxid(tx);

      const [linha] = await tx
        .insert(activities)
        .values({
          id: input.id,
          orgId,
          contactId: input.contactId ?? null,
          dealId: input.dealId ?? null,
          tipo: input.tipo,
          titulo: input.titulo,
          notas: input.notas ?? null,
          dataHora: new Date(input.dataHora),
        })
        .returning();

      if (!linha) throw new Error("Insert de atividade não retornou linha.");

      return { activity: paraActivity(linha), txid };
    });
  }

  /** Concluir ou reabrir — mesma rota nos dois sentidos (docs/core/schema/activity.ts). */
  async completar(orgId: OrgId, id: ActivityId, concluida: boolean): Promise<{ activity: Activity; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await capturarTxid(tx);

      const [linha] = await tx
        .update(activities)
        .set({ concluida, concluidaEm: concluida ? new Date() : null, atualizadoEm: new Date() })
        .where(eq(activities.id, id))
        .returning();

      if (!linha) throw new NotFoundException(`Atividade ${id} não encontrada.`);

      return { activity: paraActivity(linha), txid };
    });
  }
}

async function capturarTxid(tx: SparkDb): Promise<number> {
  const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const txidRow = txidRows[0];
  if (!txidRow) throw new Error("Não foi possível obter o txid da transação.");
  return Number(txidRow.txid);
}

function paraActivity(linha: {
  id: string;
  orgId: string;
  contactId: string | null;
  dealId: string | null;
  tipo: string;
  titulo: string;
  notas: string | null;
  dataHora: Date;
  concluida: boolean;
  concluidaEm: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
}): Activity {
  return {
    id: linha.id,
    orgId: linha.orgId,
    contactId: linha.contactId,
    dealId: linha.dealId,
    tipo: linha.tipo,
    titulo: linha.titulo,
    notas: linha.notas,
    dataHora: linha.dataHora.toISOString(),
    concluida: linha.concluida,
    concluidaEm: linha.concluidaEm?.toISOString() ?? null,
    criadoEm: linha.criadoEm.toISOString(),
    atualizadoEm: linha.atualizadoEm.toISOString(),
  } as Activity;
}
