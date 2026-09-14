import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { contacts } from "./contacts.js";
import { companies } from "./companies.js";
import { products } from "./catalog.js";

/**
 * Catálogo de marcações da organização (ADR-0035). `slug` é a forma
 * normalizada — é ele que impede "VIP" e "vip" de virarem duas marcações.
 */
export const tags = pgTable(
  "tags",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    unique("tags_org_slug_unique").on(t.orgId, t.slug),
    pgPolicy("tags_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();

/* Um vínculo por entidade marcável: com tabela própria a chave estrangeira
 * existe de verdade, e o banco garante que a marcação aponta para algo real. */
export const contactTags = pgTable(
  "contact_tags",
  {
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.contactId, t.tagId] }),
    pgPolicy("contact_tags_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();

export const companyTags = pgTable(
  "company_tags",
  {
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.tagId] }),
    pgPolicy("company_tags_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();

export const productTags = pgTable(
  "product_tags",
  {
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.tagId] }),
    pgPolicy("product_tags_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();
