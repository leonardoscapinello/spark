import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { createDbClient, integrationConnections, integrationSecrets, withOrgContext, type SparkDb } from "@spark/db";
import type { IntegrationConnection, IntegrationConnectionId, IntegrationWriteResponse, OrgId, UpdateIntegrationStatusInput, UpsertIntegrationInput, UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import { ConnectionSettingsRepository } from "./connection-settings.repository.js";
import { IntegrationProviderRegistry } from "./provider-registry.service.js";
import { SecretVault } from "./secret-vault.service.js";

@Injectable()
export class IntegrationsRepository {
  private readonly db: SparkDb;
  constructor(private readonly vault: SecretVault, private readonly providers: IntegrationProviderRegistry, private readonly events: DomainEventWriter, private readonly settings: ConnectionSettingsRepository) { this.db = createDbClient(process.env.DATABASE_URL ?? ""); }
  upsert(orgId: OrgId, actorUserId: UserId, input: UpsertIntegrationInput): Promise<IntegrationWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const existing = await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id, input.id), eq(integrationConnections.orgId, orgId))).limit(1);
      const [storedSecret] = input.credentials ? await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.connectionId, input.id), eq(integrationSecrets.orgId, orgId))).limit(1) : [];
      const mergedCredentials = input.credentials ? { ...(storedSecret ? this.vault.decrypt(storedSecret) : {}), ...input.credentials } : null;
      const encrypted = mergedCredentials ? this.vault.encrypt(mergedCredentials) : null;
      const hint = mergedCredentials ? credentialHint(mergedCredentials) : existing[0]?.credentialHint ?? null;
      const [row] = existing[0]
        ? await tx.update(integrationConnections).set({ provider: input.provider, name: input.name, config: input.config, ...(encrypted ? { credentialsConfigured: true, credentialHint: hint } : {}), status: "not_configured", lastError: null, updatedAt: new Date() }).where(eq(integrationConnections.id, input.id)).returning()
        : await tx.insert(integrationConnections).values({ id: input.id, orgId, provider: input.provider, name: input.name, config: input.config, credentialsConfigured: Boolean(encrypted), credentialHint: hint }).returning();
      if (!row) throw new Error("Integration upsert returned no row.");
      await this.settings.replace(tx, orgId, row.id, input.config);
      if (encrypted) await tx.insert(integrationSecrets).values({ connectionId: input.id, orgId, ...encrypted }).onConflictDoUpdate({ target: integrationSecrets.connectionId, set: { ...encrypted, updatedAt: new Date() } });
      const txid = await captureTxid(tx);
      await this.events.append(tx, { orgId, type: "integration.configured", data: { connectionId: input.id, provider: input.provider, actorUserId } });
      return { connection: toConnection(row), txid };
    });
  }
  async check(orgId: OrgId, actorUserId: UserId, id: IntegrationConnectionId): Promise<IntegrationWriteResponse> {
    const loaded = await withOrgContext(this.db, orgId, async (tx) => {
      const [connection] = await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id, id), eq(integrationConnections.orgId, orgId))).limit(1);
      if (!connection) throw new NotFoundException(`Integration ${id} not found.`);
      const [secret] = await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.connectionId, id), eq(integrationSecrets.orgId, orgId))).limit(1);
      return { connection: { ...connection, config: await this.settings.read(tx, connection.id) }, secrets: secret ? this.vault.decrypt(secret) : {} };
    });
    let error: string | null = null;
    try { await this.providers.check(loaded.connection.provider as IntegrationConnection["provider"], loaded.connection.config, loaded.secrets); }
    catch (cause) { error = cause instanceof Error ? cause.message : "Connection check failed."; }
    return withOrgContext(this.db, orgId, async (tx) => {
      const now = new Date(); const txid = await captureTxid(tx);
      const [row] = await tx.update(integrationConnections).set({ status: error ? "error" : "connected", lastCheckedAt: now, lastError: error, updatedAt: now }).where(and(eq(integrationConnections.id, id), eq(integrationConnections.orgId, orgId))).returning();
      if (!row) throw new NotFoundException(`Integration ${id} not found.`);
      await this.events.append(tx, { orgId, type: "integration.checked", data: { connectionId: id, provider: row.provider, ok: !error, actorUserId } });
      return { connection: toConnection(row), txid };
    });
  }
  status(orgId: OrgId, actorUserId: UserId, id: IntegrationConnectionId, input: UpdateIntegrationStatusInput): Promise<IntegrationWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx.update(integrationConnections).set({ status: input.disabled ? "disabled" : "not_configured", updatedAt: new Date() }).where(and(eq(integrationConnections.id, id), eq(integrationConnections.orgId, orgId))).returning();
      if (!row) throw new NotFoundException(`Integration ${id} not found.`);
      await this.events.append(tx, { orgId, type: input.disabled ? "integration.disabled" : "integration.enabled", data: { connectionId: id, actorUserId } });
      return { connection: toConnection(row), txid };
    });
  }
}
async function captureTxid(tx: SparkDb): Promise<number> { const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`); if (!rows[0]) throw new Error("Could not obtain transaction id."); return Number(rows[0].txid); }
function toConnection(row: typeof integrationConnections.$inferSelect): IntegrationConnection { return { ...row, lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as IntegrationConnection; }
function credentialHint(credentials: Record<string, string>): string | null { const value = Object.values(credentials).find(Boolean); return value ? `•••• ${value.slice(-4)}` : null; }
