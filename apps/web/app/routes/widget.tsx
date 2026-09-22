import { useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { publicWidgetControllerConfig, publicWidgetControllerPoll, publicWidgetControllerSend, publicWidgetControllerStart } from "@spark/api-client";
import { messageId, type WidgetConfig } from "@spark/core";
import type { WidgetConversationStateDtoMessagesItem } from "@spark/api-client";
import { Button, Icon, Input } from "@spark/ui-web";
import styles from "./widget.module.css";

const BUBBLE_SIZE = 64;
const PANEL_WIDTH = 376;
const PANEL_HEIGHT = 600;
const POLL_INTERVAL_MS = 3_000;

export async function clientLoader({ params }: { params: { publicKey?: string } }) {
  if (!params.publicKey) throw new Error("Widget inválido.");
  return publicWidgetControllerConfig(params.publicKey);
}

export function HydrateFallback() { return null; }

export default function Widget() {
  const config = useLoaderData<typeof clientLoader>();
  const [open, setOpen] = useState(false);

  // A página inteira é o conteúdo do <iframe> que o loader.js injeta no site do cliente — o fundo da página do cliente tem que aparecer ao redor da bolha/painel.
  useEffect(() => { document.documentElement.style.background = "transparent"; document.body.style.background = "transparent"; }, []);
  useEffect(() => { postToParent({ type: "position", position: config.position }); }, [config.position]);
  useEffect(() => {
    postToParent(open
      ? { type: "size", open: true, width: PANEL_WIDTH, height: PANEL_HEIGHT }
      : { type: "size", open: false, width: BUBBLE_SIZE, height: BUBBLE_SIZE });
  }, [open]);

  return <div className={styles.root} data-open={open || undefined} style={{ "--widget-brand": config.color } as React.CSSProperties}>
    {open
      ? <Panel config={config} onClose={() => setOpen(false)} />
      : <Launcher onOpen={() => setOpen(true)} />}
  </div>;
}

function Launcher({ onOpen }: { onOpen: () => void }) {
  return <Button type="button" iconOnly shape="rounded" className={styles.launcher} aria-label="Abrir chat" onClick={onOpen}><Icon name="message" /></Button>;
}

function Panel({ config, onClose }: { config: WidgetConfig; onClose: () => void }) {
  const visitorId = useMemo(() => getVisitorId(config.publicKey), [config.publicKey]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WidgetConversationStateDtoMessagesItem[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const stored = readConversation(config.publicKey);
    if (!stored) return;
    publicWidgetControllerPoll(config.publicKey, { visitorId }).then((state) => {
      if (cancelled) return;
      setConversationId(state.conversationId);
      setMessages(state.messages);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [config.publicKey, visitorId]);

  useEffect(() => {
    if (!conversationId) return;
    const timer = window.setInterval(() => {
      publicWidgetControllerPoll(config.publicKey, { visitorId }).then((state) => setMessages(state.messages)).catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [conversationId, config.publicKey, visitorId]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages.length]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const state = conversationId
        ? await publicWidgetControllerSend(config.publicKey, { visitorId, id: messageId.create(), body })
        : await publicWidgetControllerStart(config.publicKey, { visitorId, message: { id: messageId.create(), body } });
      setConversationId(state.conversationId);
      setMessages(state.messages);
      writeConversation(config.publicKey);
    } finally { setSending(false); }
  }

  return <div className={styles.panel}>
    <header className={styles.header}>
      <div><strong>{config.name}</strong><span>Normalmente respondemos em poucos minutos.</span></div>
      <Button type="button" iconOnly size="sm" variant="ghost" className={styles.close} aria-label="Fechar chat" onClick={onClose}><Icon name="close" /></Button>
    </header>
    <div className={styles.messages} ref={listRef}>
      <article className={styles.bubble} data-from="team"><p>{config.welcomeMessage}</p></article>
      {messages.map((message) => <article key={message.id} className={styles.bubble} data-from={message.direction === "inbound" ? "visitor" : "team"}><p>{message.body}</p></article>)}
    </div>
    <form className={styles.composer} onSubmit={submit}>
      <Input className={styles.composerInput} aria-label="Escrever mensagem" placeholder="Escreva uma mensagem…" value={text} onChange={(event) => setText(event.target.value)} disabled={sending} />
      <Button type="submit" iconOnly shape="rounded" className={styles.send} aria-label="Enviar" disabled={sending || !text.trim()}><Icon name="right" /></Button>
    </form>
  </div>;
}

function postToParent(message: Record<string, unknown>): void {
  window.parent.postMessage({ source: "spark-widget", ...message }, "*");
}
function visitorKey(publicKey: string): string { return `spark_widget_visitor_${publicKey}`; }
function conversationKey(publicKey: string): string { return `spark_widget_conversation_${publicKey}`; }
function getVisitorId(publicKey: string): string {
  try {
    const key = visitorKey(publicKey);
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch { return crypto.randomUUID(); }
}
function readConversation(publicKey: string): boolean {
  try { return localStorage.getItem(conversationKey(publicKey)) === "1"; } catch { return false; }
}
function writeConversation(publicKey: string): void {
  try { localStorage.setItem(conversationKey(publicKey), "1"); } catch { /* modo privado — degrada pra sem memória entre visitas */ }
}
