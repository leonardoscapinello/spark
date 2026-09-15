import { Injectable } from "@nestjs/common";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { calendarEvents, createDbClient, withOrgContext, type SparkDb } from "@spark/db";
import { CALENDAR_PROVIDERS, calendarEventId, userId, type CalendarProvider, type IntegrationConnectionId, type OrgId } from "@spark/core";
import { loadCalendarFeed, normalizeCalendarFeed } from "../infrastructure/calendar-feed.js";

@Injectable()
export class CalendarFeedSyncService {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");

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
