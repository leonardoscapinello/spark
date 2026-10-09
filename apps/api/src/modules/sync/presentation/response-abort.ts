import type { ServerResponse } from "node:http";

/** A requisição GET termina antes do SSE; só o fechamento da resposta encerra o upstream. */
export function responseAbortSignal(response: ServerResponse): AbortSignal {
  const controller = new AbortController();
  if (response.destroyed) controller.abort();
  else response.once("close", () => controller.abort());
  return controller.signal;
}
