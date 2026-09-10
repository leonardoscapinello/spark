import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { createDbClient, withOrgContext, pipelines, type SparkDb } from "@spark/db";
import type { Pipeline, CreatePipelineInput, OrgId } from "@spark/core";

/** Mesmo padrão de ContactsRepository — withOrgContext, RLS de verdade, captura txid (docs/adr/0018, docs/adr/0022). */
@Injectable()
export class PipelinesRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async create(orgId: OrgId, input: CreatePipelineInput): Promise<{ pipeline: Pipeline; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Não foi possível obter o txid da transação.");
      const { txid } = txidRow;

      const [linha] = await tx
        .insert(pipelines)
        .values({ id: input.id, orgId, nome: input.nome, padrao: input.padrao ?? false })
        .returning();

      if (!linha) throw new Error("Insert de pipeline não retornou linha.");

      return { pipeline: paraPipeline(linha), txid: Number(txid) };
    });
  }
}

function paraPipeline(linha: {
  id: string;
  orgId: string;
  nome: string;
  padrao: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  arquivadoEm: Date | null;
}): Pipeline {
  return {
    id: linha.id,
    orgId: linha.orgId,
    nome: linha.nome,
    padrao: linha.padrao,
    criadoEm: linha.criadoEm.toISOString(),
    atualizadoEm: linha.atualizadoEm.toISOString(),
    arquivadoEm: linha.arquivadoEm?.toISOString() ?? null,
  } as Pipeline;
}
