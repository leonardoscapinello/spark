import { sql } from "drizzle-orm";
import { bigint, boolean, date, index, integer, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { CompanyRegistration } from "@spark/core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";

/**
 * Cadastro público da Receita Federal, por CNPJ. **Não é a tabela `companies`**:
 * lá está o que a organização escreve e edita; aqui está o que o governo
 * publica, que ninguém edita e que só é buscado de novo quando envelhece.
 *
 * Uma linha por (org, CNPJ). O mesmo CNPJ citado num campo de negócio, num de
 * pessoa e no cadastro de uma empresa aponta para esta linha — buscar uma vez
 * serve a todos.
 *
 * Tudo em coluna (ADR-0035). CNAE, quadro societário e regime tributário têm
 * tabela própria logo abaixo, e é isso que permite perguntar ao banco «quais
 * das minhas empresas são do CNAE X e estão baixadas» sem abrir documento
 * nenhum.
 */
export const companyRegistrations = pgTable("company_registrations", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  /** 14 dígitos, sem máscara. */
  taxId: text("tax_id").notNull(),

  legalName: text("legal_name"),
  tradeName: text("trade_name"),

  registrationStatus: text("registration_status"),
  registrationStatusCode: integer("registration_status_code"),
  registrationStatusDate: date("registration_status_date"),
  registrationStatusReason: text("registration_status_reason"),
  specialStatus: text("special_status"),
  specialStatusDate: date("special_status_date"),

  headOffice: boolean("head_office"),
  openedOn: date("opened_on"),

  legalNature: text("legal_nature"),
  legalNatureCode: integer("legal_nature_code"),
  size: text("size"),
  sizeCode: integer("size_code"),
  /** Centavos inteiros, como todo dinheiro aqui — e bigint porque o capital
   * social de uma companhia aberta passa muito de dois bilhões de centavos. */
  shareCapital: bigint("share_capital", { mode: "number" }),

  streetKind: text("street_kind"),
  street: text("street"),
  streetNumber: text("street_number"),
  complement: text("complement"),
  district: text("district"),
  postalCode: text("postal_code"),
  city: text("city"),
  cityIbgeCode: integer("city_ibge_code"),
  state: text("state"),
  country: text("country"),
  foreignCity: text("foreign_city"),

  phone: text("phone"),
  secondaryPhone: text("secondary_phone"),
  fax: text("fax"),
  email: text("email"),

  simplesOptant: boolean("simples_optant"),
  simplesOptedOn: date("simples_opted_on"),
  simplesLeftOn: date("simples_left_on"),
  meiOptant: boolean("mei_optant"),
  meiOptedOn: date("mei_opted_on"),
  meiLeftOn: date("mei_left_on"),

  federativeEntity: text("federative_entity"),

  source: text("source").notNull(),
  status: text("status").$type<CompanyRegistration["status"]>().notNull(),
  httpStatus: integer("http_status"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("company_registrations_org_tax_id_uidx").on(table.orgId, table.taxId),
  index("company_registrations_org_expires_idx").on(table.orgId, table.expiresAt),
  // Procurar pela empresa pelo nome é o segundo uso da base, depois do CNPJ.
  index("company_registrations_org_legal_name_idx").on(table.orgId, table.legalName),
  pgPolicy("company_registrations_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();

/** CNAE: a principal marcada, as secundárias em seguida. */
export const companyRegistrationActivities = pgTable("company_registration_activities", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  registrationId: uuid("registration_id").notNull().references(() => companyRegistrations.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  description: text("description").notNull(),
  main: boolean("main").notNull(),
  sortOrder: integer("sort_order").notNull(),
}, (table) => [
  index("company_registration_activities_registration_idx").on(table.registrationId),
  // «Quem são as empresas do meu funil neste CNAE?» é a pergunta que justifica
  // esta tabela existir em vez de uma lista dentro da linha.
  index("company_registration_activities_org_code_idx").on(table.orgId, table.code),
  pgPolicy("company_registration_activities_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();

/** Quadro societário. O CPF vem mascarado da Receita e é guardado assim. */
export const companyRegistrationMembers = pgTable("company_registration_members", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  registrationId: uuid("registration_id").notNull().references(() => companyRegistrations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  maskedTaxId: text("masked_tax_id"),
  role: text("role"),
  roleCode: integer("role_code"),
  joinedOn: date("joined_on"),
  ageRange: text("age_range"),
  country: text("country"),
  legalRepresentative: text("legal_representative"),
  legalRepresentativeMaskedTaxId: text("legal_representative_masked_tax_id"),
  legalRepresentativeRole: text("legal_representative_role"),
  sortOrder: integer("sort_order").notNull(),
}, (table) => [
  index("company_registration_members_registration_idx").on(table.registrationId),
  index("company_registration_members_org_name_idx").on(table.orgId, table.name),
  pgPolicy("company_registration_members_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();

/** Forma de tributação por ano. */
export const companyRegistrationTaxRegimes = pgTable("company_registration_tax_regimes", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  registrationId: uuid("registration_id").notNull().references(() => companyRegistrations.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  taxation: text("taxation"),
  bookkeepingCount: integer("bookkeeping_count"),
  scpTaxId: text("scp_tax_id"),
}, (table) => [
  index("company_registration_tax_regimes_registration_idx").on(table.registrationId),
  pgPolicy("company_registration_tax_regimes_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
