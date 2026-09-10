import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, deals, type SparkDb } from "@spark/db";
import {
  money,
  toCentavos,
  type Deal,
  type CreateDealInput,
  type CloseDealInput,
  type OrgId,
  type DealId,
  type StageId,
} from "@spark/core";

@Injectable()
export class DealsRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async create(orgId: OrgId, input: CreateDealInput): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await capturarTxid(tx);

      const [linha] = await tx
        .insert(deals)
        .values({
          id: input.id,
          orgId,
          pipelineId: input.pipelineId,
          stageId: input.stageId,
          contactId: input.contactId ?? null,
          nome: input.nome,
          valor: toCentavos(input.valor),
          status: input.status ?? "aberto",
          dataFechamentoEsperada: input.dataFechamentoEsperada ? new Date(input.dataFechamentoEsperada) : null,
          motivoPerda: input.motivoPerda ?? null,
        })
        .returning();

      if (!linha) throw new Error("Insert de negócio não retornou linha.");

      return { deal: paraDeal(linha), txid };
    });
  }

  /** A ação de arrastar-e-soltar: só muda o stageId, nada mais (roadmap.md, Fase 1). */
  async move(orgId: OrgId, dealId: DealId, stageId: StageId): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await capturarTxid(tx);

      const [linha] = await tx
        .update(deals)
        .set({ stageId, atualizadoEm: new Date() })
        .where(eq(deals.id, dealId))
        .returning();

      if (!linha) throw new NotFoundException(`Negócio ${dealId} não encontrado.`);

      return { deal: paraDeal(linha), txid };
    });
  }

  /** Fechar como ganho ou perdido — a outra ação central do board. */
  async fechar(orgId: OrgId, dealId: DealId, input: CloseDealInput): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await capturarTxid(tx);

      const [linha] = await tx
        .update(deals)
        .set({
          status: input.status,
          motivoPerda: input.status === "perdido" ? (input.motivoPerda ?? null) : null,
          atualizadoEm: new Date(),
        })
        .where(eq(deals.id, dealId))
        .returning();

      if (!linha) throw new NotFoundException(`Negócio ${dealId} não encontrado.`);

      return { deal: paraDeal(linha), txid };
    });
  }
}

async function capturarTxid(tx: SparkDb): Promise<number> {
  const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const txidRow = txidRows[0];
  if (!txidRow) throw new Error("Não foi possível obter o txid da transação.");
  return Number(txidRow.txid);
}

function paraDeal(linha: {
  id: string;
  orgId: string;
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  nome: string;
  valor: number;
  status: string;
  dataFechamentoEsperada: Date | null;
  motivoPerda: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
  excluidoEm: Date | null;
}): Deal {
  return {
    id: linha.id,
    orgId: linha.orgId,
    pipelineId: linha.pipelineId,
    stageId: linha.stageId,
    contactId: linha.contactId,
    nome: linha.nome,
    valor: money(linha.valor),
    status: linha.status,
    dataFechamentoEsperada: linha.dataFechamentoEsperada?.toISOString() ?? null,
    motivoPerda: linha.motivoPerda,
    criadoEm: linha.criadoEm.toISOString(),
    atualizadoEm: linha.atualizadoEm.toISOString(),
    excluidoEm: linha.excluidoEm?.toISOString() ?? null,
  } as Deal;
}
