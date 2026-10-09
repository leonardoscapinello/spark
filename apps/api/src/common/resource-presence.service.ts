import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { DealPresenceSchema, DealViewerSchema, uniqueDealViewers, type ConversationId, type DealId, type DealViewer, type OrgId } from "@spark/core";

// Ephemeral leases, not business data. A crashed API cannot leave a ghost
// viewer indefinitely; all API replicas use the same Valkey transport.
export const PRESENCE_LEASE_MS = 60_000;
export const PRESENCE_UPDATE = `
local changed = false
local expired = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
for _, id in ipairs(expired) do
  redis.call('ZREM', KEYS[1], id)
  redis.call('HDEL', KEYS[2], id)
  changed = true
end
if ARGV[4] == '' then
  if redis.call('HDEL', KEYS[2], ARGV[3]) > 0 then changed = true end
  redis.call('ZREM', KEYS[1], ARGV[3])
else
  if redis.call('HGET', KEYS[2], ARGV[3]) ~= ARGV[4] then changed = true end
  redis.call('ZADD', KEYS[1], tonumber(ARGV[1]) + tonumber(ARGV[2]), ARGV[3])
  redis.call('HSET', KEYS[2], ARGV[3], ARGV[4])
end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ARGV[2])
local values = redis.call('HVALS', KEYS[2])
local payload = '[' .. table.concat(values, ',') .. ']'
if changed then redis.call('PUBLISH', KEYS[3], payload) end
return payload
`;

export type PresenceResource = { kind: "deal"; id: DealId } | { kind: "conversation"; id: ConversationId };
type TypingListener = (viewer: DealViewer) => void;

function resourcePrefix(orgId: OrgId, resource: PresenceResource): string {
  return `spark:presence:${resource.kind}:{${orgId}:${resource.id}}`;
}

type Listener = (viewers: DealViewer[] | null) => void;

@Injectable()
export class ResourcePresenceService implements OnModuleDestroy {
  private commands?: Redis;
  private subscriber?: Redis;
  private ready: Promise<void> | undefined;
  private readonly listeners = new Map<string, Set<Listener>>();

  private readonly typingListeners = new Map<string, Set<TypingListener>>();

  private ensureReady(): Promise<void> {
    if (this.ready) return this.ready;
    const url = process.env.REDIS_URL ?? (process.env.NODE_ENV !== "production" ? "redis://127.0.0.1:6379" : undefined);
    if (!url) return Promise.reject(new Error("REDIS_URL is required for presence."));
    this.commands = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 2_000, commandTimeout: 3_000 });
    this.subscriber = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 2_000 });
    const unavailable = () => { for (const listeners of this.listeners.values()) for (const listener of listeners) listener(null); };
    this.commands.on("error", unavailable);
    this.subscriber.on("error", unavailable);
    this.subscriber.on("close", unavailable);
    this.subscriber.on("pmessage", (_pattern: string, channel: string, payload: string) => {
      if (channel.endsWith(":typing")) {
        const listeners = this.typingListeners.get(channel);
        if (!listeners) return;
        try {
          const viewer = DealViewerSchema.parse(JSON.parse(payload));
          for (const listener of listeners) listener(viewer);
        } catch { /* Invalid ephemeral events are discarded. */ }
        return;
      }
      const listeners = this.listeners.get(channel);
      if (!listeners) return;
      try {
        const viewers = uniqueDealViewers(DealPresenceSchema.parse(JSON.parse(payload)));
        for (const listener of listeners) listener(viewers);
      } catch { for (const listener of listeners) listener(null); }
    });
    this.ready = Promise.all([this.commands.connect(), this.subscriber.connect()])
      .then(async () => { await this.subscriber!.psubscribe("spark:presence:deal:*:updates", "spark:presence:conversation:*:updates", "spark:presence:conversation:*:typing"); })
      .catch((error: unknown) => {
        this.commands?.disconnect();
        this.subscriber?.disconnect();
        this.ready = undefined;
        throw error;
      });
    return this.ready;
  }

  async join(orgId: OrgId, resource: PresenceResource, viewer: DealViewer, listener: Listener) {
    await this.ensureReady();
    const prefix = resourcePrefix(orgId, resource);
    const channel = `${prefix}:updates`;
    const sessionId = randomUUID();
    const listeners = this.listeners.get(channel) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(channel, listeners);
    const update = async (member: string) => {
      const payload = await this.commands!.eval(PRESENCE_UPDATE, 3, `${prefix}:leases`, `${prefix}:members`, channel,
        Date.now(), PRESENCE_LEASE_MS, sessionId, member);
      return uniqueDealViewers(DealPresenceSchema.parse(JSON.parse(String(payload))));
    };
    let closed = false;
    const leave = async () => {
      if (closed) return;
      closed = true;
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(channel);
      await update("");
    };
    try { listener(await update(JSON.stringify(viewer))); }
    catch (error) { await leave().catch(() => undefined); throw error; }
    return {
      renew: async () => { if (!closed) listener(await update(JSON.stringify(viewer))); },
      leave,
    };
  }

  async listenTyping(orgId: OrgId, id: ConversationId, listener: TypingListener): Promise<() => void> {
    await this.ensureReady();
    const channel = `${resourcePrefix(orgId, { kind: "conversation", id })}:typing`;
    const listeners = this.typingListeners.get(channel) ?? new Set<TypingListener>();
    listeners.add(listener);
    this.typingListeners.set(channel, listeners);
    return () => { listeners.delete(listener); if (!listeners.size) this.typingListeners.delete(channel); };
  }

  async publishTyping(orgId: OrgId, id: ConversationId, viewer: DealViewer): Promise<void> {
    await this.ensureReady();
    await this.commands!.publish(`${resourcePrefix(orgId, { kind: "conversation", id })}:typing`, JSON.stringify(viewer));
  }

  onModuleDestroy(): void {
    this.commands?.disconnect();
    this.subscriber?.disconnect();
  }
}
