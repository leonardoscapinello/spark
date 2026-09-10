# ADR-0018 — Arquitetura local-first: TanStack DB + Electric

**Status:** Aceito
**Data:** 2026-09-10
**Substitui:** [ADR-0012](0012-offline-first-powersync.md)

## Contexto

A meta declarada é **toda tela carregando em 1 segundo**, num sistema que vai crescer muito, sem acumular dívida técnica.

Otimizar framework não chega lá. A conta é simples e implacável:

```
4G:  ida e volta de rede          =  50–300 ms
     + tempo de query no servidor =  10–100 ms
     + serialização e parse       =   5– 50 ms
     ─────────────────────────────────────────
     piso teórico por navegação   =  65–450 ms
```

E isso é o **piso**, com tudo perfeito. Com um filtro complexo, uma lista grande ou um pico de latência, passa fácil de 1 segundo. Enquanto a rede estiver no caminho da leitura, 1 segundo é um teto que se encosta, não uma folga.

### O que o topo do mercado faz

A empresa mais citada como referência de velocidade em software de trabalho é a Linear, e a diferença é medida:

> Queries de API do Linear ficam em torno de **47 ms**; as operações equivalentes no Jira, em torno de **3.200 ms**. Isso é diferença de arquitetura, não de otimização.

O que a Linear fez foi **tirar a rede do caminho da leitura**. O banco vive no cliente (IndexedDB), toda leitura e toda escrita acontecem localmente, e a sincronização com o servidor roda em segundo plano. A navegação não espera rede porque **não há rede para esperar**.

2026 é o ano em que isso deixou de ser artesanal. O padrão tem nome — *sync engine* — e tem implementações maduras.

## Decisão

**O Spark é local-first: TanStack DB como camada de dados do cliente, ElectricSQL como motor de sincronização com o Postgres.**

```
Postgres (Supabase)
   │  replicação lógica
   ▼
Electric  ──── shapes (recortes por org e por usuário)
   │
   ▼
TanStack DB  ──── coleções reativas + differential dataflow
   │
   ├── apps/web       (browser · IndexedDB/OPFS)
   ├── apps/desktop   (Tauri · SQLite)
   └── apps/mobile    (Expo · SQLite)
```

### Por que TanStack DB é a peça central

**Ele é a mesma camada de dados nas quatro plataformas.** A partir da versão 0.6, tem persistência em SQLite no browser, Node, React Native, Expo, Capacitor e edge. Uma definição de coleção, uma linguagem de query, um modelo de escrita otimista — em web, desktop, iOS e Android.

Isso não é conveniência: é a exigência de centralização deste projeto aplicada à camada mais crítica.

**As queries são incrementais, não recalculadas.** Por baixo roda o `d2ts`, uma implementação de *differential dataflow* em TypeScript: quando um dado muda, só a parte afetada do resultado é recomputada. O número medido pelo time: **atualizar uma linha numa coleção ordenada de 100 mil itens leva ~0,7 ms.**

Isso responde a meta com folga de três ordens de grandeza. Não estamos mirando 1 segundo — estamos mirando **um frame**.

**As coleções aceitam qualquer origem.** Electric, PowerSync, REST, GraphQL, adaptador próprio. Então a decisão de transporte fica reversível: TanStack DB é a abstração, Electric é o transporte de hoje.

### Por que Electric como transporte

- Sincroniza direto do Postgres por **replicação lógica**, sem intermediário e sem reescrever o banco.
- **Shapes**: recortes parciais do banco. Num sistema multi-tenant isso é obrigatório — ninguém sincroniza o banco inteiro; cada usuário recebe o recorte da sua organização e do seu escopo.
- É Postgres puro. Nada de banco proprietário no meio.
- Parceria oficial e integração de primeira classe com o TanStack DB.

### O que sincroniza e o que não sincroniza

Local-first **não significa baixar tudo**. A regra:

| Dado | Estratégia |
|---|---|
| Contatos, negócios, pipelines, atividades, conversas recentes, tags, campos customizados, usuários, times | **Sincronizado** — leitura local, ~0 ms |
| Histórico de mensagens antigo, eventos além de 90 dias, relatórios, biblioteca de mídia | **Sob demanda** — coleção alimentada por REST |
| Métricas agregadas, exportações, dados de outra organização | **Nunca no cliente** |

O volume sincronizado por usuário precisa caber confortavelmente em memória e em disco local. **Isso é um orçamento, e ele entra em [ADR-0017](0017-orcamento-de-performance.md):** teto de 50 MB por usuário sincronizado. Passou disso, o recorte está errado.

### A consequência que amarra tudo

Numa arquitetura local-first, a escrita otimista acontece **no cliente**, e o servidor confirma depois. Se o cálculo de desconto, a regra de score ou a validação de um lead derem resultados diferentes nos dois lados, a tela pisca e o usuário perde a confiança.

Ou seja: **o núcleo compartilhado de regras deixa de ser boa prática e vira exigência da arquitetura.** É o assunto do [ADR-0019](0019-nucleo-compartilhado.md), e o local-first é o que o torna obrigatório.

## Alternativas consideradas

**Zero (Rocicorp).** Chegou à 1.0 estável em junho de 2026, tem a melhor experiência de desenvolvimento web da categoria e a ZQL é elegante. Descartada por dois motivos concretos: **suporte offline está declarado fora de escopo por ora**, e o foco é web (React e Solid) — não há história de React Native comparável. Como o Spark tem quatro alvos, adotá-lo significaria uma segunda camada de dados no mobile. Reavaliar em 12 meses.

**PowerSync sozinho** (a decisão do ADR-0012). É a opção mais robusta em offline e a mais adotada por empresa. Descartada como camada principal porque resolve transporte e armazenamento, não a **camada de query reativa** — e porque o SDK difere por plataforma. Continua relevante: o TanStack DB aceita PowerSync como origem de coleção, então se o offline do mobile exigir mais robustez, trocamos o transporte sem tocar na aplicação.

**Convex.** Banco reativo com queries em TypeScript rodando dentro do banco. Descartado: substituiria o Postgres, e com ele a replicação lógica, as extensões, o Supabase e todo o resto da arquitetura. Acoplamento grande demais para o núcleo do produto.

**Sync engine próprio** (o caminho da Linear). Descartado. A Linear chegou a US$ 35 milhões de ARR com 3 engenheiros fazendo essa aposta — mas fez dela o produto. Para nós, ordenação de operações, resolução de conflito e migração de schema local seriam meses de trabalho no lugar mais difícil possível de acertar.

**Continuar com cache de request (TanStack Query puro).** É o desenho anterior. Descartado: cache de request reduz idas à rede, mas não elimina a rede do caminho — a primeira visita a cada tela continua custando um round-trip.

## Consequências

- **O papel do backend muda.** Ele deixa de ser o caminho de leitura da maior parte das telas e passa a ser: escrita, autorização, webhooks, motor de automação, integrações e trabalho de fundo. Isso simplifica o [ADR-0003](0003-backend-nestjs-fastify.md), não o invalida.
- **A escolha de framework de front perde importância.** Quem entrega a velocidade agora é a camada de dados. O [ADR-0015](0015-web-react-router-7-ssr.md) continua válido, mas por motivos menores — e o SSR passa a servir só a primeira visita em dispositivo novo.
- **Replicação lógica vira requisito duro do banco.** Confirmar no Supabase antes da Fase 0.
- **Autorização precisa existir em dois lugares.** O shape do Electric define o que o cliente pode receber; a RLS e a camada de aplicação definem o que ele pode gravar. Um shape mal definido é vazamento de dado entre organizações — é o risco de segurança número um desta arquitetura, e merece revisão dedicada.
- **Migração de schema fica mais delicada:** o schema muda no servidor e nos clientes que já têm dado local. Toda migration precisa ser compatível com a versão anterior (expand/contract), e isso passa a valer para o cliente também.
- As decisões de schema do [ADR-0012](0012-offline-first-powersync.md) continuam obrigatórias e agora com mais força: **UUID v7, `updated_at` em tudo, exclusão lógica.**
