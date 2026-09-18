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

## Não existe banco local nem homologação

O único banco persistente do Spark é o Postgres de produção no Supabase.
`localhost:5432`, container de Postgres e fallback silencioso para banco de
desenvolvimento são proibidos. Testes puros rodam normalmente; testes de
integração que criam/apagam dados só rodam quando a infraestrutura fornece
explicitamente `TEST_DATABASE_URL`. Sem essa variável eles são excluídos, nunca
redirecionados ao banco de produção.

Projeto Supabase do Spark: **`vrxjqqqsoqfaxzanebtf`** — Auth e banco no mesmo projeto. A configuração de Auth (site URL, redirecionamentos) vive em `supabase/config.toml` e sobe com `supabase config push`.

> Em 14/09/2026 este documento passou a citar um projeto `aiqbhzugqwbcraifhyxl`, na organização **Human Studio**, que pertence a outro cliente. Os `.env` nunca deixaram de apontar para `vrxjqqqsoqfaxzanebtf`, e é nele que estão as migrations e os dados. O registro ficou dizendo uma coisa e o sistema fazendo outra por três dias. **A fonte da verdade sobre qual banco está em uso é o `.env`**, e nenhum projeto da organização Human Studio deve ser usado aqui.

## A conexão direta é IPv6, e isso já causou queda ao vivo

Verificado em 18/09/2026: numa máquina atrás de VPN, a rota IPv6 até
`db.<projeto>.supabase.co` **oscila** — conecta agora, `EHOSTUNREACH` no minuto
seguinte, sem nada mudar no código. Toda a API dependia dela sozinha (as 38
classes de repositório, via `DATABASE_URL`), então uma queda de rota derrubava
a aplicação inteira, não só a sincronização — o sintoma era a tela "carregando"
sem nunca terminar.

Correção: `createAppDbClient` (`packages/db/src/client.ts`) usa
`DATABASE_POOLER_URL` quando ela existe — o Session Pooler do Supabase
(Supavisor), que é IPv4 e grátis em todo projeto — e cai para `DATABASE_URL`
quando não. Preencher `DATABASE_POOLER_URL` no `.env` tira o tráfego comum
dessa rota instável; só o Electric continua na conexão direta, porque
replicação lógica exige. Ver `.env.example` para onde pegar a string no
painel.

## O que o Supabase exige

- **Conexão direta**, não o pooler em modo transação: Electric precisa de
  replicação lógica, e as migrations criam publicação e papel (`app_user`).
- O comando de migração usa somente `DATABASE_URL`; não tenta fabricar uma
  conexão administrativa ou nome de banco local.
- `http://localhost:3100/**` (e a URL pública do app) na lista de Redirect
  URLs do Auth, para links de recuperação caírem na página de nova senha.

## Primeiro acesso no banco real

Ver [primeiro-proprietario.md](primeiro-proprietario.md): organização e usuário
existem no Postgres, e `identity:bootstrap-owner` vincula o `sub` do Supabase
Auth, garante os grupos padrão e atribui Proprietário.
