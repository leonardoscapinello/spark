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
import { FormsModule } from "./modules/forms/forms.module.js";
import { EmailVerificationModule } from "./modules/email-verification/email-verification.module.js";
import { SocialModule } from "./modules/social/social.module.js";
import { CampaignsModule } from "./modules/campaigns/campaigns.module.js";
import { SettingsModule } from "./modules/settings/settings.module.js";
import { ViewsModule } from "./modules/views/views.module.js";
import { PreferencesModule } from "./modules/preferences/preferences.module.js";
import { NotesModule } from "./modules/notes/notes.module.js";
import { PagesModule } from "./modules/pages/pages.module.js";
import { LinkPreviewsModule } from "./modules/link-previews/link-previews.module.js";
import { CompanyRegistrationsModule } from "./modules/company-registrations/company-registrations.module.js";

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
    FormsModule,
    EmailVerificationModule,
    SocialModule,
    CampaignsModule,
    SettingsModule,
    ViewsModule,
    PreferencesModule,
    NotesModule,
    PagesModule,
    LinkPreviewsModule,
    CompanyRegistrationsModule,
  ],
})
export class AppModule {}
