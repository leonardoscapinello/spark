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

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.addEventListener("activate", () => {
  void self.clients.claim();
});
