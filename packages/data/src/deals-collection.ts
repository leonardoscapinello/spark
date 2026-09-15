import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
/**
 * Local-first deals collection — same pattern as contacts-collection.ts
 * (docs/adr/0018, docs/adr/0026). `onUpdate` covers the two mutations the
 * API accepts today: moving stage (PATCH .../move) and closing as
 * won/lost (PATCH .../close) — editing another deal field is a future route.
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { z } from "zod";
import { DealSchema, dealId, money, toCents, type Deal, type DealStatus, type Money, type CreateDealInput, type OrgId, type PipelineId } from "@spark/core";
import { confirmed } from "./confirmed.js";
import { serializedWrite } from "./serialized-write.js";
import { reportWriteAcceptance } from "./write-acceptance.js";
import { sparkShapeOptions } from "./shape-options.js";
import {
  dealsControllerCreate,
  dealsControllerEdit,
  dealsControllerMove,
  dealsControllerClose,
} from "@spark/api-client";

export function optimisticDeal(input: Omit<CreateDealInput, "id">, orgId: OrgId): Deal {
  const now = new Date().toISOString();
  return {
    id: dealId.create(),
    orgId,
    pipelineId: input.pipelineId,
    stageId: input.stageId,
    contactId: input.contactId ?? null,
    companyId: input.companyId ?? null,
    ownerId: input.ownerId ?? null,
    name: input.name,
    amount: input.amount,
    status: input.status ?? "open",
    expectedCloseDate: input.expectedCloseDate ?? null,
    lossReason: input.lossReason ?? null,
    createdAt: now,
    updatedAt: now,
    customFields: {},
    deletedAt: null,
  };
}

/**
 * `collection.insert()` requires the schema's PRE-transform shape (what
 * Standard Schema calls "input") — `amount` as a number, not `Money`. It's
 * the opposite of `onInsert`, which already receives the deal
 * POST-transform (that's why `onInsert` below uses `toCents` directly,
 * without going through this). `Money` is Symbol-opaque and not
 * structurally a `number` — unlike Email/ContactId (an intersection
 * brand, which widens to a string on its own), this needs a real
 * conversion or `tsc` rejects it.
 */
export function forInsert(deal: Deal) {
  return { ...deal, amount: toCents(deal.amount) };
}

/**
 * `useLiveQuery`/`collection.toArray` return the row the way Electric
 * synced it — found testing for real in the browser (not just the
 * compiler, which trusts the declared `Deal` type): the Zod schema only
 * transforms LOCAL WRITES (`onInsert`/`onUpdate`), never a SYNCED READ.
 * `deal.amount` arrives however Postgres sends it (a bigint from the
 * column, not `Money`) — indexing directly with Money's Symbol key gives
 * `undefined`, and any arithmetic on top becomes NaN. Every place that
 * reads `amount` off a deal COMING FROM THE COLLECTION (not one you just
 * built with `optimisticDeal`) goes through here first.
 *
 * The same row changes shape over its life in the collection: a
 * freshly-made insert (still optimistic, not yet confirmed by the
 * server) already went through the local transform, so `amount` is
 * already real `Money` — also found testing for real (creating a deal
 * through the UI broke with the same NaN, because `Number(aMoney)` isn't
 * a number either). `Money` is always an object (Symbol key); Electric's
 * raw value is always a primitive — that `typeof` difference is what
 * tells the two cases apart without needing to know the row's origin.
 */
export function syncedAmount(rawAmount: unknown): Money {
  if (typeof rawAmount === "object" && rawAmount !== null) {
    return rawAmount as Money;
  }
  const cents = Number(rawAmount);
  /* Valor ausente ou ilegível vira zero em vez de derrubar a tela. `money()`
   * recusa lançando, e numa função chamada durante o render isso apagava a
   * página inteira com «Invalid monetary value: NaN» — o certo é a linha
   * mostrar R$ 0,00 e o resto continuar de pé. */
  return money(Number.isInteger(cents) ? cents : 0);
}

/**
 * `DealSchema` with a more permissive `amount` — only for the
 * collection's own schema, NEVER for `createZodDto`/OpenAPI (that's why
 * it lives here, not in packages/core: `z.toJSONSchema()`, used behind
 * the OpenAPI generator, throws `Error: BigInt cannot be represented in
 * JSON Schema` — found trying this same widening on the shared `zMoney`).
 * TanStack DB's `collection.update()` revalidates the MERGED record
 * (current row state + patch) against this schema on every call — and a
 * synced row's "current state" is always a raw bigint (Electric never
 * transforms). JSON never carries a bigint, so no real API input ever
 * goes through here.
 */
const DealCollectionSchema = DealSchema.extend({
  amount: z.union([z.number().int(), z.bigint()]).transform((amount, ctx) => {
    try {
      return money(Number(amount));
    } catch (error) {
      ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "invalid" });
      return z.NEVER;
    }
  }),
});

export interface DealsCollectionScope {
  pipelineId?: PipelineId;
  status?: DealStatus | "all";
  collectionId?: string;
}

export function createDealsCollection(scope: DealsCollectionScope = {}) {
  const sharedShapeOptions = sparkShapeOptions("deals");
  const shapeUrl = new URL(sharedShapeOptions.url);
  if (scope.pipelineId) shapeUrl.searchParams.set("pipelineId", scope.pipelineId);
  if (scope.status && scope.status !== "all") shapeUrl.searchParams.set("status", scope.status);
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: scope.collectionId ?? "deals",
      schema: DealCollectionSchema,
      getKey: (deal) => deal.id,
      shapeOptions: {
        ...sharedShapeOptions,
        url: shapeUrl.toString(),
      },
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const deal = mutation.modified;

        const response = await dealsControllerCreate({
          id: deal.id,
          pipelineId: deal.pipelineId,
          stageId: deal.stageId,
          contactId: deal.contactId,
          companyId: deal.companyId,
          ownerId: deal.ownerId,
          name: deal.name,
          // the wire format is a plain number (cents) — zMoney does the
          // inverse conversion on the API's input validation
          // (packages/core/src/schema/zodHelpers.ts).
          amount: toCents(deal.amount),
          status: deal.status,
          expectedCloseDate: deal.expectedCloseDate,
          lossReason: deal.lossReason,
        });

        return confirmed(response);
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");
        return reportWriteAcceptance(mutation.metadata, () => serializedWrite(`deal:${mutation.original.id}`, async () => {
          const changedFields = Object.keys(mutation.changes);

          if (changedFields.length === 1 && changedFields[0] === "stageId") {
            const response = await dealsControllerMove(mutation.original.id, { stageId: mutation.modified.stageId });
            return confirmed(response);
          }

          // closing (won/lost) changes "status" and, only when lost, also
          // "lossReason" alongside it — never lossReason alone.
          const isClosing =
            changedFields.includes("status") &&
            changedFields.every((field) => field === "status" || field === "lossReason") &&
            mutation.modified.status !== "open";
          if (isClosing) {
            const status = mutation.modified.status as "won" | "lost";
            const response = await dealsControllerClose(
              mutation.original.id,
              status === "lost" ? { status, lossReason: mutation.modified.lossReason } : { status },
            );
            return confirmed(response);
          }

          const editableFields = ["name", "amount", "contactId", "companyId", "ownerId", "expectedCloseDate", "customFields"];
          if (changedFields.length > 0 && changedFields.every((field) => editableFields.includes(field))) {
            // Envia somente o delta. Mandar a linha inteira em cada blur fazia
            // duas gravações concorrentes em campos distintos se sobrescreverem.
            const response = await dealsControllerEdit(mutation.original.id, {
              ...(changedFields.includes("name") ? { name: mutation.modified.name } : {}),
              ...(changedFields.includes("amount") ? { amount: toCents(mutation.modified.amount) } : {}),
              ...(changedFields.includes("contactId") ? { contactId: mutation.modified.contactId } : {}),
              ...(changedFields.includes("companyId") ? { companyId: mutation.modified.companyId } : {}),
              ...(changedFields.includes("ownerId") ? { ownerId: mutation.modified.ownerId } : {}),
              ...(changedFields.includes("expectedCloseDate") ? { expectedCloseDate: mutation.modified.expectedCloseDate } : {}),
              ...(changedFields.includes("customFields") ? { customFields: mutation.modified.customFields ?? {} } : {}),
            });
            return confirmed(response);
          }

          throw new Error(
            `Unsupported deal update — changed field(s): ${changedFields.join(", ")}.`,
          );
        }));
      },
    }),
  );
}

export type DealsCollection = ReturnType<typeof createDealsCollection>;
