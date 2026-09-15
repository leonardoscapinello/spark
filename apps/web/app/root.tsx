import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/root";
import { Toaster, TooltipProvider } from "@spark/ui-web";
import "@spark/tokens/css";
import "./app.css";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Leonardo Scapinello</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  /* Uma dica só por vez em toda a aplicação: o provedor coordena o atraso de
   * abertura entre elas, senão cada campo abriria a sua com o tempo cheio e a
   * coluna piscaria a cada passada de mouse. */
  /* O `Toaster` mora aqui, uma vez só: é ele que desenha o que `notify()`
   * manda. Sem ele montado, as 115 chamadas espalhadas pelas telas não
   * apareciam em lugar nenhum — um CPF recusado, uma escrita que falhou e uma
   * importação concluída eram todos o mesmo silêncio. */
  return <TooltipProvider><Outlet /><Toaster /></TooltipProvider>;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const mensagem = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Erro inesperado.";

  return (
    <main style={{ padding: "var(--space-8)", fontFamily: "var(--typography-fontFamily-body)" }}>
      <h1>Algo deu errado</h1>
      <p>{mensagem}</p>
    </main>
  );
}
