import type { ConversationPriority } from "../schema/inbox.js";

export const FIRST_RESPONSE_SLA_MINUTES: Readonly<Record<ConversationPriority, number>> = { normal: 60, priority: 15 };
export type ConversationSlaState = "met" | "on_track" | "due_soon" | "breached";

export function firstResponseDueAt(startedAt: string | Date, priority: ConversationPriority): string {
  return new Date(new Date(startedAt).getTime() + FIRST_RESPONSE_SLA_MINUTES[priority] * 60_000).toISOString();
}

export function conversationSlaState(dueAt: string, firstRespondedAt: string | null, now = new Date()): ConversationSlaState {
  const due = new Date(dueAt).getTime();
  if (firstRespondedAt) return new Date(firstRespondedAt).getTime() <= due ? "met" : "breached";
  const remaining = due - now.getTime();
  if (remaining <= 0) return "breached";
  return remaining <= 10 * 60_000 ? "due_soon" : "on_track";
}
