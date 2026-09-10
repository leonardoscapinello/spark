/**
 * OpenTelemetry desde o primeiro endpoint (docs/adr/0013, fase-0.md Bloco 5).
 * Precisa ser importado e iniciado ANTES de qualquer outro módulo — em
 * especial antes do NestFactory.create — senão a auto-instrumentação não
 * tem chance de interceptar os módulos (http, pg, etc.) na hora do require.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// exactOptionalPropertyTypes não aceita `traceExporter: undefined` explícito
// — a propriedade precisa estar OMITIDA, não presente com valor undefined.
// Por isso o spread condicional em vez de um ternário direto no objeto.
export const sdk = new NodeSDK({
  serviceName: "spark-api",
  ...(endpoint ? { traceExporter: new OTLPTraceExporter({ url: endpoint }) } : {}),
  instrumentations: [
    getNodeAutoInstrumentations({
      // logs de request/response completos custam LGPD — nunca instrumentar
      // corpo de mensagem (docs/adr/0013).
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

export function startTelemetry(): void {
  sdk.start();
}

export function stopTelemetry(): Promise<void> {
  return sdk.shutdown();
}
