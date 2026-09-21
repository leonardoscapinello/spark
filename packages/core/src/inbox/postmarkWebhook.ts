export interface PostmarkInboundEmail {
  externalId: string;
  senderId: string;
  senderName: string | null;
  subject: string;
  text: string;
  occurredAt: Date;
}

/** Postmark's inbound parse webhook posts one email per request. Only a readable body (text, or html stripped of tags as a fallback) is ingested. */
export function parsePostmarkInboundEmail(payload: unknown): PostmarkInboundEmail | null {
  if (!isRecord(payload)) return null;
  const from = payload.From;
  const messageId = payload.MessageID;
  if (typeof from !== "string" || !from.trim() || typeof messageId !== "string" || !messageId.trim()) return null;
  const text = readableBody(payload);
  if (!text) return null;
  const subject = typeof payload.Subject === "string" && payload.Subject.trim() ? payload.Subject.trim() : "(sem assunto)";
  const senderName = typeof payload.FromName === "string" && payload.FromName.trim() ? payload.FromName.trim() : null;
  const occurredAt = typeof payload.Date === "string" ? new Date(payload.Date) : new Date();
  return { externalId: `email:${messageId.trim()}`, senderId: from.trim(), senderName, subject, text: text.slice(0, 20_000), occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt };
}

function readableBody(payload: Record<string, unknown>): string {
  if (typeof payload.TextBody === "string" && payload.TextBody.trim()) return payload.TextBody.trim();
  if (typeof payload.HtmlBody === "string" && payload.HtmlBody.trim()) return stripHtml(payload.HtmlBody).trim();
  return "";
}

function stripHtml(html: string): string {
  return html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
