import type { CannedReply } from "../schema/inbox.js";

export function normalizeCannedReplyShortcut(value: string): string {
  const normalized = value.trim().toLocaleLowerCase("pt-BR").replace(/^\/+/, "").replace(/\s+/g, "-");
  if (!normalized || !/^[a-z0-9áàâãéèêíïóôõöúç_-]+$/i.test(normalized)) throw new Error("O atalho aceita letras, números, hífen e sublinhado.");
  return normalized;
}

export function availableCannedReplies(replies: readonly CannedReply[], teamId: string | null): CannedReply[] {
  return replies.filter((reply) => !reply.archivedAt && (reply.teamId === null || reply.teamId === teamId)).sort((a, b) => a.shortcut.localeCompare(b.shortcut, "pt-BR"));
}
