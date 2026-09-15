# Gateway de desenvolvimento

O navegador acessa a API por **https://localhost:3001 (HTTP/2)**. O gateway
repassa para Nest/Fastify em `localhost:3000`, incluindo a autorização das
shapes. A tela continua em `http://localhost:3100`, preservando a sessão.

HTTP/1.1 permite apenas seis conexões simultâneas por origem no navegador.
Seis streams SSE ocupavam todas elas e enfileiravam salvamentos, previews e
outras shapes antes de a API receber a requisição. Desligar SSE e usar
long-poll não resolve: ele também mantém conexões ocupadas.

## Primeira instalação (macOS)

```sh
brew install caddy
pnpm dev:gateway
```

Em outro terminal, **com autorização do dono da máquina**, confie na CA local:

```sh
caddy trust
```

O sistema pode pedir autenticação. Não ignore alertas TLS no navegador e não
desabilite a validação de certificados. A CA é local, administrada pelo Caddy,
e não entra no Git. Para remover a confiança quando não for mais necessária,
use `caddy untrust`.

Configure `apps/web/.env.local` conforme `.env.example`:

```dotenv
VITE_API_BASE_URL=https://localhost:3001
```

Depois, `pnpm dev` inicia o gateway junto dos apps; não mantenha uma segunda
instância na mesma porta. Se API/web já estiverem rodando separadamente,
use apenas `pnpm dev:gateway`.

## Contrato de produção

A URL pública da API precisa negociar HTTP/2 ou HTTP/3 (TLS sozinho não basta).
O proxy deve transmitir SSE sem buffering e preservar os headers Electric.
Isso é transporte: **o único banco continua sendo o Postgres remoto de
produção**. O gateway não armazena dados, não cria banco e não substitui a
autorização da API.

Referência: [diagnóstico oficial do Electric](https://electric-sql.com/docs/guides/troubleshooting#slow-shapes--app-freezes).
