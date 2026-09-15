import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { DealPresenceSchema, uniqueDealViewers, type DealId, type DealViewer, type OrgId } from "@spark/core";

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

type Listener = (viewers: DealViewer[] | null) => void;

@Injectable()
export class DealPresenceService implements OnModuleDestroy {
  private commands?: Redis;
  private subscriber?: Redis;
  private ready: Promise<void> | undefined;
  private readonly listeners = new Map<string, Set<Listener>>();

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
      const listeners = this.listeners.get(channel);
      if (!listeners) return;
      try {
        const viewers = uniqueDealViewers(DealPresenceSchema.parse(JSON.parse(payload)));
        for (const listener of listeners) listener(viewers);
      } catch { for (const listener of listeners) listener(null); }
    });
    this.ready = Promise.all([this.commands.connect(), this.subscriber.connect()])
      .then(async () => { await this.subscriber!.psubscribe("spark:presence:deal:*:updates"); })
      .catch((error: unknown) => {
        this.commands?.disconnect();
        this.subscriber?.disconnect();
        this.ready = undefined;
        throw error;
      });
    return this.ready;
  }

  async join(orgId: OrgId, dealId: DealId, viewer: DealViewer, listener: Listener) {
    await this.ensureReady();
    const prefix = `spark:presence:deal:{${orgId}:${dealId}}`;
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

  onModuleDestroy(): void {
    this.commands?.disconnect();
    this.subscriber?.disconnect();
  }
}
