import { Injectable } from "@nestjs/common";
import { fetch, type RequestInit, type Response } from "undici";
import { publicAddressAgent } from "./public-address.js";
import { normalizeLinkPreviewUrl } from "@spark/core";

const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

export interface LinkMetadata {
  finalUrl: string;
  canonicalUrl: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  faviconUrl: string | null;
  httpStatus: number;
  etag: string | null;
  lastModified: string | null;
  maxAgeSeconds: number | null;
}

@Injectable()
export class LinkMetadataFetcher {
  async fetch(url: string, validators?: { etag: string | null; lastModified: string | null }): Promise<LinkMetadata | { notModified: true; maxAgeSeconds: number | null }> {
    let current = url;
    // Um prazo cobre DNS, redirecionamentos, cabeçalhos e corpo inteiro.
    // Reiniciar cinco segundos a cada redirect permitia uma espera longa.
    const signal = AbortSignal.timeout(3_500);
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const dispatcher = await publicAddressAgent(current, signal);
      try {
      const options: RequestInit = {
        dispatcher,
        redirect: "manual",
        signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "SparkLinkPreview/1.0",
          ...(validators?.etag ? { "if-none-match": validators.etag } : {}),
          ...(validators?.lastModified ? { "if-modified-since": validators.lastModified } : {}),
        },
      };
      const response = await fetch(current, options);
      const maxAgeSeconds = cacheMaxAge(response.headers.get("cache-control"));
      if (response.status === 304) return { notModified: true, maxAgeSeconds };
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === MAX_REDIRECTS) throw new Error("Redirecionamentos demais ao buscar o link.");
        current = normalizeLinkPreviewUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) throw Object.assign(new Error(`O endereço respondeu com ${response.status}.`), { httpStatus: response.status });
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("O endereço não contém uma página HTML.");
      const html = await limitedText(response);
      const metadata = extractMetadata(html, current);
      return {
        ...metadata,
        finalUrl: current,
        httpStatus: response.status,
        etag: clipped(response.headers.get("etag"), 500),
        lastModified: clipped(response.headers.get("last-modified"), 500),
        maxAgeSeconds,
      };
      } finally { await dispatcher.destroy(); }
    }
    throw new Error("Não foi possível buscar o link.");
  }
}

async function limitedText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_HTML_BYTES) { await reader.cancel(); break; }
    html += decoder.decode(value, { stream: true });
    // Open Graph, Twitter Cards, canonical e favicon vivem no <head>. Sites
    // podem manter o corpo aberto ou enviar megabytes depois dele; esperar esse
    // restante não melhora a prévia e era o maior custo do caminho sem cache.
    const headEnd = html.search(/<\/head\s*>/i);
    const bodyStart = html.search(/<body(?:\s|>)/i);
    const boundary = headEnd >= 0 ? headEnd + (html.slice(headEnd).match(/^<\/head\s*>/i)?.[0].length ?? 0) : bodyStart;
    if (boundary >= 0) {
      html = html.slice(0, boundary);
      await reader.cancel();
      break;
    }
  }
  return html + decoder.decode();
}

function extractMetadata(html: string, baseUrl: string): Omit<LinkMetadata, "finalUrl" | "httpStatus" | "etag" | "lastModified" | "maxAgeSeconds"> {
  const metas = [...html.matchAll(/<meta\s+[^>]*>/gi)].map((match) => attributes(match[0] ?? ""));
  // A prioridade é Open Graph → Twitter → HTML, não a posição da tag no
  // documento. Tags vazias não escondem uma alternativa preenchida depois.
  const value = (...names: string[]) => {
    for (const name of names) {
      const content = metas.find((attrs) => (attrs.property ?? attrs.name ?? "").toLowerCase() === name && attrs.content?.trim())?.content;
      if (content) return content;
    }
    return null;
  };
  const links = [...html.matchAll(/<link\s+[^>]*>/gi)].map((match) => attributes(match[0] ?? ""));
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  const title = clipped(decodeHtml(value("og:title", "twitter:title") ?? titleTag), 500);
  const description = clipped(decodeHtml(value("og:description", "twitter:description", "description")), 1000);
  const imageUrl = absoluteUrl(value("og:image", "twitter:image", "twitter:image:src"), baseUrl);
  const canonicalUrl = absoluteUrl(links.find((item) => item.rel?.toLowerCase().split(/\s+/).includes("canonical"))?.href ?? null, baseUrl);
  const icon = links.find((item) => item.rel?.toLowerCase().includes("icon"))?.href ?? "/favicon.ico";
  return { title, description, imageUrl, siteName: clipped(decodeHtml(value("og:site_name")), 200), faviconUrl: absoluteUrl(icon, baseUrl), canonicalUrl };
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    const key = match[1]?.toLowerCase();
    if (key) result[key] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "") ?? "";
  }
  return result;
}

function decodeHtml(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (entity, digits: string) => {
    const code = digits[0]?.toLowerCase() === "x" ? Number.parseInt(digits.slice(1), 16) : Number(digits);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
  }).replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim() || null;
}

function absoluteUrl(value: string | null, base: string): string | null {
  if (!value) return null;
  try { return normalizeLinkPreviewUrl(new URL(value, base).toString()); } catch { return null; }
}

function clipped(value: string | null, length: number): string | null { return value ? value.slice(0, length) : null; }
function cacheMaxAge(value: string | null): number | null {
  const seconds = Number(value?.match(/(?:^|,)\s*(?:s-maxage|max-age)=(\d+)/i)?.[1]);
  return Number.isFinite(seconds) ? seconds : null;
}
