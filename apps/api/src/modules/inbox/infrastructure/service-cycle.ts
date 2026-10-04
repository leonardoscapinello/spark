import { and, eq, isNull } from "drizzle-orm";
import { businessHours, holidays, serviceCycles, serviceSegments, serviceCycleHours, serviceCycleHolidays, type conversations, type SparkDb } from "@spark/db";
import { BusinessHourSchema, HolidaySchema, operatingMillisecondsBetween, selectServiceSla, type OrgId, type ServiceConfiguration, type ServiceStatus, type ServiceLifecycleEvent } from "@spark/core";

type ConversationRow = typeof conversations.$inferSelect;
/** Caller holds the conversation row lock; all records are committed in its transaction. */
export async function advanceServiceCycle(tx: SparkDb, orgId: OrgId, conversation: ConversationRow, config: ServiceConfiguration, status: ServiceStatus | null, event: ServiceLifecycleEvent, at: Date, reclassify = false, queuedAt?: Date) {
  let [cycle] = await tx.select().from(serviceCycles).where(and(eq(serviceCycles.orgId,orgId),eq(serviceCycles.conversationId,conversation.id),isNull(serviceCycles.closedAt))).limit(1);
  if (!cycle && conversation.status === "closed") return;
  if (event === "response" && (!cycle || (queuedAt && queuedAt < cycle.openedAt))) return;
  const policy = selectServiceSla(conversation.categoryId, conversation.servicePriorityId, config, conversation);
  if (!cycle) {
    [cycle] = await tx.insert(serviceCycles).values({ orgId, conversationId: conversation.id, openedAt: at, policyId: policy?.id ?? null, policyName: policy?.name ?? null, policyVersion: policy?.version ?? null, firstResponseMinutes: policy?.firstResponseMinutes ?? null, totalMinutes: policy?.totalMinutes ?? null, warningPercent: policy?.warningPercent ?? 80, firstInboundAt: event === "inbound" ? at : null }).returning();
    if (!cycle) throw new Error("Não foi possível iniciar o ciclo.");
    const snapshotCycleId = cycle.id;
    const calendar = await tx.select().from(businessHours).where(eq(businessHours.orgId,orgId));
    const exceptions = await tx.select().from(holidays).where(eq(holidays.orgId,orgId));
    if (calendar.length) await tx.insert(serviceCycleHours).values(calendar.map(({ id: _id, ...row }) => ({ ...row, cycleId: snapshotCycleId })));
    if (exceptions.length) await tx.insert(serviceCycleHolidays).values(exceptions.map(({ id: _id, ...row }) => ({ ...row, cycleId: snapshotCycleId })));
  }
  const cycleId = cycle.id;
  const [segment] = await tx.select().from(serviceSegments).where(and(eq(serviceSegments.orgId,orgId),eq(serviceSegments.cycleId,cycleId),isNull(serviceSegments.endedAt))).limit(1);
  const now = new Date(Math.max(at.getTime(), cycle.openedAt.getTime(), segment?.startedAt.getTime() ?? 0));
  const firstInboundAt = cycle.firstInboundAt ?? (event === "inbound" ? now : null);
  const firstRespondedAt = cycle.firstRespondedAt ?? (event === "response" && firstInboundAt && (!queuedAt || queuedAt >= firstInboundAt) ? now : null);
  const changesClock = !segment || event === "inbound" && !cycle.firstInboundAt || firstRespondedAt !== cycle.firstRespondedAt || conversation.status === "closed" || segment.statusId !== conversation.serviceStatusId || (!status && segment.statusName !== (conversation.status === "snoozed" ? "Em espera" : "Em atendimento")) || reclassify;
  if (!changesClock) return;
  if (segment) {
    const hourRows = await tx.select().from(serviceCycleHours).where(and(eq(serviceCycleHours.orgId,orgId),eq(serviceCycleHours.cycleId,cycleId)));
    const holidayRows = await tx.select().from(serviceCycleHolidays).where(and(eq(serviceCycleHolidays.orgId,orgId),eq(serviceCycleHolidays.cycleId,cycleId)));
    const dates = <T extends { createdAt: Date; updatedAt: Date }>(row:T) => ({ ...row, createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString() });
    const elapsedMs = operatingMillisecondsBetween(segment.startedAt, now, hourRows.map(row => BusinessHourSchema.parse(dates(row))), holidayRows.map(row => HolidaySchema.parse(dates(row))));
    await tx.update(serviceSegments).set({ endedAt: now, elapsedMs }).where(eq(serviceSegments.id,segment.id));
  }
  await tx.update(serviceCycles).set({ firstInboundAt, firstRespondedAt, closedAt: conversation.status === "closed" ? now : null,
    ...(reclassify ? { policyId:policy?.id ?? null,policyName:policy?.name ?? null,policyVersion:policy?.version ?? null,totalMinutes:policy?.totalMinutes ?? null,warningPercent:policy?.warningPercent ?? 80,...(!cycle.firstRespondedAt ? { firstResponseMinutes:policy?.firstResponseMinutes ?? null } : {}) } : {}),
  }).where(eq(serviceCycles.id,cycleId));
  if (conversation.status !== "closed") await tx.insert(serviceSegments).values({ orgId, conversationId:conversation.id,cycleId,statusId:conversation.serviceStatusId,statusName:status?.name ?? (conversation.status === "snoozed" ? "Em espera" : "Em atendimento"),startedAt:now,firstCounting:Boolean(firstInboundAt && !firstRespondedAt && !(status?.pauseFirstResponse ?? conversation.status === "snoozed")),totalCounting:!(status?.pauseTotal ?? conversation.status === "snoozed"),budgetMinutes:status?.budgetMinutes ?? null });
}
