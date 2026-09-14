import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { AutomationSchema, automationId, type Automation, type OrgId } from "@spark/core";
import { automationsControllerCreate, automationsControllerDraft, automationsControllerStatus, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
import { confirmed } from "./confirmed.js";

export function optimisticAutomation(name: string, orgId: OrgId): Automation {
  const now = new Date().toISOString();
  return { id: automationId.create(), orgId, name, status: "draft", draftGraph: { nodes: [], edges: [] }, currentPublishedVersionId: null, publishedVersion: null, createdAt: now, updatedAt: now };
}

export function createAutomationsCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "automations",
    schema: AutomationSchema,
    getKey: (automation) => automation.id,
    shapeOptions: { url: `${getSparkApiBaseUrl()}/v1/shapes/automations`, columnMapper: snakeCamelMapper(), headers: { authorization: () => bearer() } },
    onInsert: async ({ transaction }) => {
      const value = transaction.mutations[0]?.modified;
      if (!value) throw new Error("Automation insert has no mutation.");
      const response = await automationsControllerCreate({ id: value.id, name: value.name });
      return confirmed(response);
    },
    onUpdate: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("Automation update has no mutation.");
      const fields = Object.keys(mutation.changes);
      const draftFields = fields.filter((field) => field === "name" || field === "draftGraph");
      const statusFields = fields.filter((field) => field === "status");
      if (fields.some((field) => !["name", "draftGraph", "status"].includes(field))) throw new Error(`Unsupported automation field(s): ${fields.join(", ")}.`);
      let txid: number | undefined;
      if (draftFields.length) {
        const response = await automationsControllerDraft(mutation.original.id, { name: mutation.modified.name, draftGraph: {
          nodes: mutation.modified.draftGraph.nodes,
          edges: mutation.modified.draftGraph.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, ...(edge.label === undefined ? {} : { label: edge.label }) })),
        } });
        txid = response.txid;
      }
      if (statusFields.length) {
        if (mutation.modified.status === "draft") throw new Error("A published automation cannot return to draft status.");
        const response = await automationsControllerStatus(mutation.original.id, { status: mutation.modified.status });
        txid = response.txid;
      }
      return confirmed({ txid });
    },
  }));
}

function bearer(): string { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; }
export type AutomationsCollection = ReturnType<typeof createAutomationsCollection>;
