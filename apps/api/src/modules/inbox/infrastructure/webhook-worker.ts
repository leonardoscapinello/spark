import type { INestApplicationContext } from "@nestjs/common";
import { Worker, type ConnectionOptions, type Job } from "bullmq";
import type { IntegrationConnectionId } from "@spark/core";
import { WEBHOOK_QUEUE, type WebhookJobData } from "./webhook-queue.service.js";
import { WhatsAppWebhookRepository } from "./whatsapp-webhook.repository.js";
import { InstagramWebhookRepository } from "./instagram-webhook.repository.js";
import { MessengerWebhookRepository } from "./messenger-webhook.repository.js";
import { TelegramWebhookRepository } from "./telegram-webhook.repository.js";
import { PostmarkWebhookRepository } from "./postmark-webhook.repository.js";

/**
 * Consome a fila `webhooks` (ADR-0009) dentro do próprio processo da API —
 * o volume de hoje não justifica um processo/deploy à parte (apps/worker é
 * só para automação, que já é assim por decisão própria). Cada job resolve
 * a conexão DE NOVO (nunca guarda segredo no payload do job) e chama o
 * mesmíssimo `receive()` que o HTTP síncrono chamava antes — nenhuma lógica
 * duplicada, só o ponto de entrada mudou.
 */
export function startWebhookWorker(app: INestApplicationContext): Worker<WebhookJobData> {
  const repositories = {
    whatsapp: app.get(WhatsAppWebhookRepository),
    instagram: app.get(InstagramWebhookRepository),
    messenger: app.get(MessengerWebhookRepository),
    telegram: app.get(TelegramWebhookRepository),
    postmark: app.get(PostmarkWebhookRepository),
  };

  return new Worker<WebhookJobData>(WEBHOOK_QUEUE, async (job: Job<WebhookJobData>) => {
    const { provider, connectionId, payload } = job.data;
    const id = connectionId as IntegrationConnectionId;
    if (provider === "whatsapp") { const c = await repositories.whatsapp.connection(id); await repositories.whatsapp.receive(c.orgId, id, payload, c.phoneNumberId, c.accessToken); return; }
    if (provider === "instagram") { const c = await repositories.instagram.connection(id); await repositories.instagram.receive(c.orgId, id, payload, c.accountId); return; }
    if (provider === "messenger") { const c = await repositories.messenger.connection(id); await repositories.messenger.receive(c.orgId, id, payload, c.pageId); return; }
    if (provider === "telegram") { const c = await repositories.telegram.connection(id); await repositories.telegram.receive(c.orgId, id, payload, c.botToken); return; }
    const c = await repositories.postmark.connection(id);
    await repositories.postmark.receive(c.orgId, id, payload);
  }, { connection: redisConnection(process.env.REDIS_URL ?? "redis://127.0.0.1:6379"), concurrency: Number(process.env.WEBHOOK_CONCURRENCY ?? 10) });
}

function redisConnection(value: string): ConnectionOptions {
  const url = new URL(value);
  return { host: url.hostname, port: Number(url.port || 6379), ...(url.username ? { username: decodeURIComponent(url.username) } : {}), ...(url.password ? { password: decodeURIComponent(url.password) } : {}), ...(url.protocol === "rediss:" ? { tls: {} } : {}) };
}
