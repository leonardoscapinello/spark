# AGENTS.md: como aplicar o Sumi em qualquer código

Você (IA ou dev) vai implementar telas num produto que usa o **Sumi**. Siga estas regras literalmente. Se uma decisão não estiver aqui, consulte `README.md` e o manual vivo (`Sumi Design System.dc.html`).

## 1. Setup (obrigatório)
1. Carregue `sumi.css` e `sumi.js` e chame `Sumi.init()` uma vez no boot do app.
2. Tema: `<html data-sumi-theme="papel">` ou `"carvao"`. Troque com `Sumi.setTheme()`.
3. Fonte: Geist (UI) e Geist Mono (números tabulares, IDs, tokens).
4. **Nunca** escreva cor, sombra, raio, curva ou duração literais. Use os tokens (`var(--tx)`, `var(--sh1)`, `var(--ease)`…).

## 2. Regras que não se quebram
- **Controles = pílula** (`border-radius: var(--r-pill)`). **Superfícies = squircle** (`--r-*` + `corner-shape: squircle`).
- **Um carvão por área**: só a ação principal usa `background: var(--ac); color: var(--acf); box-shadow: var(--ink)` + `data-press="ink"`. O resto é folha (`data-press="sheet"`) ou tinta (`data-press="ghost"`).
- **Botões nunca quebram linha.** O texto vai dentro de `<span data-lbl><span>Rótulo</span></span>`.
- **Campos são cavados**: `background: var(--sf2); box-shadow: var(--deb)`, altura 40, pílula, rótulo 12/500 a 6px acima.
- **Superfícies**: `background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1)`.
- **Sombra só nas 4 alturas**: `--sh1`, `--e2`, `--e3`, `--deb`. Não invente outras.
- **Cor só quando significa**: estados (`--ok --er --wa --in`) sempre em par com o fundo suave (`--oks`…). O selo `--shu` aparece no máximo uma vez por tela.
- **Números**: pt-BR (R$ 1.250,00 · 4,82x · 12,4%), em Geist Mono quando tabulares. Todo KPI usa `data-odo`.
- **Gráficos**: série principal em `--v0` (tinta) e comparação em `--v5` tracejado. Projeção sempre tracejada (kasure).

## 3. Movimento (já vem pronto, não reimplemente)
- A física global já anima cor, sombra, transform e opacidade em 550ms Respiro. **Não** adicione `transition` próprio, a não ser para `width`/`left`/`d`.
- Bloco que troca de estado (idle → loading → ok/erro): coloque `data-morph` no contêiner.
- Mensagem condicional (erro inline, ajuda): use `data-collapse data-open="{bool}"` em vez de renderizar ou remover.
- Abas, segmentados, paginação e item ativo de menu: `data-slide` + `<span data-ind>` + `data-on="{ativo}"` em cada opção. O fundo do item ativo fica **transparente**: quem pinta é o indicador.
- Popovers e dropdowns: `data-pop` no painel e `data-pop-trigger` no gatilho. Feche no evento `sumi:close`. Abra com `animation: sumiPop .38s var(--ease)` e, sem espaço embaixo, com `sumiPopUp` acima.
- Modais e drawers: véu `var(--veil)` com fade, e 4 camadas de `backdrop-filter` progressivas (2/6/14/28px) com máscara radial animadas com `sumiBlurIn`. Painel entra com `sumiRise .62s` e sai com `sumiSink .28s`.
- Camadas `position: fixed` (modal, toast, drawer, painel) ficam **fora** de qualquer elemento com transform (renderize no fim do `<body>` ou num portal).
- Arrastar e soltar: o elemento arrastado recebe `data-instant` e é movido via `transform` em requestAnimationFrame. Ao soltar, chame `Sumi.land(el, origem)`.

## 4. Estados obrigatórios de todo componente de dado
carregando (esqueleto ou ensō) · vazio (com ação) · erro (com "Tentar de novo" que morfa) · parcial ou projetado (kasure) · ao vivo (pulso apenas enquanto estiver ao vivo).

## 5. Acessibilidade
Contraste do texto ≥ 4,5:1 (o terciário só em texto auxiliar). Foco visível (halo `--ring` 3px). Alvo ≥ 36px no desktop e 44px no toque. Botão só com ícone leva `aria-label`. Toda ação de arrastar tem alternativa por menu ou teclado. Popover fecha com Esc.

## 6. Checklist antes de entregar
- [ ] Nenhuma cor, sombra ou duração literal
- [ ] Nenhum botão quebra linha; um carvão por área
- [ ] Toda troca de estado morfa; nenhuma mensagem surge do nada
- [ ] Popovers fecham ao clicar fora, com saída animada
- [ ] Os dois temas conferidos
- [ ] A verificação da página **Garantia** do manual passa
