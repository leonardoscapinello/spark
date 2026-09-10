# ADR-0015 — Web com React Router 7 em framework mode (SSR), com SPA mode para o desktop

**Status:** Aceito
**Data:** 2026-09-10
**Substitui:** [ADR-0006](0006-web-spa-vite-tanstack.md)

## Contexto

O ADR-0006 escolheu uma SPA pura com TanStack Router. Duas informações novas derrubam essa decisão:

1. **Experiência anterior ruim com SPA** — uma tentativa passada ficou pesada e não funcionou bem.
2. **O time vai usar o produto em 4G e 5G**, fora do escritório, e o sistema é grande.

O segundo ponto é o requisito de arquitetura mais restritivo que apareceu até agora, e merece ser diagnosticado com precisão antes de escolher a ferramenta — porque **SSR sozinho não resolve rede móvel, e em alguns casos piora**.

### O que realmente acontece numa rede móvel

O gargalo de 4G não é banda (10–50 Mbps é bastante), é **latência e variabilidade**: 50–100 ms de ida e volta em condição normal, picos de 300 ms+, e perda de pacote ao trocar de torre.

Isso muda o que importa:

| Momento | O que dói | O que resolve |
|---|---|---|
| Primeiro acesso | SPA faz HTML → JS → API → render: **3+ idas e voltas** antes de aparecer conteúdo | **SSR** — uma ida e volta traz HTML já com dado |
| Cada navegação depois | SSR clássico volta ao servidor a cada clique: **+100 a 300 ms por navegação, o dia inteiro** | **Navegação no cliente** |
| Dado que já foi buscado | Buscar de novo em cada tela | **Cache persistente** |
| Conexão oscilando | Tela branca, erro | **Service Worker** |

Ou seja: **SSR ganha no primeiro acesso e perde no uso contínuo.** Uma SPA bem feita ganha no uso contínuo e perde no primeiro acesso. Escolher um dos dois é escolher qual metade do problema aceitar.

E vale dizer com franqueza: o problema da SPA anterior quase certamente **não foi o modelo SPA**. Os culpados de sempre são bundle único sem divisão por rota, dados carregados todos de uma vez, lista sem virtualização e cascata de requisições (componente monta → busca → filho monta → busca). Trocar para SSR sem corrigir esses quatro itens produz um app SSR pesado.

## Decisão

**React Router 7 em framework mode**, com SSR no navegador e `ssr: false` para o desktop — o mesmo código, dois alvos de build.

```
apps/web  ──┬── build SSR      → servidor Node leve na VPS (navegador)
            └── build ssr:false → index.html estático  → empacotado no Tauri
```

Por que React Router 7 especificamente:

- **Runtime de ~45 KB gzipped** — o mais leve dos três candidatos. TanStack Start entrega ~116 KB de JS de cliente e Next.js ~193 KB.
- **É o Remix**, absorvido para dentro do React Router. Anos de produção, milhões de apps. Não é aposta.
- **Loaders aninhados carregam em paralelo.** Este é o ganho mais subestimado em rede móvel: uma rota com três níveis busca os três dados ao mesmo tempo, não em cascata. Sozinho, isso corta centenas de milissegundos por navegação.
- **`<Link prefetch="intent">`** — o dado começa a chegar no `hover` ou no `touchstart`, antes de o clique terminar. Em 4G é a diferença entre "instantâneo" e "meio segundo".
- **SPA mode (`ssr: false`) é oficial e documentado** — gera o `index.html` no build. É o que resolve o Tauri sem uma segunda base de código.
- Vite por baixo, então o ambiente de desenvolvimento é o mesmo do resto do monorepo.

### TanStack Router sai. TanStack Query fica.

São duas coisas diferentes, e a distinção importa:

- **TanStack Router → removido.** O React Router 7 faz o papel dele, com SSR e mais maduro.
- **TanStack Query → mantido, e é o item mais importante para 4G.** Ele é o cache persistente, não o roteador. Sem ele, cada navegação volta à rede; com ele, a tela pinta na hora com o dado em memória e revalida em segundo plano.

O casamento dos dois é um padrão conhecido: o loader do React Router chama `queryClient.ensureQueryData()`, então o dado chega renderizado no servidor **e** entra no cache do cliente. A partir daí a navegação é local.

Ele também é o mesmo pacote usado no app móvel ([ADR-0008](0008-mobile-expo-react-native.md)), então `packages/api-client` continua servindo web, desktop e mobile sem adaptação.

*Se ainda assim houver resistência ao TanStack Query, o substituto é o SWR (~4 KB) — mais leve, menos recursos, sem persistência pronta. Mas alguma camada de cache é obrigatória; abrir mão dela é abrir mão do desempenho em 4G.*

### O resto da pilha

| Peça | Escolha | Papel |
|---|---|---|
| UI | Tailwind + shadcn/ui | Componentes copiados para o repo, sem runtime de biblioteca |
| Estado local | Zustand (~1 KB) | Rascunhos, painéis, seleção |
| Listas | TanStack Virtual | **Obrigatório** acima de 50 itens |
| Construtor de fluxo | React Flow | Carregado só na rota do construtor |
| Offline | Service Worker (Workbox) | Shell em cache, fila de envio |
| Transporte | HTTP/3 + Brotli via Cloudflare | QUIC sobrevive à troca de torre muito melhor que TCP |

## Alternativas consideradas

**TanStack Start.** Mesmo ecossistema, SSR, Vite, ~25% mais throughput de servidor que o React Router 7. Descartada por maturidade: ainda em Release Candidate. Para a base de um produto de 12 a 18 meses, o histórico de produção do React Router pesa mais que o ganho de throughput — que, aliás, não é o nosso gargalo.

**Next.js.** Descartado pelos motivos do [ADR-0006](0006-web-spa-vite-tanstack.md), agora reforçados pelo número: ~193 KB de JS de cliente contra ~45 KB, num requisito explícito de leveza em rede móvel. Server Actions continuam sem atravessar para Tauri e React Native.

**SvelteKit.** Esta foi a alternativa mais séria contra o requisito de leveza — runtime de 10–15 KB, SSR nativo, `adapter-static` para o Tauri, e o xyflow publica Svelte Flow, então o construtor de fluxo estaria coberto. Descartada por **custo de time, não por técnica**: o app móvel é React Native ([ADR-0008](0008-mobile-expo-react-native.md)), e adotar Svelte na web obrigaria o time a alternar entre dois paradigmas de componente todo dia. A diferença de ~30 KB gzipped é cerca de 40 ms numa única visita, e depois fica em cache para sempre — não é onde o desempenho em 4G se ganha ou se perde. O ganho real está no orçamento de bundle e no cache ([ADR-0017](0017-orcamento-de-performance.md)), que valem para qualquer framework.

**SPA pura (a decisão anterior).** Descartada: perde o primeiro acesso, que é justamente onde a percepção de "pesado" se forma.

**SSR clássico com navegação no servidor (HTMX, Turbo, Inertia).** Descartado com convicção: transforma **cada interação** numa ida e volta. É o pior modelo possível para um inbox usado o dia inteiro em 4G.

## Consequências

- **Passa a existir um processo Node servindo a web.** É o custo real desta decisão: mais um container na VPS, mais uma coisa para monitorar. Ele é leve e fica atrás do Cloudflare, mas não é mais "estático de graça".
- O desktop continua sem servidor: o build `ssr: false` empacota HTML estático no Tauri.
- O time precisa entender o modelo de loader/action do React Router. É simples, mas é um modelo — vale uma sessão de alinhamento na Fase 0.
- Ganhamos o melhor dos dois mundos, e é o desenho certo para o requisito: **SSR no primeiro acesso, navegação no cliente depois, cache por cima e Service Worker por baixo.**
- As regras que realmente entregam o desempenho prometido estão em [ADR-0017](0017-orcamento-de-performance.md), e são verificadas no CI. Sem elas, esta escolha de framework não garante nada.
