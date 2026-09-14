# Ambientes: um banco só

Decisão do proprietário (14/09/2026): **não existe banco de homologação.** O
Spark tem um banco de dados — o Postgres do projeto Supabase — e é nele que o
app roda, é nele que se mexe e é nele que se testa à mão. O mesmo projeto faz
a autenticação (Supabase Auth). Qualquer máquina de desenvolvimento aponta para
ele; abrir o app em outro dispositivo é ver os mesmos dados.

| Peça | Aponta para | Onde se configura |
|---|---|---|
| API (`apps/api`) | Postgres do Supabase, conexão direta (porta 5432) | `apps/api/.env` → `DATABASE_URL` |
| Electric do app (`electric-app`, porta 3011) | o mesmo Postgres, `sslmode=require`, IPv6 pela rede do host | `.env` na raiz → `ELECTRIC_DATABASE_URL` (lido pelo `docker-compose.yml`) |
| Migrations (`pnpm db:migrate`) | `DATABASE_URL` | idem API |
| Semeador (`pnpm seed:demo --org …`) | `DATABASE_URL` | idem — semeia o banco real, de propósito e com `--org` explícito |
| Web (`apps/web`) | a API local (`:3000`) e o Supabase Auth | `apps/web/.env.local` |

## Testes automatizados nunca tocam o banco do app

Os testes de integração e e2e **criam e apagam organizações**. Eles usam
`TEST_DATABASE_URL` — por padrão o Postgres do Docker local
(`postgresql://postgres:spark_dev@localhost:5432/spark`) — e o setup dos e2e
(`apps/api/test/setup.ts`) sobrescreve `DATABASE_URL` com esse valor antes de
a API carregar, porque o `.env` da API traz a URL real. No CI as duas
variáveis apontam para o Postgres do job.

O Docker (`docker compose up -d`) continua existindo por isso: Postgres e
Electric locais servem aos testes, não ao app.

Projeto Supabase do Spark: **`aiqbhzugqwbcraifhyxl`** (organização Human Studio, São Paulo) — criado em 14/09/2026; Auth e banco no mesmo projeto. A configuração de Auth (site URL, redirecionamentos) vive em `supabase/config.toml` e sobe com `supabase config push`.

## O que o Supabase exige

- **Conexão direta**, não o pooler em modo transação: Electric precisa de
  replicação lógica, e as migrations criam publicação e papel (`app_user`).
- O comando de migração já tolera o que o Supabase não permite (o grant via
  `supabase_admin` é pulado; o banco lá se chama `postgres`, não `spark`).
- `http://localhost:3100/**` (e a URL pública do app) na lista de Redirect
  URLs do Auth, para links de recuperação caírem na página de nova senha.

## Primeiro acesso no banco real

Ver [primeiro-proprietario.md](primeiro-proprietario.md): organização e usuário
existem no Postgres, e `identity:bootstrap-owner` vincula o `sub` do Supabase
Auth, garante os grupos padrão e atribui Proprietário.
