import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, date, primaryKey, pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { APP_ROLE } from "../roles.js";
import type { ScoreModel, ScoreContribution } from "@spark/core";
const orgPolicy = (table: string) => pgPolicy(`${table}_org`, { for: "all", to: APP_ROLE, using: sql`org_id = current_setting('app.current_org_id',true)::uuid` });
export const scoreModels = pgTable("score_models", {
 id: uuid("id").primaryKey().defaultRandom(), orgId: uuid("org_id").notNull(), scope: text("scope").notNull(),
 definition: jsonb("definition").$type<ScoreModel>().notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), createdBy: uuid("created_by"),
}, () => [orgPolicy("score_models")]).enableRLS();
export const scorePolicies = pgTable("score_policies", { orgId: uuid("org_id").notNull(), scope: text("scope").notNull(), modelId: uuid("model_id").notNull() }, t => [primaryKey({ columns: [t.orgId,t.scope] }),orgPolicy("score_policies")]).enableRLS();
export const scoreSignals = pgTable("score_signals", {
 orgId: uuid("org_id").notNull(), sourceKey: text("source_key").notNull(), contactId: uuid("contact_id").notNull(),
 scope: text("scope").notNull().default("general"), signal: text("signal").notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
 recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(), units: integer("units").notNull().default(1),
}, t => [primaryKey({ columns: [t.orgId,t.sourceKey] }),orgPolicy("score_signals")]).enableRLS();
export const scoreSignalDays = pgTable("score_signal_days", {
 orgId: uuid("org_id").notNull(), contactId: uuid("contact_id").notNull(), scope: text("scope").notNull(), signal: text("signal").notNull(), day: date("day").notNull(), count: integer("count").notNull(),
}, t => [primaryKey({ columns: [t.orgId,t.contactId,t.scope,t.signal,t.day] }),orgPolicy("score_signal_days")]).enableRLS();
export const scoreSnapshots = pgTable("score_snapshots", {
 id: uuid("id").notNull().defaultRandom(), orgId: uuid("org_id").notNull(), contactId: uuid("contact_id").notNull(), scope: text("scope").notNull(), modelId: uuid("model_id").notNull(),
 value: integer("value").notNull(), hasEvidence: boolean("has_evidence").notNull(), contributions: jsonb("contributions").$type<ScoreContribution[]>().notNull(), capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(), day: date("day").notNull(),
}, t => [primaryKey({ columns: [t.id,t.day] }),orgPolicy("score_snapshots")]).enableRLS();
