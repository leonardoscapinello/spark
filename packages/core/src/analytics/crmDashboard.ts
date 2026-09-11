import type { Activity } from "../schema/activity.js";
import type { Contact, LeadStatus } from "../schema/contact.js";
import type { Deal, DealStatus } from "../schema/deal.js";
import { sum, type Money } from "../money/money.js";

export interface CrmDashboardDay {
  date: string;
  newContacts: number;
  newDeals: number;
  activities: number;
}

export interface CrmDashboardSnapshot {
  totalContacts: number;
  newContacts: number;
  newContactsChange: number | null;
  openDeals: number;
  openPipelineAmount: Money;
  overdueActivities: number;
  activityCompletionRate: number | null;
  days: CrmDashboardDay[];
  dealsByStatus: Record<DealStatus, number>;
  contactsByStatus: Record<LeadStatus, number>;
}

export function buildCrmDashboard(input: {
  contacts: readonly Contact[];
  deals: readonly Deal[];
  activities: readonly Activity[];
  now: Date;
  periodDays: number;
}): CrmDashboardSnapshot {
  const periodDays = Math.max(1, Math.min(90, Math.trunc(input.periodDays)));
  const tomorrow = startOfDay(input.now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const currentStart = new Date(tomorrow);
  currentStart.setDate(currentStart.getDate() - periodDays);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - periodDays);
  const contacts = input.contacts.filter((contact) => !contact.deletedAt);
  const deals = input.deals.filter((deal) => !deal.deletedAt);
  const currentContacts = contacts.filter((contact) => within(contact.createdAt, currentStart, tomorrow));
  const previousContacts = contacts.filter((contact) => within(contact.createdAt, previousStart, currentStart));
  const periodActivities = input.activities.filter((activity) => within(activity.scheduledAt, currentStart, tomorrow));
  const open = deals.filter((deal) => deal.status === "open");

  return {
    totalContacts: contacts.length,
    newContacts: currentContacts.length,
    newContactsChange: percentageChange(previousContacts.length, currentContacts.length),
    openDeals: open.length,
    openPipelineAmount: sum(open.map((deal) => deal.amount)),
    overdueActivities: input.activities.filter((activity) => !activity.completed && new Date(activity.scheduledAt) < startOfDay(input.now)).length,
    activityCompletionRate: periodActivities.length === 0
      ? null
      : Math.round((periodActivities.filter((activity) => activity.completed).length / periodActivities.length) * 100),
    days: Array.from({ length: periodDays }, (_, index) => {
      const date = new Date(currentStart);
      date.setDate(date.getDate() + index);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      return {
        date: dateKey(date),
        newContacts: contacts.filter((contact) => within(contact.createdAt, date, next)).length,
        newDeals: deals.filter((deal) => within(deal.createdAt, date, next)).length,
        activities: input.activities.filter((activity) => within(activity.scheduledAt, date, next)).length,
      };
    }),
    dealsByStatus: countBy(deals, ["open", "won", "lost"], (deal) => deal.status),
    contactsByStatus: countBy(contacts, ["new", "qualified", "nurturing", "customer", "unqualified"], (contact) => contact.leadStatus),
  };
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function within(value: string, start: Date, end: Date): boolean {
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function percentageChange(previous: number, current: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function countBy<T, K extends string>(values: readonly T[], keys: readonly K[], keyOf: (value: T) => K): Record<K, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const value of values) counts[keyOf(value)] += 1;
  return counts;
}
