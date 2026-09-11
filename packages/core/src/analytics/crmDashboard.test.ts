import { describe, expect, it } from "vitest";
import { buildCrmDashboard } from "./crmDashboard.js";
import { money, toCents } from "../money/money.js";
import type { Activity } from "../schema/activity.js";
import type { Contact } from "../schema/contact.js";
import type { Deal } from "../schema/deal.js";

describe("buildCrmDashboard", () => {
  it("calculates the current CRM snapshot and daily series", () => {
    const contacts = [
      { id: "c1", createdAt: "2026-09-10T12:00:00Z", deletedAt: null, leadStatus: "new" },
      { id: "c2", createdAt: "2026-09-02T12:00:00Z", deletedAt: null, leadStatus: "customer" },
      { id: "c3", createdAt: "2026-09-11T12:00:00Z", deletedAt: "2026-09-11T13:00:00Z", leadStatus: "qualified" },
    ] as Contact[];
    const deals = [
      { id: "d1", createdAt: "2026-09-10T12:00:00Z", deletedAt: null, status: "open", amount: money(12_500) },
      { id: "d2", createdAt: "2026-09-09T12:00:00Z", deletedAt: null, status: "won", amount: money(5_000) },
    ] as Deal[];
    const activities = [
      { id: "a1", scheduledAt: "2026-09-10T12:00:00Z", completed: true },
      { id: "a2", scheduledAt: "2026-09-01T12:00:00Z", completed: false },
    ] as Activity[];

    const result = buildCrmDashboard({ contacts, deals, activities, now: new Date("2026-09-11T15:00:00Z"), periodDays: 7 });

    expect(result.totalContacts).toBe(2);
    expect(result.newContacts).toBe(1);
    expect(result.newContactsChange).toBe(0);
    expect(result.openDeals).toBe(1);
    expect(toCents(result.openPipelineAmount)).toBe(12_500);
    expect(result.overdueActivities).toBe(1);
    expect(result.activityCompletionRate).toBe(100);
    expect(result.days.find((day) => day.date === "2026-09-10")).toMatchObject({ newContacts: 1, newDeals: 1, activities: 1 });
    expect(result.dealsByStatus).toEqual({ open: 1, won: 1, lost: 0 });
  });
});
