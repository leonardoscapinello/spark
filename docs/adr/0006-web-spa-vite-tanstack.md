# ADR-0006 — Web como SPA (Vite + React 19 + TanStack) — não Astro, não Next.js

**Status:** Substituído por [ADR-0015](0015-web-react-router-7-ssr.md)
**Data:** 2026-09-10

## Contexto

A pergunta inicial foi "Nest com Astro?". Vale responder com precisão, porque a resposta define a viabilidade de desktop e mobile.

O Spark é um **app atrás de login**, usado por horas seguidas, sem nenhuma superfície indexável pelo Google. A tela mais importante é um inbox: lista de conversas à esquerda, thread no centro, ficha do contato à direita, tudo atualizando em tempo real, com estado de rascunho que precisa sobreviver à navegação.

Além disso, [ADR-0007](0007-desktop-tauri.md) e [ADR-0008](0008-mobile-expo-react-native.md) exigem que a mesma aplicação rode empacotada em desktop e ao lado de um app nativo. **Todo framework que assume um servidor Node no meio do caminho complica esses dois alvos.**

## Decisão

**`apps/web` é uma SPA: Vite 7 + React 19 + TanStack Router + TanStack Query + Tailwind + shadcn/ui.**

- **TanStack Router** — roteamento com tipos de verdade: params, search params e loaders todos tipados. Os *search params* tipados importam muito aqui: filtros de pipeline, de segmento e de inbox viram URL compartilhável, e é isso que faz o "manda o link desse filtro pra mim" funcionar.
- **TanStack Query** — cache de servidor, invalidação, atualização otimista. **O mesmo pacote roda em React Native**, então `packages/api-client` serve web, desktop e mobile sem adaptação.
- **Zustand** para o pouco de estado de cliente que sobra (rascunhos, painéis, seleção múltipla).
- **React Flow (xyflow)** para os construtores visuais de automação e de fluxo de chatbot.
- **TanStack Virtual** — obrigatório em toda lista de conversa, contato e evento. Sem virtualização, o inbox morre em 5 mil registros.
- Build gera **estático puro**. Servido pelo Cloudflare Pages (gratuito, CDN global) ou por nginx na VPS. Sem processo Node servindo HTML.

**Astro fica em `apps/site`** — o site público, blog, documentação, páginas de captura. É exatamente o trabalho para o qual o Astro é o melhor da categoria: HTML estático, zero JS por padrão, ilhas onde precisar. Ele só não é a ferramenta certa para o app.

## Alternativas consideradas

**Astro para o app.** Descartado. O modelo de ilhas é ótimo para conteúdo majoritariamente estático com interatividade pontual, e é o oposto do nosso perfil: interatividade contínua com estado persistente entre rotas. Forçaríamos o Astro a ser um SPA ruim.

**Next.js (App Router).** A escolha "mainstream". Descartada por três razões concretas:
1. SSR e RSC não entregam nada quando 100% das telas exigem login e nenhuma precisa de SEO — pagamos a complexidade sem receber o benefício.
2. Exige um servidor Node em produção. Na Vercel isso escala em custo rápido; na VPS vira mais um processo para operar. A SPA estática custa zero.
3. **Server Actions e RSC não atravessam para Tauri nem para React Native.** Adotá-los criaria uma camada de acesso a dados que só existe na web, quebrando a premissa de código compartilhado de [ADR-0004](0004-contrato-openapi-primeiro.md).

Next.js seria a escolha certa se o produto fosse voltado ao público e dependesse de SEO. Não é.

**TanStack Start.** Mesmo ecossistema, com SSR. Descartado pelo mesmo motivo do Next: não precisamos de SSR, e ele traria de volta a dependência de servidor.

**React Native Web / Tamagui para unificar web e mobile numa só UI.** Tentador — uma base de UI para tudo. Descartado: a web precisa de grades de dados densas, atalhos de teclado, seleção múltipla, arrastar-e-soltar de pipeline, menus de contexto e janelas múltiplas. O mobile precisa de gestos, navegação nativa e listas performáticas. Forçar uma UI só produz um produto medíocre nos dois lados. **Compartilhamos tudo abaixo da UI, não a UI.**

## Consequências

- O primeiro carregamento é maior que o de um app com SSR. Mitigado com code splitting por rota e prefetch nos loaders do Router — e irrelevante num app que o usuário deixa aberto o dia inteiro.
- Sem SEO em `apps/web`. É intencional. O SEO mora em `apps/site`.
- O mesmo bundle vira o app de desktop sem nenhuma adaptação ([ADR-0007](0007-desktop-tauri.md)). Esse é o ganho estratégico da decisão.
- Precisamos de disciplina de bundle desde o começo: orçamento de tamanho no CI, e nada de importar uma biblioteca de 300 kB para formatar data.
