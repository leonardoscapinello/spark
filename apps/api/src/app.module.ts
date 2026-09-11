import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { SyncModule } from "./modules/sync/sync.module.js";
import { ContactsModule } from "./modules/contacts/contacts.module.js";
import { CrmModule } from "./modules/crm/crm.module.js";
import { ActivitiesModule } from "./modules/activities/activities.module.js";
import { CompaniesModule } from "./modules/companies/companies.module.js";
import { EventsModule } from "./modules/events/events.module.js";
import { InboxModule } from "./modules/inbox/inbox.module.js";
import { AutomationsModule } from "./modules/automations/automations.module.js";
import { IntegrationsModule } from "./modules/integrations/integrations.module.js";
import { FilesModule } from "./modules/files/files.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        // never log request/response bodies — they can carry contact PII,
        // message content, email (docs/adr/0013).
        redact: ["req.headers.authorization", "req.body", "res.body"],
        // exactOptionalPropertyTypes doesn't accept an explicit
        // `transport: undefined` — the property must be OMITTED, not
        // present-with-undefined.
        ...(process.env.NODE_ENV === "production"
          ? {}
          : { transport: { target: "pino-pretty", options: { singleLine: true } } }),
      },
    }),
    IdentityModule,
    SyncModule,
    ContactsModule,
    CrmModule,
    ActivitiesModule,
    CompaniesModule,
    EventsModule,
    InboxModule,
    AutomationsModule,
    IntegrationsModule,
    FilesModule,
    CatalogModule,
  ],
})
export class AppModule {}
