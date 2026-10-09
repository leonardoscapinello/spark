import { BadRequestException } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent } from "undici";
import { normalizeLinkPreviewUrl } from "@spark/core";

export function isPublicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === "unicast"; }
  catch { return false; }
}

/** Resolve uma vez e usa o IP validado na conexão, preservando hostname e TLS. */
export async function publicAddressAgent(raw: string, signal: AbortSignal): Promise<Agent> {
  const hostname = new URL(normalizeLinkPreviewUrl(raw)).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) throw new BadRequestException("Esse endereço não pode ser consultado.");
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolveBeforeDeadline(hostname, signal);
  const address = addresses[0];
  if (!address || addresses.some(item => !isPublicAddress(item.address))) throw new BadRequestException("Esse endereço não pode ser consultado.");
  signal.throwIfAborted();
  return new Agent({ connect: { lookup: (_hostname, options, callback) => {
    if (options.all) callback(null, [address]);
    else callback(null, address.address, address.family);
  } } });
}

async function resolveBeforeDeadline(hostname: string, signal: AbortSignal) {
  signal.throwIfAborted();
  let onAbort: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => { onAbort = () => reject(signal.reason); signal.addEventListener("abort", onAbort, { once: true }); });
  try { return await Promise.race([lookup(hostname, { all: true, verbatim: true }), cancelled]); }
  finally { signal.removeEventListener("abort", onAbort); }
}
