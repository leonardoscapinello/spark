import { BadRequestException, Injectable } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
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
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      await assertPublicUrl(current);
      const response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(5_000),
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "SparkLinkPreview/1.0",
          ...(validators?.etag ? { "if-none-match": validators.etag } : {}),
          ...(validators?.lastModified ? { "if-modified-since": validators.lastModified } : {}),
        },
      });
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
    }
    throw new Error("Não foi possível buscar o link.");
  }
}

async function assertPublicUrl(raw: string): Promise<void> {
  const parsed = new URL(normalizeLinkPreviewUrl(raw));
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) throw new BadRequestException("Esse endereço não pode ser consultado.");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) throw new BadRequestException("Esse endereço não pode ser consultado.");
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mapped ?? (isIP(normalized) === 4 ? normalized : null);
  if (!ipv4) return false;
  const [a = 0, b = 0] = ipv4.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
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
  }
  return html + decoder.decode();
}

function extractMetadata(html: string, baseUrl: string): Omit<LinkMetadata, "finalUrl" | "httpStatus" | "etag" | "lastModified" | "maxAgeSeconds"> {
  const metas = [...html.matchAll(/<meta\s+[^>]*>/gi)].map((match) => attributes(match[0] ?? ""));
  const value = (...names: string[]) => metas.find((attrs) => names.includes((attrs.property ?? attrs.name ?? "").toLowerCase()))?.content ?? null;
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
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim() || null;
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
