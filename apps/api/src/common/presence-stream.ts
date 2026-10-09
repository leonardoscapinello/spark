import { ServiceUnavailableException } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import type { DealViewer, OrgId } from "@spark/core";
import type { PresenceResource, ResourcePresenceService } from "./resource-presence.service.js";

export async function streamPresence({ presence, orgId, resource, viewer, expiresAt, reply }: {
  presence: ResourcePresenceService; orgId: OrgId; resource: PresenceResource;
  viewer: DealViewer; expiresAt: number; reply: FastifyReply;
}): Promise<void> {
  let pending: DealViewer[] | null = null;
  let lastPayload = "";
  let started = false;
  const write = (frame: string) => {
    if (!started || reply.raw.destroyed || reply.raw.writableEnded) return;
    // A slow reader reconnects instead of accumulating an unbounded buffer.
    if (!reply.raw.write(frame)) reply.raw.end();
  };
  const send = (viewers: DealViewer[] | null) => {
    pending = viewers;
    if (!started) return;
    if (viewers === null) { reply.raw.end(); return; }
    const payload = JSON.stringify(viewers);
    if (payload === lastPayload) return;
    lastPayload = payload;
    write(`data: ${payload}\n\n`);
  };
  let stopTyping: (() => void) | undefined;
  const session = await (async () => {
    if (resource.kind === "conversation") {
      stopTyping = await presence.listenTyping(orgId, resource.id, (author) => {
        write(`event: typing\ndata: ${JSON.stringify(author)}\n\n`);
      });
    }
    return presence.join(orgId, resource, viewer, send);
  })().catch(() => {
    stopTyping?.();
    throw new ServiceUnavailableException("Presença temporariamente indisponível.");
  });
  if (reply.raw.destroyed || expiresAt <= Date.now()) {
    stopTyping?.();
    await session.leave().catch(() => undefined);
    if (!reply.raw.destroyed) reply.raw.end();
    return;
  }
  let renewing = false;
  const heartbeat = setInterval(() => {
    if (renewing) return;
    renewing = true;
    void session.renew().then(() => write(": heartbeat\n\n"))
      .catch(() => reply.raw.end()).finally(() => { renewing = false; });
  }, 20_000);
  const expiry = setTimeout(() => reply.raw.end(), expiresAt - Date.now());
  reply.raw.once("close", () => {
    clearInterval(heartbeat);
    clearTimeout(expiry);
    stopTyping?.();
    void session.leave().catch(() => undefined);
  });
  reply.hijack();
  for (const [name, value] of Object.entries(reply.getHeaders())) {
    if (value !== undefined) reply.raw.setHeader(name, value);
  }
  reply.raw.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" });
  reply.raw.flushHeaders();
  started = true;
  send(pending);
}
