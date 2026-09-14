import { Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, userPreferenceItems, userPreferences, withOrgContext, type SparkDb } from "@spark/db";
import { fromPreferenceStorage, toPreferenceStorage, type PreferenceKind } from "@spark/core";
import type { OrgId, UpsertUserPreferenceInput, UserId, UserPreference } from "@spark/core";

/**
 * Sem DomainEventWriter: preferência de interface não é fato de negócio
 * (mesmo critério das visões salvas). Uma linha por (org, usuário, chave);
 * gravar de novo atualiza o valor e mantém o id da primeira gravação.
 *
 * O valor não é JSON (ADR-0035): escalar mora na coluna do seu tipo, e lista e
 * objeto viram linhas em `user_preference_items`. A tradução nos dois sentidos
 * está em `packages/core/rules/preferenceStorage`, para que o cliente e o
 * servidor concordem.
 */
@Injectable()
export class UserPreferencesRepository {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");

  upsert(orgId: OrgId, userId: UserId, key: string, input: UpsertUserPreferenceInput): Promise<{ preference: UserPreference; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const storage = toPreferenceStorage(input.value);
      const columns = {
        valueKind: storage.kind,
        valueText: storage.valueText,
        valueNumber: storage.valueNumber === null ? null : String(storage.valueNumber),
        valueBoolean: storage.valueBoolean,
        updatedAt: new Date(),
      };

      const [row] = await tx.insert(userPreferences)
        .values({ id: input.id, orgId, userId, key, ...columns })
        .onConflictDoUpdate({ target: [userPreferences.orgId, userPreferences.userId, userPreferences.key], set: columns })
        .returning();
      if (!row) throw new Error("User preference upsert returned no row.");

      // A lista é substituída inteira: é a semântica de «a preferência agora é
      // isto», e a única que funciona quando um item sai.
      await tx.delete(userPreferenceItems).where(eq(userPreferenceItems.preferenceId, row.id));
      if (storage.items.length > 0) {
        await tx.insert(userPreferenceItems).values(storage.items.map((item) => ({
          orgId,
          userId,
          preferenceId: row.id,
          itemKey: item.itemKey,
          sortOrder: item.sortOrder,
          valueText: item.valueText,
          valueNumber: item.valueNumber === null ? null : String(item.valueNumber),
          valueBoolean: item.valueBoolean,
        })));
      }

      return { preference: toPreference(row, storage.items), txid: await captureTxid(tx) };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toPreference(
  row: typeof userPreferences.$inferSelect,
  items: readonly { itemKey: string | null; sortOrder: number; valueText: string | null; valueNumber: number | null; valueBoolean: boolean | null }[],
): UserPreference {
  const value = fromPreferenceStorage(
    {
      kind: row.valueKind as PreferenceKind,
      valueText: row.valueText,
      valueNumber: row.valueNumber === null ? null : Number(row.valueNumber),
      valueBoolean: row.valueBoolean,
    },
    items,
  );
  // As colunas de armazenamento não fazem parte do contrato: a API devolve o
  // valor montado, e é ele que a tela conhece.
  return {
    id: row.id,
    orgId: row.orgId,
    userId: row.userId,
    key: row.key,
    value,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as UserPreference;
}
