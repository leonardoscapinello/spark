import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { calendarEvents, createDbClient, integrationConnections, integrationSecrets, withOrgContext, type SparkDb } from "@spark/db";
import { CALENDAR_PROVIDERS, calendarEventId, integrationConnectionId, orgId as orgIdFactory, userId, type CalendarProvider, type IntegrationConnectionId, type OrgId } from "@spark/core";
import { loadCalendarFeed, normalizeCalendarFeed } from "../infrastructure/calendar-feed.js";
import { ConnectionSettingsRepository } from "../infrastructure/connection-settings.repository.js";
import { SecretVault } from "../infrastructure/secret-vault.service.js";

@Injectable()
export class CalendarFeedSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly settings: ConnectionSettingsRepository, private readonly vault: SecretVault) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === "test") return;
    const run = () => void this.syncConnectedCalendars().catch((error: unknown) => process.stderr.write(`calendar sync: ${error instanceof Error ? error.message : String(error)}\n`));
    run();
    this.timer = setInterval(run, Number(process.env.CALENDAR_SYNC_INTERVAL_MS ?? 5 * 60 * 1_000));
    this.timer.unref();
  }

  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }

  async syncConnectedCalendars(): Promise<number> {
    const connections = await this.db.select({ id: integrationConnections.id, orgId: integrationConnections.orgId, provider: integrationConnections.provider }).from(integrationConnections).where(and(eq(integrationConnections.status, "connected"), inArray(integrationConnections.provider, CALENDAR_PROVIDERS)));
    let total = 0;
    for (const connection of connections) {
      const orgId = orgIdFactory.from(connection.orgId);
      const id = integrationConnectionId.from(connection.id);
      try {
        const loaded = await withOrgContext(this.db, orgId, async (tx) => {
          const [secret] = await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.orgId, orgId), eq(integrationSecrets.connectionId, id))).limit(1);
          return { config: await this.settings.read(tx, id), secrets: secret ? this.vault.decrypt(secret) : {} };
        });
        total += await this.sync(orgId, id, connection.provider, loaded.config, loaded.secrets);
      } catch (error) {
        await withOrgContext(this.db, orgId, async (tx) => { await tx.update(integrationConnections).set({ lastError: error instanceof Error ? error.message : "Falha ao sincronizar agenda.", updatedAt: new Date() }).where(eq(integrationConnections.id, id)); });
      }
    }
    return total;
  }

  async sync(orgId: OrgId, connectionId: IntegrationConnectionId, provider: string, config: Record<string, unknown>, secrets: Record<string, string>): Promise<number> {
    if (!CALENDAR_PROVIDERS.includes(provider as CalendarProvider)) return 0;
    const ownerId = userId.from(requiredConfig(config, "ownerId"));
    const calendarName = requiredConfig(config, "calendarName");
    const feed = await loadCalendarFeed(provider as CalendarProvider, requiredSecret(secrets, "feedUrl"));
    const now = new Date();
    const from = new Date(now); from.setDate(from.getDate() - 31);
    const to = new Date(now); to.setFullYear(to.getFullYear() + 1);
    const normalized = normalizeCalendarFeed(feed, from, to);
    const syncedAt = new Date();
    await withOrgContext(this.db, orgId, async (tx) => {
      const existing = await tx.select({ id: calendarEvents.id, externalId: calendarEvents.externalId }).from(calendarEvents).where(and(eq(calendarEvents.connectionId, connectionId), gte(calendarEvents.startsAt, from), lte(calendarEvents.startsAt, to)));
      const ids = new Map(existing.map((event) => [event.externalId, event.id]));
      if (normalized.length) await tx.insert(calendarEvents).values(normalized.map((event) => ({
        id: ids.get(event.externalId) ?? calendarEventId.create(), orgId, ownerId, connectionId,
        provider: provider as CalendarProvider, calendarName, ...event, syncedAt,
      }))).onConflictDoUpdate({ target: [calendarEvents.connectionId, calendarEvents.externalId], set: {
        ownerId, provider, calendarName, title: sql`excluded.title`, description: sql`excluded.description`,
        startsAt: sql`excluded.starts_at`, endsAt: sql`excluded.ends_at`, allDay: sql`excluded.all_day`,
        availability: sql`excluded.availability`, location: sql`excluded.location`, status: sql`excluded.status`,
        syncedAt, updatedAt: syncedAt,
      } });
      const current = new Set(normalized.map((event) => event.externalId));
      const stale = existing.filter((event) => !current.has(event.externalId)).map((event) => event.id);
      if (stale.length) await tx.delete(calendarEvents).where(inArray(calendarEvents.id, stale));
    });
    return normalized.length;
  }
}

function requiredConfig(config: Record<string, unknown>, key: string): string { const value = config[key]; if (typeof value !== "string" || !value.trim()) throw new Error(`${key} é obrigatório.`); return value.trim(); }
function requiredSecret(secrets: Record<string, string>, key: string): string { const value = secrets[key]; if (!value?.trim()) throw new Error(`${key} é obrigatório.`); return value.trim(); }
