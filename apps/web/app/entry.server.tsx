import { PassThrough } from "node:stream";
import type { EntryContext } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { renderToPipeableStream } from "react-dom/server";

export const streamTimeout = 5_000;

/**
 * Sempre onShellReady, nunca espera onAllReady (que existiria só pra
 * servir HTML completo a crawler). Spark é ferramenta interna atrás de
 * login — não há bot pra otimizar, e esperar o corpo inteiro só atrasa o
 * primeiro byte à toa (contradiz a própria razão do SSR, docs/adr/0015).
 */
export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let shellRendered = false;

    const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
      onShellReady() {
        shellRendered = true;
        const body = new PassThrough();
        responseHeaders.set("Content-Type", "text/html");
        resolve(
          new Response(createReadableStreamFromReadable(body), {
            headers: responseHeaders,
            status: responseStatusCode,
          }),
        );
        pipe(body);
      },
      onShellError(error: unknown) {
        reject(error as Error);
      },
      onError(error: unknown) {
        responseStatusCode = 500;
        if (shellRendered) {
          console.error(error);
        }
      },
    });

    setTimeout(abort, streamTimeout + 1000);
  });
}
