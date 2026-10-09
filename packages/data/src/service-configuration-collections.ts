import { registerSessionCollection } from "./session-collections.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { serviceConfigurationControllerSave } from "@spark/api-client";
import { ServiceCategorySchema, ServiceStatusSchema, ServiceLevelSchema, PriorityMatrixSchema, SlaPolicySchema, SaveServiceConfigurationSchema } from "@spark/core";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { confirmed } from "./confirmed.js";
import { sparkShapeOptions } from "./shape-options.js";
export function createServiceCategoriesCollection() { return registerSessionCollection(createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "service_categories", schema: ServiceCategorySchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("service_categories"),
  onInsert: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "category" }) })); },
  onUpdate: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "category" }) })); },
}))); }
export function createServiceStatusesCollection() { return registerSessionCollection(createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "service_statuses", schema: ServiceStatusSchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("service_statuses"),
  onInsert: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "status" }) })); },
  onUpdate: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "status" }) })); },
}))); }
export function createServiceLevelsCollection() { return registerSessionCollection(createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "service_levels", schema: ServiceLevelSchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("service_levels"),
  onInsert: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "level", levelKind: row.kind }) })); },
  onUpdate: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "level", levelKind: row.kind }) })); },
}))); }
export function createPriorityMatrixCollection() { return registerSessionCollection(createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "priority_matrix", schema: PriorityMatrixSchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("priority_matrix"),
  onInsert: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "matrix" }) })); },
  onUpdate: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "matrix" }) })); },
}))); }
export function createSlaPoliciesCollection() { return registerSessionCollection(createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "sla_policies", schema: SlaPolicySchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("sla_policies"),
  onInsert: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "policy" }) })); },
  onUpdate: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Registro ausente."); return confirmed(await serviceConfigurationControllerSave({ configuration: SaveServiceConfigurationSchema.parse({ ...row, kind: "policy" }) })); },
}))); }
