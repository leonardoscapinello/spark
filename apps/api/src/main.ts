import "reflect-metadata";
import { startTelemetry } from "./telemetry.js"; // primeiro import de todos — ver telemetry.ts
startTelemetry();

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { ZodValidationPipe } from "nestjs-zod";
import { AppModule } from "./app.module.js";

export async function bootstrap(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ZodValidationPipe());
  app.setGlobalPrefix("", { exclude: [] });

  return app;
}

// só sobe o servidor HTTP quando executado diretamente — o script de geração
// de OpenAPI (scripts/emit-openapi.mts) importa `bootstrap` sem chamar listen.
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await bootstrap();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  app.get(Logger).log(`apps/api ouvindo em :${port}`);
}
