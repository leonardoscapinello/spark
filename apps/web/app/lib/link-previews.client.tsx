import { createContext, useCallback, useContext, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { linkPreviewsControllerResolve } from "@spark/api-client";
import { createLinkPreviewsCollection, type LinkPreviewsCollection } from "@spark/data";
import { linkPreviewNeedsRefresh, normalizeLinkPreviewUrl, type LinkPreview } from "@spark/core";
import { CustomFieldValue, LinkPreviewCard, PreviewLink } from "@spark/ui-web";

let collection: LinkPreviewsCollection | undefined;
function getCollection() { collection ??= createLinkPreviewsCollection(); return collection; }
const inflight = new Map<string, Promise<unknown>>();

interface LinkPreviewContextValue {
  previews: ReadonlyMap<string, LinkPreview>;
  pending: ReadonlySet<string>;
  failures: ReadonlySet<string>;
  request: (url: string) => void;
}
const LinkPreviewContext = createContext<LinkPreviewContextValue | null>(null);

export function LinkPreviewDataProvider({ children }: { children: ReactNode }) {
  const { data = [] } = useLiveQuery({ query: (q) => q.from({ previews: getCollection() }) });
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [resolved, setResolved] = useState<ReadonlyMap<string, LinkPreview>>(() => new Map());
  const [failures, setFailures] = useState<ReadonlySet<string>>(() => new Set());
  // A resposta da API entra na tela imediatamente; o Electric consolida a
  // mesma linha depois. Esperar esse eco era o que prendia o tooltip no loader.
  const previews = useMemo(() => {
    const merged = new Map<string, LinkPreview>(data.map((preview) => [preview.url, preview] as const));
    for (const [url, immediate] of resolved) {
      const synced = merged.get(url);
      // A resposta HTTP deixa o primeiro hover instantâneo; assim que uma
      // versão mais nova chega pelo Electric, ela assume. Manter para sempre a
      // resposta antiga aqui fazia toda abertura considerar o cache vencido.
      if (!synced || new Date(immediate.updatedAt).getTime() >= new Date(synced.updatedAt).getTime()) merged.set(url, immediate);
    }
    return merged;
  }, [data, resolved]);
  const request = useCallback((rawUrl: string) => {
    let url: string;
    try { url = normalizeLinkPreviewUrl(rawUrl); } catch { return; }
    const current = previews.get(url);
    if (current && !linkPreviewNeedsRefresh(current) || inflight.has(url)) return;
    setFailures((items) => { const next = new Set(items); next.delete(url); return next; });
    setPending((items) => {
      if (items.has(url)) return items;
      const next = new Set(items); next.add(url); return next;
    });
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 5_000);
    const operation = linkPreviewsControllerResolve({ url }, abort.signal).then(({ preview }) => {
      setResolved((items) => { const next = new Map(items); next.set(url, preview as LinkPreview); return next; });
    }).catch(() => {
      setFailures((items) => { const next = new Set(items); next.add(url); return next; });
    }).finally(() => {
      window.clearTimeout(timeout);
      inflight.delete(url);
      setPending((items) => { const next = new Set(items); next.delete(url); return next; });
    });
    inflight.set(url, operation);
  }, [previews]);
  return <LinkPreviewContext.Provider value={{ previews, pending, failures, request }}>{children}</LinkPreviewContext.Provider>;
}

export function useLinkPreview(rawUrl: string | null | undefined) {
  const context = useContext(LinkPreviewContext);
  if (!context) throw new Error("useLinkPreview must be used inside LinkPreviewDataProvider.");
  let url: string | null = null;
  try { if (rawUrl) url = normalizeLinkPreviewUrl(rawUrl); } catch { url = null; }
  const preview = url ? context.previews.get(url) ?? (context.failures.has(url) ? failedPreview(url) : null) : null;
  return { preview, loading: url ? context.pending.has(url) : false, request: () => { if (url) context.request(url); } };
}

export function useLinkPreviewRequest(): (url: string) => void {
  const context = useContext(LinkPreviewContext);
  if (!context) throw new Error("useLinkPreviewRequest must be used inside LinkPreviewDataProvider.");
  return context.request;
}

function failedPreview(url: string): LinkPreview {
  const now = new Date().toISOString();
  return { id: "00000000-0000-7000-8000-000000000000", orgId: "00000000-0000-7000-8000-000000000000", url, urlHash: "0".repeat(64), canonicalUrl: null, title: null, description: null, imageUrl: null, siteName: null, faviconUrl: null, status: "failed", httpStatus: null, fetchedAt: now, expiresAt: now, failureCount: 1, etag: null, lastModified: null, createdAt: now, updatedAt: now } as LinkPreview;
}

export function ExternalPreviewLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const state = useLinkPreview(href);
  return <PreviewLink href={href} preview={state.preview} loading={state.loading} onRequest={state.request} {...(className === undefined ? {} : { className })}>{children}</PreviewLink>;
}

export function LinkPreviewForUrl({ url }: { url: string }) {
  const state = useLinkPreview(url);
  return <LinkPreviewCard url={url} preview={state.preview} loading={state.loading} />;
}

export function PreviewedCustomFieldValue(props: ComponentProps<typeof CustomFieldValue>) {
  const url = props.field.type === "url" && typeof props.value === "string" ? props.value : null;
  const state = useLinkPreview(url);
  const request = useLinkPreviewRequest();
  const save = async (value: unknown) => {
    await props.onSave(value);
    // O enriquecimento começa no ato de gravar o endereço. Quando a pessoa
    // passar o mouse, o trabalho caro normalmente já terminou e veio do cache.
    if (props.field.type === "url" && typeof value === "string") request(value);
  };
  return <CustomFieldValue {...props} onSave={save} {...(url ? { preview: <LinkPreviewCard url={url} preview={state.preview} loading={state.loading} />, onPreviewRequest: state.request } : {})} />;
}

export function LinkifiedText({ text }: { text: string }) {
  return <>{text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => /^https?:\/\//i.test(part) ? <ExternalPreviewLink key={`${part}:${index}`} href={part}>{part}</ExternalPreviewLink> : part)}</>;
}
