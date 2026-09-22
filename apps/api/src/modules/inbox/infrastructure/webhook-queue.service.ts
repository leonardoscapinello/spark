import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Queue, type ConnectionOptions } from "bullmq";

export const WEBHOOK_QUEUE = "webhooks";
export type WebhookProvider = "whatsapp" | "instagram" | "messenger" | "telegram" | "postmark";
export interface WebhookJobData { provider: WebhookProvider; connectionId: string; payload: unknown; }

/**
 * Fila `webhooks` do ADR-0009 ("trabalho de segundos, não de dias").
 * Nunca guarda segredo no payload do job — só o id da conexão; quem
 * consome resolve o token de novo, na hora de processar.
 */
@Injectable()
export class WebhookQueue implements OnModuleDestroy {
  private readonly queue = new Queue<WebhookJobData>(WEBHOOK_QUEUE, { connection: redisConnection(process.env.REDIS_URL ?? "redis://127.0.0.1:6379") });

  async enqueue(data: WebhookJobData): Promise<void> {
    await this.queue.add("ingest", data, { attempts: 5, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: 1_000, removeOnFail: 1_000 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}

function redisConnection(value: string): ConnectionOptions {
  const url = new URL(value);
  return { host: url.hostname, port: Number(url.port || 6379), ...(url.username ? { username: decodeURIComponent(url.username) } : {}), ...(url.password ? { password: decodeURIComponent(url.password) } : {}), ...(url.protocol === "rediss:" ? { tls: {} } : {}) };
}
