# ADR-0020 — Design system próprio: nenhum componente nativo do navegador

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

A exigência: *"nenhum componente pode ser nativo do navegador — é tudo nosso, porque a gente vai dominar todo o design system. Todos os campos têm que ser iguais, todos os campos têm que fornecer recursos extremamente adequados. Se a gente alterar o estilo de um, altera de todos."*

Está certo, e o motivo é mais profundo que estética. Um `<select>` nativo não pode ser estilizado de forma consistente entre sistemas operacionais, não faz busca, não faz seleção múltipla, não carrega sob demanda e não tem estado de carregamento. Um `<input>` nativo não tem máscara, não tem validação integrada ao schema, não tem estado de erro padronizado.

Só que existe uma armadilha do outro lado: reconstruir do zero significa reimplementar **navegação por teclado, gestão de foco, semântica ARIA, suporte a RTL, posicionamento com detecção de colisão e comportamento controlado/não-controlado**. Isso é onde bibliotecas caseiras morrem — e onde acessibilidade quebra em silêncio.

A resposta do mercado em 2026 resolve os dois lados: **primitivos headless**. Eles entregam comportamento e acessibilidade, e não entregam **nenhum** estilo.

## Decisão

**`packages/ui-web` é o único lugar do repositório onde um elemento HTML de formulário pode ser escrito.** O restante da aplicação importa componentes nossos, sempre.

### Camada de primitivos: Base UI

- v1.0 estável desde dezembro de 2025, com 35 componentes e engenharia da MUI em tempo integral.
- Feita **pelos criadores do Radix, do Floating UI e do Material UI** — é o Radix com as lições do Radix aplicadas.
- Desde julho de 2026, é o padrão do shadcn/ui em projetos novos.
- O Radix segue funcionando, mas foi adquirido pela WorkOS e a velocidade de atualização caiu em componentes complexos — combobox e multi-select justamente, que são os que mais usamos num CRM.

**React Aria (Adobe)** entra só onde o Base UI tem lacuna: seletor de data e hora com reconhecimento de locale, e casos de leitor de tela mais difíceis. É a biblioteca mais completa em acessibilidade e internacionalização, e vale o peso nesses pontos específicos.

### Tokens: DTCG como fonte única, Style Dictionary como compilador

```
packages/tokens/*.tokens.json      (formato DTCG, estável desde 2025.10)
        │
        └── Style Dictionary v4
              ├──→ CSS variables  → Tailwind v4 @theme  → web e desktop
              ├──→ objeto JS      → ui-native           → iOS e Android
              └──→ Figma          → design
```

**Isto é o "muda um, muda todos" — nas quatro plataformas.** Cor, espaçamento, raio, tipografia, sombra e duração de animação existem uma vez, em JSON, e são compilados para o que cada plataforma consome. Nenhum valor literal em componente.

Três camadas de token, e a regra que as governa:

| Camada | Exemplo | Quem usa |
|---|---|---|
| Primitivo | `teal.600`, `space.4` | Só a camada semântica |
| Semântico | `color.action.primary`, `space.field.inset` | Componentes |
| Componente | `button.primary.bg` | O componente dono |

**Componente nunca referencia primitivo direto.** É o que permite trocar a paleta inteira sem tocar em componente.

### Identidade visual

A direção é **liquid glass**, aplicada por camada e não por superfície — conteúdo sólido, navegação flutuante em vidro. A paleta, a receita do vidro e as regras de performance estão em [ADR-0025](0025-identidade-visual-liquid-glass.md). O primitivo `<Glass>` é o **único** lugar que escreve `backdrop-filter`.

### Estilo

**Tailwind v4** na web e no desktop — desde a v4 ele é CSS-first e expõe tudo como variável CSS nativa, o que casa exatamente com a saída do Style Dictionary. No mobile, os mesmos tokens viram um tema em objeto JS.

### O contrato de todo componente de formulário

Nenhum campo entra em `ui-web` sem **todos** os itens abaixo. É a definição de "recurso extremamente adequado":

| Requisito | Detalhe |
|---|---|
| Estados | repouso, foco, hover, desabilitado, somente-leitura, carregando, erro, sucesso |
| Rótulo e descrição | associados por `id`, sempre |
| Erro | vem do schema Zod de [`core`](0019-nucleo-compartilhado.md), nunca escrito no componente |
| Teclado | navegável e operável por completo, sem mouse |
| Leitor de tela | `aria-invalid`, `aria-describedby`, papel e estado corretos |
| Tamanhos | `sm`, `md`, `lg` — de token, não de valor literal |
| Foco visível | obrigatório, e não removível por prop |
| `prefers-reduced-motion` | respeitado |
| Área de toque | mínimo 44×44 px no mobile |
| Storybook | uma história por estado |
| Teste | interação e acessibilidade, automatizados |

### Verificado por lint

```
proibido em apps/**:  <input> <select> <textarea> <button>
                      <form> <dialog> <a> com href interno
permitido apenas em:  packages/ui-web/**
```

O CI reprova a PR. Não é convenção — é regra.

### Inventário mínimo antes da Fase 1

`Button` · `Input` · `Textarea` · `Select` · `Combobox` · `MultiSelect` · `Checkbox` · `Radio` · `Switch` · `DatePicker` · `DateRangePicker` · `NumberInput` · `MoneyInput` · `PhoneInput` · `DocumentInput` (CPF/CNPJ) · `FileInput` · `Form` · `Field` · `Label` · `ErrorText`

`MoneyInput` e `DocumentInput` falam com os tipos marcados de [`core`](0019-nucleo-compartilhado.md): o campo devolve `Money` e `CPF`, não `string`.

## Alternativas consideradas

**Radix UI.** O que popularizou a categoria, e ainda tem uso enorme via shadcn/ui. Descartado como camada nova: velocidade de manutenção caiu depois da aquisição, justamente em combobox e multi-select.

**React Aria como base de tudo.** A mais completa em acessibilidade. Descartada como camada principal por peso de bundle e por uma API mais verbosa em componentes simples — mas adotada seletivamente onde é insubstituível.

**MUI, Chakra, Ant Design.** Descartadas: trazem opinião visual e um runtime de estilo próprio. Sobrescrever design de terceiro é mais caro que construir sobre headless, e é o oposto de dominar o design system.

**shadcn/ui como base.** Não é uma biblioteca — é código copiado para o repositório, sobre primitivos. **Vamos usá-lo como referência de implementação**, mas os componentes são nossos, com nossa API e nossos tokens. Copiar sem revisar traria decisões de API que não são nossas.

**Construir os primitivos do zero.** Descartado. Gestão de foco, navegação por teclado e semântica ARIA levam anos para acertar, quebram em silêncio, e não é onde está o diferencial do Spark.

## Consequências

- Construir o design system é trabalho real na Fase 0 e Fase 1 — estimar 3 a 4 semanas de um dev para o inventário mínimo. É investimento, não atraso: sem ele, cada tela reinventa o campo de texto.
- Storybook vira infraestrutura de primeira classe, com teste de acessibilidade automatizado.
- Duas implementações de UI (web e nativa), **um sistema de tokens**. A duplicação é de componente, nunca de decisão de design.
- O lint vai incomodar quem quiser resolver rápido com um `<button>`. É exatamente o atrito desejado.
- Ganhamos o que foi pedido: mudar o estilo de um campo muda todos, em web, desktop, iOS e Android, a partir de um arquivo JSON.
