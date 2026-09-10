import { pgTable, pgPolicy, text, timestamp, uuid, boolean, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations.js";
import { contacts } from "./contacts.js";
import { APP_ROLE } from "../roles.js";
import { v7 as uuidv7 } from "uuid";

/**
 * Espelha IdentitySchema (packages/core/src/schema/identity.ts). A tabela
 * que liga um canal (e-mail, WhatsApp, Instagram) ao mesmo contato — sem
 * ela o Spark é só mais um dos quatro sistemas que substitui
 * (docs/arquitetura/visao-geral.md).
 */
export const identities = pgTable(
  "identities",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    canal: text("canal").notNull(),
    valorExterno: text("valor_externo").notNull(),
    verificado: boolean("verificado").notNull().default(false),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // uma identidade pertence a um contato só, por organização e canal
    unique("identities_org_canal_valor").on(t.orgId, t.canal, t.valorExterno),
    pgPolicy("identities_isolamento_por_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
