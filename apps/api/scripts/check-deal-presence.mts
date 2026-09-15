/** Isolated ephemeral Valkey keys only; never reads or writes Postgres. */
import assert from "node:assert/strict";
import { orgId, dealId, userId, type DealViewer } from "@spark/core";
import { DealPresenceService } from "../src/modules/crm/infrastructure/deal-presence.service.js";

const firstApi = new DealPresenceService();
const secondApi = new DealPresenceService();
const org = orgId.create();
const deal = dealId.create();
const ana = { userId: userId.create(), name: "Presence smoke A", avatarUrl: null };
const bia = { userId: userId.create(), name: "Presence smoke B", avatarUrl: null };
const sessions: Array<{ leave: () => Promise<void> }> = [];
let firstView: DealViewer[] = [];
let secondView: DealViewer[] = [];
let bothArrived!: () => void;
const both = new Promise<void>((resolve) => { bothArrived = resolve; });
const timeout = setTimeout(() => { throw new Error("Presence did not cross API instances within 5s"); }, 5_000);
const started = performance.now();
try {
  const first = await firstApi.join(org, deal, ana, (viewers) => {
    firstView = viewers ?? [];
    if (firstView.length === 2) bothArrived();
  });
  sessions.push(first);
  const second = await secondApi.join(org, deal, bia, (viewers) => { secondView = viewers ?? []; });
  sessions.push(second);
  await both;
  assert.equal(firstView.length, 2);
  assert.equal(secondView.length, 2);
  const anotherTab = await secondApi.join(org, deal, ana, () => undefined);
  sessions.push(anotherTab);
  await first.leave();
  await second.renew();
  assert.equal(secondView.length, 2, "one person with two tabs must remain after closing one tab");
  await anotherTab.leave();
  await second.renew();
  assert.deepEqual(secondView.map((viewer) => viewer.userId), [bia.userId]);
  const isolated = await firstApi.join(orgId.create(), deal, ana, () => undefined);
  sessions.push(isolated);
  await second.renew();
  assert.equal(secondView.length, 1, "other organizations must be isolated");
  process.stdout.write(`Presence: two API instances, deduplicated tabs, leave and tenant isolation passed (${Math.round(performance.now() - started)} ms).\n`);
} finally {
  clearTimeout(timeout);
  await Promise.allSettled(sessions.map((session) => session.leave()));
  firstApi.onModuleDestroy();
  secondApi.onModuleDestroy();
}
