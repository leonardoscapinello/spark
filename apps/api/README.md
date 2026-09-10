# @spark/api

NestJS 11 sobre Fastify — HTTP, webhooks, autorização. Ver `docs/adr/0003`, `docs/adr/0004`, `docs/adr/0013`.

## ⚠️ Nunca rodar via `tsx` — use `ts-node`

`dev`, `start` e `emit:openapi` rodam com `node --loader ts-node/esm`, não `tsx`. Não é preferência de estilo: **`tsx` (esbuild por baixo) não emite `design:paramtypes` para decorators corretamente**, e o DI do NestJS depende inteiramente disso pra saber o que injetar no construtor de cada provider.

O sintoma, se isso regredir: providers com dependência no construtor (como `SupabaseJwtGuard(config: ConfigService)`) recebem `undefined` em silêncio — sem erro de compilação, sem erro óbvio, só um `Cannot read properties of undefined` na hora de usar. Confirmado com um teste isolado: `Reflect.getMetadata("design:paramtypes", Classe)` volta `undefined` via `tsx`, e o valor certo via `tsc` real.

O Vitest, por rodar dentro do MESMO pacote que o código sendo testado, resolve `tsconfig.json` corretamente e não tem esse problema — é por isso que os testes passam mesmo sem `ts-node`. Mas isso é frágil entre pacotes: um teste de OUTRO pacote importando código decorado daqui (ver `packages/api-client/test/generated-client.e2e.test.ts`) tem o mesmo bug do `tsx`, porque o Vite daquele pacote transforma o arquivo com a config dele, não a nossa. A solução ali foi subir a API como processo separado de verdade — é como qualquer app real (web/desktop/mobile) fala com a API de qualquer forma.

## Autenticação

Login é a Supabase Auth quem faz (e-mail/senha, magic link, OAuth) — esta API só **verifica** o JWT que ela emite (`SupabaseJwtGuard`, HS256 com `SUPABASE_JWT_SECRET`) e resolve pra qual usuário local ele corresponde (`users.supabase_user_id`, migration 0001). Ver `docs/adr/0005`.

Resolver "de qual usuário é este JWT" é uma consulta que atravessa organizações por natureza — usa a conexão admin do banco (bypassa RLS), não `app_user`. Documentado em `src/modules/identity/infrastructure/users.repository.ts` e em `packages/db/README.md`.

Usuário autenticado sem linha local em `users` recebe **404**, não criação automática — a que organização alguém pertence é política de produto (convite/onboarding), não algo pra inventar no meio do meio da verificação de token.

## Contrato OpenAPI

```bash
pnpm --filter @spark/api run emit:openapi   # gera packages/contracts/openapi.json
pnpm --filter @spark/api-client run gen     # gera o cliente tipado a partir dele
```

Ou os dois juntos, da raiz: `pnpm gen:api`. Nenhum DTO é escrito à mão — todo `*.dto.ts` em `src/modules/*/dto/` é `createZodDto(SchemaDeCore)`, e o schema Zod é a única fonte (`docs/adr/0004`, `docs/adr/0019`).

## Comandos

```bash
pnpm dev     # watch mode
pnpm start   # uma vez, sem watch
pnpm test    # e2e via @nestjs/testing + app.inject (sem porta real)
```
