import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { ServiceCycleSchema, ServiceSegmentSchema, ServiceCycleHourSchema, ServiceCycleHolidaySchema } from "@spark/core";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";
export function createServiceCyclesCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "service_cycles", schema: ServiceCycleSchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("service_cycles") })); }
export function createServiceSegmentsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "service_segments", schema: ServiceSegmentSchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("service_segments") })); }
export function createServiceCycleHoursCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "service_cycle_hours", schema: ServiceCycleHourSchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("service_cycle_hours") })); }
export function createServiceCycleHolidaysCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "service_cycle_holidays", schema: ServiceCycleHolidaySchema, getKey: row => row.id, shapeOptions: sparkShapeOptions("service_cycle_holidays") })); }
