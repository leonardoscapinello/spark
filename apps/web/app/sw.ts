/// <reference lib="webworker" />
/**
 * Service Worker mínimo — cache do shell estático (JS/CSS/fonte), não dos
 * dados. Dado local-first já é responsabilidade do Electric/TanStack DB via
 * IndexedDB (docs/adr/0018); duplicar isso aqui via Cache API seria dois
 * caminhos de offline discordando um do outro.
 *
 * `injectManifest`, não `generateSW`: o padrão automático do plugin registra
 * uma NavigationRoute presa a `index.html`, que não existe do jeito que o
 * generateSW espera em SSR de verdade (React Router 8 gera HTML por request
 * via app/entry.server.tsx, não um index.html estático processado no
 * build) — bug real e ainda aberto do vite-plugin-pwa com framework mode
 * (github.com/vite-pwa/vite-plugin-pwa#809). Escrever o SW à mão e nunca
 * referenciar index.html evita o bug inteiro: só precache de asset com hash
 * (sempre presente no manifest), sem fallback de navegação nenhum.
 */
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { Queue } from "workbox-background-sync";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.addEventListener("activate", () => {
  void self.clients.claim();
  // recarregou a página com fila de ontem: o aviso volta sem depender de um envio novo.
  void broadcastQueueSize();
});

/**
 * Fila de envio (docs/adr/0017): escrita feita sem sinal não vira erro.
 *
 * Só escrita para a API (POST/PATCH/PUT/DELETE em /v1/, nunca o proxy de
 * shapes, que é leitura do Electric). Quando o fetch falha por rede — e só
 * por rede: resposta HTTP de erro passa direto, é a API dizendo "não" — a
 * requisição vai para a fila e a página recebe 202 {queued:true}. As
 * coleções (packages/data confirmed()) leem isso como "sem txid ainda" e
 * mantêm o estado otimista; o Workbox repete a fila no evento `sync` (ou
 * ao religar o SW onde não há Background Sync) e o Electric traz a linha
 * real, com um Authorization renovado pela página (replaySendQueue).
 * Retenção: 24 h.
 */
const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").origin;
const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const sendQueue = new Queue("spark-send-queue", {
  maxRetentionTime: 24 * 60,
  // Repete e, saia como sair, conta para a página o que ficou — é o que
  // alimenta o aviso "N envios aguardam sinal" (app/lib/send-queue.client.ts).
  onSync: async ({ queue }) => {
    try { await replaySendQueue(queue); }
    finally { await broadcastQueueSize(); }
  },
});

/**
 * Repete a fila entrada por entrada com um Authorization que ainda valha:
 * o token gravado na hora do enfileiramento pode ter vencido enquanto a
 * rede estava fora. A página responde com um token renovado
 * (app/lib/send-queue.client.ts → auth.client freshToken); sem janela
 * aberta, ou sem resposta em 3 s, vai o token guardado mesmo. Falha de
 * rede devolve a entrada à frente da fila e lança — é assim que o Workbox
 * sabe que deve agendar outro `sync`. Resposta HTTP, qualquer uma, tira
 * a entrada da fila: a API falou, e repetir um 4xx só repetiria o erro.
 */
async function replaySendQueue(queue: Queue): Promise<void> {
  const token = await freshTokenFromPage();
  let entry = await queue.shiftRequest();
  while (entry) {
    const request = token ? withAuthorization(entry.request, token) : entry.request.clone();
    try {
      await fetch(request);
    } catch (error) {
      await queue.unshiftRequest(entry);
      throw new Error("Fila de envio: ainda sem rede, tentando de novo depois.", { cause: error });
    }
    entry = await queue.shiftRequest();
  }
}

function withAuthorization(request: Request, token: string): Request {
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(request, { headers });
}

async function freshTokenFromPage(): Promise<string | null> {
  const [client] = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (!client) return null;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 3000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      const data = event.data as { token?: string | null } | null;
      resolve(typeof data?.token === "string" ? data.token : null);
    };
    client.postMessage({ type: "spark:send-queue:token?" }, [channel.port2]);
  });
}

async function broadcastQueueSize(): Promise<void> {
  const size = await sendQueue.size();
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) client.postMessage({ type: "spark:send-queue", size });
}

self.addEventListener("message", (event) => {
  const data = event.data as { type?: string } | null;
  if (data?.type === "spark:send-queue:query") void broadcastQueueSize();
});

registerRoute(
  ({ request, url }) => url.origin === API_ORIGIN && url.pathname.startsWith("/v1/") && !url.pathname.startsWith("/v1/shapes") && WRITE_METHODS.has(request.method),
  async ({ request }) => {
    try {
      return await fetch(request.clone());
    } catch {
      await sendQueue.pushRequest({ request });
      await broadcastQueueSize();
      return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { "content-type": "application/json" } });
    }
  },
);
