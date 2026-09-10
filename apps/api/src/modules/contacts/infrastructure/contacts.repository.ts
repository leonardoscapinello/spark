import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { createDbClient, withOrgContext, contacts, type SparkDb } from "@spark/db";
import type { Contact, CreateContactInput, OrgId } from "@spark/core";

/**
 * Toda escrita de negócio passa por withOrgContext — RLS aplicada de
 * verdade, não a conexão admin (docs/adr/0022, docs/adr/0026). Ao
 * contrário de UsersRepository (que resolve QUEM é o usuário e por isso
 * precisa atravessar organizações), aqui já sabemos o org_id — não há
 * motivo pra bypassar RLS.
 */
@Injectable()
export class ContactsRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  /**
   * Cria o contato e devolve também o txid da transação — é o que o
   * TanStack DB usa (`collection.utils.awaitTxId`) pra saber quando a
   * escrita otimista do cliente foi confirmada pelo Electric, não antes.
   */
  async create(orgId: OrgId, input: CreateContactInput): Promise<{ contact: Contact; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Não foi possível obter o txid da transação.");
      const { txid } = txidRow;
      const [linha] = await tx
        .insert(contacts)
        .values({
          id: input.id,
          orgId,
          nome: input.nome,
          email: input.email ?? null,
          telefone: input.telefone ?? null,
          score: input.score ?? 0,
          customFields: input.customFields ?? {},
          tags: input.tags ?? [],
        })
        .returning();

      if (!linha) throw new Error("Insert de contato não retornou linha.");

      return {
        contact: paraContact(linha),
        txid: Number(txid),
      };
    });
  }
}

function paraContact(linha: {
  id: string;
  orgId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  score: number;
  customFields: unknown;
  tags: unknown;
  criadoEm: Date;
  atualizadoEm: Date;
  excluidoEm: Date | null;
}): Contact {
  return {
    id: linha.id,
    orgId: linha.orgId,
    nome: linha.nome,
    email: linha.email,
    telefone: linha.telefone,
    score: linha.score,
    customFields: (linha.customFields ?? {}) as Record<string, unknown>,
    tags: (linha.tags ?? []) as string[],
    criadoEm: linha.criadoEm.toISOString(),
    atualizadoEm: linha.atualizadoEm.toISOString(),
    excluidoEm: linha.excluidoEm?.toISOString() ?? null,
  } as Contact;
}
