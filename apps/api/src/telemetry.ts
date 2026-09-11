/**
 * OpenTelemetry from the very first endpoint on (docs/adr/0013,
 * fase-0.md Bloco 5). Must be imported and started BEFORE any other
 * module — in particular before NestFactory.create — or auto-
 * instrumentation never gets a chance to intercept the modules (http,
 * pg, etc.) at require time.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// exactOptionalPropertyTypes doesn't accept an explicit
// `traceExporter: undefined` — the property needs to be OMITTED, not
// present with value undefined. Hence the conditional spread instead of a
// direct ternary in the object.
export const sdk = new NodeSDK({
  serviceName: "spark-api",
  ...(endpoint ? { traceExporter: new OTLPTraceExporter({ url: endpoint }) } : {}),
  instrumentations: [
    getNodeAutoInstrumentations({
      // full request/response logs cost LGPD compliance — never
      // instrument message bodies (docs/adr/0013).
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
