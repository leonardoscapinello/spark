import "reflect-metadata";
import { startTelemetry } from "./telemetry.js"; // first import of all — see telemetry.ts
startTelemetry();

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { ZodValidationPipe } from "nestjs-zod";
import { AppModule } from "./app.module.js";
import { startWebhookWorker } from "./modules/inbox/infrastructure/webhook-worker.js";

export async function bootstrap(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
    rawBody: true,
  });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ZodValidationPipe());
  app.setGlobalPrefix("", { exclude: [] });

  // apps/web (and desktop/mobile embedding a webview) talk to the API
  // from a different origin — without this the OPTIONS preflight never
  // even reaches the routes (a plain 404, Fastify doesn't handle OPTIONS
  // on its own). x-electric-txid: none of our custom headers need
  // exposing today, but Authorization is what sparkHttpClient sends
  // (packages/api-client/src/http-client.ts).
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3100",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  return app;
}

// only starts the HTTP server when run directly — the OpenAPI generation
// script (scripts/emit-openapi.mts) imports `bootstrap` without calling listen.
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await bootstrap();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  app.get(Logger).log(`apps/api listening on :${port}`);
  startWebhookWorker(app);
  app.get(Logger).log("webhook worker started");
}
