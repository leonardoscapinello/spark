# ADR-0023 — Construtor de páginas: árvore JSON, renderizador compartilhado, publicação estática

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O escopo cresceu: além de CRM, atendimento, automação e social, o Spark tem **páginas** — landing pages e formulários de captura, como o ActiveCampaign faz — e **produtos**, catálogo com variantes e preços.

Produtos é modelagem relacional comum e não precisa de ADR. **Páginas precisa**, porque tem uma característica que nenhum outro módulo tem: o resultado é consumido por **visitantes anônimos, em escala, com SEO importando**. É o oposto do resto do produto, que vive atrás de login.

Existe também um risco de repetição registrado: o `landingsuite` — a tentativa anterior nesse terreno — tinha **três frontends convivendo** (`studio`, `studio-ssr`, `web`), em Astro e Next, e nenhum deles dono da tela. Ver [`licoes-do-twenty.md`](../arquitetura/licoes-do-twenty.md).

## Decisão

**A página é uma árvore JSON versionada. Um único renderizador a transforma em HTML. A publicação gera estático.**

### O modelo

```
pages            (id, org_id, slug, dominio_id, status, versao_publicada_id)
page_versions    (id, page_id, versao, arvore jsonb)   ← IMUTÁVEL
page_domains     (id, org_id, host, certificado, verificado_em)
page_submissions (id, page_id, form_id, contact_id, dados jsonb, em)
```

`page_versions.arvore` é **imutável**, exatamente como `automation_versions` ([ADR-0009](0009-motor-de-automacao.md)). Publicar cria versão nova; reverter é apontar para uma anterior. Teste A/B é publicar duas versões com peso.

Armazenamento: **JSONB no mesmo Postgres** ([ADR-0022](0022-um-so-banco-postgres.md)). Árvore de blocos é o caso de uso canônico de documento — e continua sincronizando para o editor via Electric, como qualquer outro dado.

### `packages/blocks` — uma definição, dois consumidores

Este é o ponto que sustenta a decisão:

```
packages/blocks/
├── schema/      Zod por bloco: props, defaults, validação
├── render/      bloco → HTML (puro, sem DOM)
└── editor/      metadata do editor: rótulo, ícone, controles
```

O **mesmo** `render/` é usado em dois lugares:

1. **No editor**, para o preview — o que o usuário vê enquanto edita.
2. **No worker**, na publicação — para gerar o HTML final.

Isso elimina por construção a divergência clássica de construtor de página: *"no editor estava certo, publicado saiu diferente"*. Não pode sair diferente — é a mesma função.

Adicionar um bloco novo é criar um arquivo em `packages/blocks`. Editor e renderizador ganham o bloco juntos, sem código em nenhum dos dois.

### Publicação: renderiza uma vez, serve estático

```
publicar → worker renderiza a árvore → HTML + CSS crítico inline
        → grava no R2
        → Cloudflare serve do edge
```

**Nenhum servidor no caminho do visitante.** TTFB de CDN, custo próximo de zero por visita, SEO perfeito, e um pico de tráfego numa campanha não toca a VPS nem o Postgres.

O que é dinâmico na página resolve no cliente, com JS mínimo:

| Necessidade | Como |
|---|---|
| Envio de formulário | `POST` na API, com token anti-abuso |
| Teste A/B | Sorteio no edge (Cloudflare Worker), cookie de afinidade |
| Tracking de visita | Beacon para o módulo `events` |
| Conteúdo personalizado | Fora do escopo inicial — exigiria render dinâmico |

Orçamento de página publicada: **≤ 30 KB de JS**, ≤ 100 KB total sem imagem. Verificado no CI, como o resto ([ADR-0017](0017-orcamento-de-performance.md)).

### O ciclo que fecha o produto

É aqui que a unificação aparece — e é o que nenhuma das quatro ferramentas de referência faz sozinha:

```
página publicada → formulário enviado → identidade resolvida em contacts
   → evento na timeline → automação disparada → mensagem no WhatsApp
   → conversa no inbox → negócio no pipeline → produto do catálogo na cotação
```

Uma transação, um banco, uma linha do tempo.

## Alternativas consideradas

**Um app separado para páginas** (o caminho do `landingsuite`, com três frontends). Descartado com evidência: multiplica pipeline de build, modelo mental e superfície de manutenção, e nenhum deles fica dono da tela. **O editor é uma rota do app principal.** Só o *runtime publicado* é separado — e ele nem é um app, é HTML estático.

**HTML puro guardado no banco** (editor gera HTML e salva). Descartado: perde a estrutura. Sem árvore não há re-render com tema novo, não há troca de bloco em massa, não há migração de template, não há edição estruturada.

**Astro para renderizar as páginas publicadas.** Considerado — é ótimo em conteúdo estático. Descartado porque exigiria um pipeline de build por publicação e um segundo modelo de componente ao lado de `packages/blocks`. Renderizar a árvore para HTML no worker é mais direto e reaproveita o renderizador que já precisa existir para o preview.

**SSR das páginas na VPS.** Descartado: coloca servidor no caminho do visitante anônimo, que é o tráfego mais volumoso e menos previsível do sistema. Pico de campanha não pode ameaçar o inbox.

**Adotar um construtor pronto** (GrapesJS, Puck, Craft.js). Considerados como referência de implementação. Descartados como dependência: trazem modelo de dado e modelo de componente próprios, incompatíveis com `packages/blocks` e com o design system ([ADR-0020](0020-design-system-proprio.md)). Ler o código deles é recomendado; adotar não.

## Consequências

- `packages/blocks` entra na lista dos pacotes críticos, ao lado de `core`, `tokens` e `data`. Mesma exigência de revisão.
- O renderizador precisa ser **puro** — sem DOM, sem `window` — porque roda no worker. Isso é uma restrição de escrita, e é boa: torna cada bloco testável isoladamente.
- Domínio customizado exige verificação de DNS e emissão de certificado. É trabalho de infraestrutura real, com prazo — planejar junto do módulo, não depois.
- Página publicada precisa de invalidação de cache no Cloudflare a cada publicação.
- O módulo `pages` pode entrar cedo no roadmap: depende de `contacts`, `forms` e do design system — não do motor de automação.
- Ganhamos o ciclo completo de aquisição dentro do próprio sistema, sem integração externa entre página e CRM.
