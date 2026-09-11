import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    reactRouter(),
    VitePWA({
      // injectManifest, não generateSW — ver o comentário no topo de
      // app/sw.ts pra o motivo (bug real do plugin com SSR/framework mode).
      strategies: "injectManifest",
      srcDir: "app",
      filename: "sw.ts",
      // default do plugin é "dist" — a saída real do client do React
      // Router 8 é build/client (mesmo motivo do globDirectory abaixo).
      // Sem isto o sw.js compilado vai pra apps/web/dist/, não servível.
      outDir: "build/client",
      injectRegister: false, // registro manual em app/entry.client.tsx — auto/inline dependem de transformIndexHtml, que não roda em SSR de verdade
      injectManifest: {
        // build/client é a saída real do client do React Router 8 — o
        // default do plugin (a raiz do projeto) não bate com isso e
        // gerava um precache vazio (0 entradas).
        globDirectory: "build/client",
        // só asset com hash no nome — nunca HTML (não existe um index.html
        // estático aqui pra precachear; ver docs/adr/0018).
        globPatterns: ["**/*.{js,css,woff2}"],
      },
      manifest: {
        name: "Leonardo Scapinello",
        short_name: "Leonardo",
        description: "Central de relacionamento Leonardo Scapinello.",
        theme_color: "#2f6f7e",
        background_color: "#e7edea",
        display: "standalone",
        start_url: "/",
      },
    }),
  ],
  // API real fica em outra porta (apps/api) — dev local não precisa de
  // proxy porque o cliente já leva base URL configurável
  // (packages/api-client/src/http-client.ts), setada em app/root.tsx.
  server: {
    port: 3100,
  },
});
