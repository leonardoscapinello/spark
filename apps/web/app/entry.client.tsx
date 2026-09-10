import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
// efeito colateral — configura o provider de token do api-client antes de
// qualquer loader de rota rodar (ver app/lib/auth.client.ts).
import "./lib/auth.client";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});

// registro manual — injectRegister: false em vite.config.ts (o registro
// automático do plugin depende de transformIndexHtml, que não roda em SSR
// de framework mode de verdade). Fora do dev: vite-plugin-pwa só ativa o
// SW em build de produção por padrão, isto é seguro chamar sempre.
if ("serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
}
