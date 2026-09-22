import type { Conversation } from "../schema/inbox.js";

export interface InboxDashboardSnapshot {
  openConversations: number;
  unassignedConversations: number;
  resolvedInPeriod: number;
  averageFirstResponseMinutes: number | null;
  averageResolutionMinutes: number | null;
}

/**
 * Igual ao buildCrmDashboard: lê só o que já está sincronizado localmente
 * (docs/adr/0018) — nenhuma chamada de rede pra montar o relatório.
 * `firstRespondedAt`/`resolvedAt` só existem em conversas que já passaram
 * por aquele marco; a média ignora as que não chegaram lá ainda.
 */
export function buildInboxDashboard(input: {
  conversations: readonly Conversation[];
  now: Date;
  periodDays: number;
}): InboxDashboardSnapshot {
  const periodDays = Math.max(1, Math.min(90, Math.trunc(input.periodDays)));
  const periodStart = new Date(input.now.getTime() - periodDays * 86_400_000);

  const open = input.conversations.filter((conversation) => conversation.status === "open");
  const resolvedInPeriod = input.conversations.filter((conversation) => conversation.resolvedAt && within(conversation.resolvedAt, periodStart, input.now));

  return {
    openConversations: open.length,
    unassignedConversations: open.filter((conversation) => conversation.assigneeId === null).length,
    resolvedInPeriod: resolvedInPeriod.length,
    averageFirstResponseMinutes: averageMinutesBetween(input.conversations, (conversation) => conversation.firstRespondedAt ? [conversation.createdAt, conversation.firstRespondedAt] : null),
    averageResolutionMinutes: averageMinutesBetween(resolvedInPeriod, (conversation) => conversation.resolvedAt ? [conversation.createdAt, conversation.resolvedAt] : null),
  };
}

function within(value: string, start: Date, end: Date): boolean {
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function averageMinutesBetween<T>(values: readonly T[], span: (value: T) => [string, string] | null): number | null {
  const minutes = values.map(span).filter((pair): pair is [string, string] => pair !== null).map(([start, end]) => (new Date(end).getTime() - new Date(start).getTime()) / 60_000);
  if (minutes.length === 0) return null;
  return Math.round(minutes.reduce((total, value) => total + value, 0) / minutes.length);
}
