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
 * real. Limite conhecido: a repetição leva o Authorization guardado na
 * hora do enfileiramento; se o token expirar antes de voltar a rede, a
 * API responde 401 e a entrada é descartada — a página segue com o dado
 * local e o usuário refaz. Retenção: 24 h.
 */
const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").origin;
const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const sendQueue = new Queue("spark-send-queue", { maxRetentionTime: 24 * 60 });

registerRoute(
  ({ request, url }) => url.origin === API_ORIGIN && url.pathname.startsWith("/v1/") && !url.pathname.startsWith("/v1/shapes") && WRITE_METHODS.has(request.method),
  async ({ request }) => {
    try {
      return await fetch(request.clone());
    } catch {
      await sendQueue.pushRequest({ request });
      return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { "content-type": "application/json" } });
    }
  },
);
