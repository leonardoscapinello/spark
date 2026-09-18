import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { businessHours, createAppDbClient, holidays, type SparkDb, withOrgContext } from "@spark/db";
import type { BusinessHour, Holiday, HolidayId, OrgId, SaveBusinessHourInput, SaveHolidayInput } from "@spark/core";

@Injectable()
export class BusinessCalendarRepository {
  private readonly db: SparkDb = createAppDbClient();

  saveBusinessHour(orgId: OrgId, input: SaveBusinessHourInput): Promise<{ businessHour: BusinessHour; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx.insert(businessHours).values({ ...input, orgId }).onConflictDoUpdate({ target: [businessHours.orgId, businessHours.weekday], set: { enabled: input.enabled, startTime: input.startTime, breakStartTime: input.breakStartTime, breakEndTime: input.breakEndTime, endTime: input.endTime, timeZone: input.timeZone, updatedAt: new Date() } }).returning();
      if (!row) throw new Error("Business hour write returned no row.");
      return { businessHour: toBusinessHour(row), txid };
    });
  }

  saveHoliday(orgId: OrgId, input: SaveHolidayInput): Promise<{ holiday: Holiday; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx.insert(holidays).values({ ...input, orgId }).onConflictDoUpdate({ target: holidays.id, set: { startDate: input.startDate, endDate: input.endDate, name: input.name, kind: input.kind, startTime: input.startTime, breakStartTime: input.breakStartTime, breakEndTime: input.breakEndTime, endTime: input.endTime, repeatsAnnually: input.repeatsAnnually, updatedAt: new Date() } }).returning();
      if (!row) throw new Error("Holiday write returned no row.");
      return { holiday: toHoliday(row), txid };
    });
  }

  removeHoliday(orgId: OrgId, id: HolidayId): Promise<{ holiday: null; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx.delete(holidays).where(and(eq(holidays.orgId, orgId), eq(holidays.id, id))).returning({ id: holidays.id });
      if (!row) throw new NotFoundException(`Holiday ${id} not found.`);
      return { holiday: null, txid };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> { const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`); return Number(rows[0]?.txid); }
function toBusinessHour(row: typeof businessHours.$inferSelect): BusinessHour { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as BusinessHour; }
function toHoliday(row: typeof holidays.$inferSelect): Holiday { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as Holiday; }
