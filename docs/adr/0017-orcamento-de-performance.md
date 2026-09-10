# ADR-0017 — Orçamento de performance e contrato de rede móvel

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O requisito é explícito: **o time vai usar o Spark em 4G e 5G, fora do escritório, e o sistema é grande.** Rápido, leve, altamente compatível.

Escolher framework não entrega isso. Todo app começa leve; ele engorda uma dependência por vez, ao longo de meses, e ninguém percebe o dia em que ficou pesado. A escolha do React Router 7 ([ADR-0015](0015-web-react-router-7-ssr.md)) remove o piso do problema, não o teto.

Este ADR transforma "tem que ser rápido" em **números que o CI verifica**. Se o orçamento estourar, a PR não passa. É a única forma de o requisito sobreviver a 18 meses de desenvolvimento.

## Decisão

### Orçamento de bundle — o CI falha se estourar

| Item | Teto (gzip) |
|---|---|
| Shell inicial (login + layout + roteador) | **120 KB** |
| Qualquer rota individual, carregada sob demanda | **60 KB** |
| Total baixado até o inbox utilizável, primeira visita | **350 KB** |
| Qualquer dependência isolada | **40 KB** — acima disso exige justificativa na PR |

Verificado com `size-limit` a cada PR. **Toda rota é `lazy` por padrão** — o construtor de fluxo, os relatórios e o editor de e-mail nunca entram no bundle de quem só abre o inbox.

### Métricas de campo, em 4G lento simulado (400 ms RTT, 1,6 Mbps)

Com a arquitetura local-first ([ADR-0018](0018-arquitetura-local-first.md)), a leitura sai do caminho da rede. **A meta deixa de ser 1 segundo e passa a ser um frame** — 1 segundo vira o pior caso, em dispositivo novo.

| Métrica | Alvo |
|---|---|
| Navegação para tela já sincronizada | **≤ 16 ms** — um frame, sem rede |
| Query local sobre 100 mil registros | **≤ 1 ms** — differential dataflow |
| Escrita otimista — retorno visual | **≤ 16 ms** |
| Primeira carga, dispositivo já conhecido | **≤ 500 ms** |
| Primeira carga, dispositivo novo, 4G lento (LCP) | **≤ 2,5 s** |
| Sincronização inicial completa, 4G | **≤ 10 s**, com a interface utilizável desde o início |
| INP | **≤ 200 ms** |

### Orçamento de dado sincronizado

Local-first não significa baixar tudo. Este orçamento é tão obrigatório quanto o de bundle:

| Item | Teto |
|---|---|
| Dado sincronizado por usuário | **50 MB** |
| Registros por coleção sincronizada | **50 mil** |
| Coleções sincronizadas simultâneas | **12** |

Estourou, o recorte (*shape*) está errado — a correção é ajustar o shape, nunca aumentar o teto.

Lighthouse CI em preset mobile roda no pipeline. Regressão reprova a PR.

### Regras de dado — onde o desempenho em 4G realmente se ganha

0. **Leitura não vai à rede.** Toda tela de trabalho lê de coleção local ([ADR-0018](0018-arquitetura-local-first.md)). Chamada de rede na renderização de tela sincronizada é bug de arquitetura, não de performance.
1. **Nenhuma resposta de lista sem paginação** — nas coleções sob demanda. Teto de 50 itens por página.
2. **Toda lista acima de 50 itens é virtualizada.** `TanStack Virtual`, obrigatório.
3. **Zero cascata de requisições.** Loaders aninhados do React Router carregam em paralelo; um componente que busca dado no `useEffect` para depois montar um filho que busca outro é um bug de performance, não um estilo.
4. **Cache primeiro, revalidação depois.** `staleTime` explícito por tipo de dado; a tela pinta com o que está em memória e atualiza em segundo plano.
5. **Escrita é otimista.** Mandar mensagem, mover negócio e criar nota respondem na hora e reconciliam depois.
6. **Prefetch na intenção.** `<Link prefetch="intent">` no que for navegação previsível.
7. **Campo pedido é campo devolvido.** A API não devolve objeto inteiro quando a tela mostra três campos.

### Orçamento de vidro

`backdrop-filter` custa 4–8 ms por frame de composição e ~15–25% de GPU a mais que superfície opaca ([ADR-0025](0025-identidade-visual-liquid-glass.md)):

| Regra | Teto |
|---|---|
| Superfícies de vidro visíveis ao mesmo tempo | **3** |
| Vidro dentro de container que rola | **zero — proibido** |
| Animar `blur` ou `scale` de mapa de deslocamento | **proibido** |
| FPS em Android de gama média, com a interface em uso | **≥ 55** |

Vidro é a única parte do sistema que pode passar no desktop e falhar no celular. Teste em aparelho real entra na esteira.

### Camada de rede

- **HTTP/3 (QUIC) e Brotli** via Cloudflare na frente de tudo. QUIC importa de verdade em rede móvel: sobrevive à troca de torre sem reabrir conexão e se recupera muito melhor de perda de pacote que o TCP.
- **Service Worker (Workbox)** desde a Fase 1 — shell em cache, fila de envio para escrita feita sem sinal, e uma tela de degradação honesta em vez de erro.
- **Imagem e mídia** sempre por CDN, com tamanho responsivo e AVIF/WebP.

### Compatibilidade

- Alvo de build: **Baseline Widely Available**. Nada de API de navegador com menos de 30 meses de disponibilidade sem *polyfill* medido.
- Suporte real testado: Chrome, Safari, Firefox e Edge nas duas últimas versões maiores; Safari iOS e Chrome Android nas duas últimas.
- **Sem WebGL, sem WASM, sem fonte variável pesada** no caminho crítico.

### O ritual que mantém isso vivo

- **Revisão mensal de bundle** — 30 minutos, olhando o relatório do `size-limit`. É a única coisa que impede a erosão lenta.
- Toda PR que adiciona dependência acima de 40 KB precisa responder três perguntas no corpo: dá para fazer sem? dá para carregar sob demanda? tem alternativa menor?

## Alternativas consideradas

**Confiar no framework.** Descartado — é exatamente assim que os dois projetos anteriores ficaram pesados ([diagnóstico](../arquitetura/licoes-do-twenty.md)). Framework define o piso; disciplina define o teto.

**Mirar 1 segundo.** Descartado como meta, mantido como pior caso. Uma meta de 1 s permite que a rede fique no caminho da leitura — e aí 1 s é um teto que se encosta a cada pico de latência. Mirando 16 ms, 1 s vira folga.

**Medir só em rede rápida.** Descartado: em Wi-Fi de escritório tudo parece rápido, e é por isso que problemas de rede móvel chegam a produção.

**Orçamento como recomendação, não como bloqueio.** Descartado. Orçamento que não reprova PR é decoração; em três meses ninguém olha.

## Consequências

- Algumas PRs vão ser reprovadas por peso. É o objetivo, e vai gerar atrito — o atrito é o mecanismo funcionando.
- Escolher biblioteca passa a considerar tamanho junto com recurso. Isso é bom e vai doer algumas vezes.
- Service Worker precisa entrar na Fase 1, não depois. Adicionar cache offline num app pronto é muito mais difícil que nascer com ele.
- Ganhamos um critério objetivo para "está pesado?" — uma pergunta que hoje só tem resposta por opinião.
