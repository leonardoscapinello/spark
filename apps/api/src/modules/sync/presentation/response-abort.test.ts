import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it } from "vitest";
import { responseAbortSignal } from "./response-abort.js";

it("mantém o upstream após o GET e cancela quando o leitor fecha o stream", async () => {
  let signal: AbortSignal | undefined;
  let requestFinished: Promise<unknown> = Promise.resolve();
  let closed: Promise<unknown> = Promise.resolve();
  const server = createServer((request, response) => {
    signal = responseAbortSignal(response);
    closed = once(response, "close");
    requestFinished = once(request, "close");
    request.resume();
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write("data: ready\n\n");
  });
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing local port");
    const response = await fetch(`http://127.0.0.1:${address.port}`);
    const reader = response.body?.getReader();
    await reader?.read();
    await requestFinished;
    expect(signal?.aborted).toBe(false);
    await reader?.cancel();
    await closed;
    expect(signal?.aborted).toBe(true);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
