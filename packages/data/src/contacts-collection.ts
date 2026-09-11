/**
 * Local-first contacts collection — TanStack DB + Electric (docs/adr/0018).
 *
 * The ShapeStream never talks to Electric directly: `shapeOptions.url`
 * points at the authorization proxy in apps/api (GET /v1/shapes/contacts),
 * which decides the per-organization filter — the client only picks WHICH
 * table, never WITH WHAT FILTER (docs/adr/0026).
 *
 * `createContactsCollection` is a factory, not a ready-made module-level
 * singleton: `shapeOptions.url` is a static field, resolved at the moment
 * the config is built — if this were `createCollection(...)` directly at
 * the module's top level, the URL would be computed at `import` time,
 * before the app calls `setSparkApiBaseUrl` at startup (same ordering
 * risk already documented in http-client.ts). Each app calls the factory
 * AFTER configuring base URL and token.
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { ContactSchema, contactId, type Contact, type CreateContactInput, type OrgId } from "@spark/core";
import { contactsControllerArchive, contactsControllerCreate, contactsControllerUpdate, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

/**
 * Builds the full row `collection.insert()` requires — the collection's
 * validation schema is the entire `ContactSchema` (the shape Electric
 * syncs), not just what the form collects. `id` is already the final one
 * (docs/adr/0030); `orgId` and the timestamps are only an optimistic
 * placeholder — the server never reads either from the request body
 * (docs/adr/0026), and once Electric replicates the real row back, these
 * values get replaced by what Postgres actually wrote.
 */
export function optimisticContact(input: Omit<CreateContactInput, "id">, orgId: OrgId): Contact {
  const now = new Date().toISOString();
  return {
    id: contactId.create(),
    orgId,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    leadStatus: input.leadStatus ?? "new",
    source: input.source ?? null,
    ownerId: input.ownerId ?? null,
    companyId: input.companyId ?? null,
    score: input.score ?? 0,
    customFields: input.customFields ?? {},
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function createContactsCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "contacts",
      schema: ContactSchema,
      getKey: (contact) => contact.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/contacts`,
        // Electric replicates the Postgres column (snake_case) — our Zod
        // schema is all camelCase (ADR-0019). Without this, a composite
        // field name (orgId, createdAt...) arrives undefined at runtime,
        // with no type error at all (found testing for real in the
        // browser, not just the compiler — the test suite only exercised
        // single-word fields, where snake_case and camelCase are identical).
        columnMapper: snakeCamelMapper(),
        headers: {
          // function, not string — re-evaluated on every stream request,
          // to track token renewal without recreating the whole collection.
          authorization: () => {
            const token = getSparkAuthToken();
            return token ? `Bearer ${token}` : "";
          },
        },
      },
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");

        const contact = mutation.modified;

        // Inline literal, not routed through a variable typed as
        // CreateContactInput: Contact has email/phone always present
        // (never `undefined`, only `| null`), but the OPTIONAL property's
        // TYPE on CreateContactInput is `Email | null | undefined` — under
        // exactOptionalPropertyTypes (tsconfig.base.json), coercing through
        // that intermediate variable would leak the declaration's
        // `undefined` into the argument, even though the real value is
        // never undefined here. An inline literal infers each field's type
        // from the expression itself (Email | null), which already
        // matches CreateContactDto.
        const response = await contactsControllerCreate({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          leadStatus: contact.leadStatus,
          source: contact.source,
          ownerId: contact.ownerId,
          companyId: contact.companyId,
          score: contact.score,
          customFields: contact.customFields,
          tags: contact.tags,
        });

        // { txid } in the return value — that's what TanStack DB uses
        // (awaitTxId under the hood) to know Electric has already
        // replicated this write before releasing the local optimistic state.
        return { txid: response.txid };
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");

        const changedFields = Object.keys(mutation.changes);
        if (changedFields.length === 1 && changedFields[0] === "deletedAt") {
          const response = await contactsControllerArchive(mutation.original.id, { archived: mutation.modified.deletedAt !== null });
          return { txid: response.txid };
        }
        const allowedFields = new Set(["name", "email", "phone", "leadStatus", "source", "ownerId", "companyId"]);
        const isAllowed = changedFields.length > 0 && changedFields.every((field) => allowedFields.has(field));
        if (!isAllowed) {
          throw new Error(
            `Unsupported contact field(s): ${changedFields.join(", ")}.`,
          );
        }

        const response = await contactsControllerUpdate(mutation.original.id, {
          ...("name" in mutation.changes ? { name: mutation.modified.name } : {}),
          ...("email" in mutation.changes ? { email: mutation.modified.email } : {}),
          ...("phone" in mutation.changes ? { phone: mutation.modified.phone } : {}),
          ...("leadStatus" in mutation.changes ? { leadStatus: mutation.modified.leadStatus } : {}),
          ...("source" in mutation.changes ? { source: mutation.modified.source } : {}),
          ...("ownerId" in mutation.changes ? { ownerId: mutation.modified.ownerId } : {}),
          ...("companyId" in mutation.changes ? { companyId: mutation.modified.companyId } : {}),
        });

        return { txid: response.txid };
      },
    }),
  );
}

export type ContactsCollection = ReturnType<typeof createContactsCollection>;
