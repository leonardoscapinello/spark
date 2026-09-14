import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { integrationConnectionSettings, type SparkDb } from "@spark/db";
import type { OrgId } from "@spark/core";

/**
 * A configuração de uma conexão, chave por linha e cada tipo na sua coluna
 * (ADR-0035). Segredo não passa por aqui — continua cifrado em
 * `integration_secrets`, e nunca é publicado.
 */
@Injectable()
export class ConnectionSettingsRepository {
  /** Substitui a configuração inteira: apaga as chaves e regrava as que vieram. */
  async replace(tx: SparkDb, orgId: OrgId, connectionId: string, config: Record<string, unknown>): Promise<void> {
    await tx.delete(integrationConnectionSettings).where(eq(integrationConnectionSettings.connectionId, connectionId));

    const rows = Object.entries(config)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({
        orgId,
        connectionId,
        key,
        valueText: typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : null,
        valueNumber: typeof value === "number" ? String(value) : null,
        valueBoolean: typeof value === "boolean" ? value : null,
      }));
    if (rows.length > 0) await tx.insert(integrationConnectionSettings).values(rows).onConflictDoNothing();
  }

  /**
   * A configuração montada de volta no objeto que os provedores esperam.
   *
   * Texto que veio de um objeto volta como objeto: foi gravado como JSON
   * justamente por não ser um valor escalar, e quem lê espera a forma
   * original.
   */
  async read(tx: SparkDb, connectionId: string): Promise<Record<string, unknown>> {
    const rows = await tx.select().from(integrationConnectionSettings)
      .where(eq(integrationConnectionSettings.connectionId, connectionId));

    const config: Record<string, unknown> = {};
    for (const row of rows) {
      if (row.valueBoolean !== null) config[row.key] = row.valueBoolean;
      else if (row.valueNumber !== null) config[row.key] = Number(row.valueNumber);
      else if (row.valueText !== null) config[row.key] = revive(row.valueText);
    }
    return config;
  }
}

/** Só desfaz o JSON quando o texto é mesmo um objeto ou uma lista. */
function revive(value: string): unknown {
  const first = value.trimStart()[0];
  if (first !== "{" && first !== "[") return value;
  try { return JSON.parse(value) as unknown; } catch { return value; }
}
