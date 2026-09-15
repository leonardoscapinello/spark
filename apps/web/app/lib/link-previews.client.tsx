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
  request: (url: string) => void;
}
const LinkPreviewContext = createContext<LinkPreviewContextValue | null>(null);

export function LinkPreviewDataProvider({ children }: { children: ReactNode }) {
  const { data = [] } = useLiveQuery({ query: (q) => q.from({ previews: getCollection() }) });
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const previews = useMemo(() => new Map(data.map((preview) => [preview.url, preview])), [data]);
  const request = useCallback((rawUrl: string) => {
    let url: string;
    try { url = normalizeLinkPreviewUrl(rawUrl); } catch { return; }
    const current = previews.get(url);
    if (current && !linkPreviewNeedsRefresh(current) || inflight.has(url)) return;
    setPending((items) => {
      if (items.has(url)) return items;
      const next = new Set(items); next.add(url); return next;
    });
    const operation = linkPreviewsControllerResolve({ url }).finally(() => {
      inflight.delete(url);
      setPending((items) => { const next = new Set(items); next.delete(url); return next; });
    });
    inflight.set(url, operation);
  }, [previews]);
  return <LinkPreviewContext.Provider value={{ previews, pending, request }}>{children}</LinkPreviewContext.Provider>;
}

export function useLinkPreview(rawUrl: string | null | undefined) {
  const context = useContext(LinkPreviewContext);
  if (!context) throw new Error("useLinkPreview must be used inside LinkPreviewDataProvider.");
  let url: string | null = null;
  try { if (rawUrl) url = normalizeLinkPreviewUrl(rawUrl); } catch { url = null; }
  return { preview: url ? context.previews.get(url) ?? null : null, loading: url ? context.pending.has(url) : false, request: () => { if (url) context.request(url); } };
}

export function ExternalPreviewLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const state = useLinkPreview(href);
  return <PreviewLink href={href} preview={state.preview} loading={state.loading} onRequest={state.request} {...(className === undefined ? {} : { className })}>{children}</PreviewLink>;
}

export function LinkPreviewForUrl({ url }: { url: string }) {
  const state = useLinkPreview(url);
  return <LinkPreviewCard preview={state.preview} loading={state.loading} />;
}

export function PreviewedCustomFieldValue(props: ComponentProps<typeof CustomFieldValue>) {
  const url = props.field.type === "url" && typeof props.value === "string" ? props.value : null;
  const state = useLinkPreview(url);
  return <CustomFieldValue {...props} {...(url ? { preview: <LinkPreviewCard preview={state.preview} loading={state.loading} />, onPreviewRequest: state.request } : {})} />;
}

export function LinkifiedText({ text }: { text: string }) {
  return <>{text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => /^https?:\/\//i.test(part) ? <ExternalPreviewLink key={`${part}:${index}`} href={part}>{part}</ExternalPreviewLink> : part)}</>;
}
