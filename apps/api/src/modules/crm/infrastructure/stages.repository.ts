import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, stages, type SparkDb } from "@spark/db";
import type { Stage, CreateStageInput, OrgId, StageId } from "@spark/core";

@Injectable()
export class StagesRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async create(orgId: OrgId, input: CreateStageInput): Promise<{ stage: Stage; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Não foi possível obter o txid da transação.");
      const { txid } = txidRow;

      const [linha] = await tx
        .insert(stages)
        .values({
          id: input.id,
          orgId,
          pipelineId: input.pipelineId,
          nome: input.nome,
          ordem: input.ordem,
          probabilidade: input.probabilidade ?? 0,
        })
        .returning();

      if (!linha) throw new Error("Insert de estágio não retornou linha.");

      return { stage: paraStage(linha), txid: Number(txid) };
    });
  }

  async renomear(orgId: OrgId, id: StageId, nome: string): Promise<{ stage: Stage; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Não foi possível obter o txid da transação.");
      const { txid } = txidRow;

      const [linha] = await tx
        .update(stages)
        .set({ nome, atualizadoEm: new Date() })
        .where(eq(stages.id, id))
        .returning();

      if (!linha) throw new NotFoundException(`Estágio ${id} não encontrado.`);

      return { stage: paraStage(linha), txid: Number(txid) };
    });
  }
}

function paraStage(linha: {
  id: string;
  orgId: string;
  pipelineId: string;
  nome: string;
  ordem: number;
  probabilidade: number;
  criadoEm: Date;
  atualizadoEm: Date;
  arquivadoEm: Date | null;
}): Stage {
  return {
    id: linha.id,
    orgId: linha.orgId,
    pipelineId: linha.pipelineId,
    nome: linha.nome,
    ordem: linha.ordem,
    probabilidade: linha.probabilidade,
    criadoEm: linha.criadoEm.toISOString(),
    atualizadoEm: linha.atualizadoEm.toISOString(),
    arquivadoEm: linha.arquivadoEm?.toISOString() ?? null,
  } as Stage;
}
