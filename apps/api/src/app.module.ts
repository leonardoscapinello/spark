import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { SyncModule } from "./modules/sync/sync.module.js";
import { ContactsModule } from "./modules/contacts/contacts.module.js";
import { DevModule } from "./modules/dev/dev.module.js";

// DevModule só entra fora de produção — a rota /v1/dev/login literalmente
// não existe em prod (nem mapeada, não é "existe mas nega" — docs/adr/0005,
// apps/api/src/modules/dev/presentation/dev-login.controller.ts).
const modulosCondicionais = process.env.NODE_ENV === "production" ? [] : [DevModule];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        // nunca logar corpo de request/response — pode carregar PII de
        // contato, mensagem, e-mail (docs/adr/0013).
        redact: ["req.headers.authorization", "req.body", "res.body"],
        // exactOptionalPropertyTypes não aceita `transport: undefined`
        // explícito — omitido é diferente de presente-com-undefined.
        ...(process.env.NODE_ENV === "production"
          ? {}
          : { transport: { target: "pino-pretty", options: { singleLine: true } } }),
      },
    }),
    IdentityModule,
    SyncModule,
    ContactsModule,
    ...modulosCondicionais,
  ],
})
export class AppModule {}
