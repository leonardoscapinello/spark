import { useEffect, useState } from "react";
import { freshToken } from "./auth.client";

/**
 * Estado da fila de envio do service worker (app/sw.ts) mais o sinal do
 * navegador. O SW manda {type:"spark:send-queue", size} sempre que
 * enfileira, repete ou ativa; a página pergunta uma vez ao montar. No
 * servidor não há nada disso — o estado inicial (online, fila vazia) não
 * renderiza aviso nenhum, então SSR e hidratação batem.
 */
export interface SendQueueState { pending: number; online: boolean }

export function useSendQueue(): SendQueueState {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const worker = "serviceWorker" in navigator ? navigator.serviceWorker : undefined;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; size?: number } | null;
      if (data?.type === "spark:send-queue" && typeof data.size === "number") setPending(data.size);
      // o SW vai repetir a fila e quer um token que ainda valha (app/sw.ts, replaySendQueue)
      const port = event.ports[0];
      if (data?.type === "spark:send-queue:token?" && port) void freshToken().then((token) => port.postMessage({ token }), () => port.postMessage({ token: null }));
    };
    worker?.addEventListener("message", onMessage);
    worker?.controller?.postMessage({ type: "spark:send-queue:query" });
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      worker?.removeEventListener("message", onMessage);
    };
  }, []);
  return { pending, online };
}

export interface SendQueueNotice { title: string; description: string }

/** Texto do aviso — honesto sobre o que está guardado e o que vai acontecer (docs/adr/0017). */
export function sendQueueNotice({ pending, online }: SendQueueState): SendQueueNotice | null {
  const count = pending === 1 ? "1 envio guardado" : `${pending} envios guardados`;
  if (!online && pending > 0) return { title: "Sem conexão", description: `${count} — saem sozinhos quando o sinal voltar.` };
  if (!online) return { title: "Sem conexão", description: "O que você fizer fica guardado e sai quando o sinal voltar." };
  if (pending > 0) return { title: "Enviando o que ficou pendente", description: `${count} na fila.` };
  return null;
}
