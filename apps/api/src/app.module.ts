import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { SyncModule } from "./modules/sync/sync.module.js";
import { ContactsModule } from "./modules/contacts/contacts.module.js";
import { CrmModule } from "./modules/crm/crm.module.js";
import { ActivitiesModule } from "./modules/activities/activities.module.js";
import { DevModule } from "./modules/dev/dev.module.js";

// DevModule is only included outside production — the /v1/dev/login route
// literally doesn't exist in prod (not even mapped, not "exists but
// denies" — docs/adr/0005,
// apps/api/src/modules/dev/presentation/dev-login.controller.ts).
const conditionalModules = process.env.NODE_ENV === "production" ? [] : [DevModule];

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
    ...conditionalModules,
  ],
})
export class AppModule {}
