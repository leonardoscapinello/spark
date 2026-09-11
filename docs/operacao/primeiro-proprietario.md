# Primeiro proprietário

O primeiro acesso de uma instalação é criado pelo backend, sem rota pública de cadastro e sem credencial privilegiada no navegador.

## Pré-requisitos

- o usuário e sua organização já existem no Postgres;
- `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `WEB_ORIGIN` estão configuradas em `apps/api/.env`;
- `WEB_ORIGIN/update-password` está permitido como URL de redirecionamento no Supabase Auth.

## Execução

Na raiz do monorepo:

```bash
pnpm --filter @spark/api identity:bootstrap-owner -- --local-user-id <uuid-do-usuario>
```

O comando é idempotente. Ele:

1. normaliza o e-mail pela regra única de domínio;
2. cria um convite no Supabase ou envia recuperação quando a identidade já existe;
3. vincula o `sub` real ao usuário local;
4. garante os grupos padrão e atribui `Proprietário`;
5. reativa o usuário e registra a operação na auditoria.

O comando nunca recebe senha e não imprime e-mail, token ou chave no terminal.
