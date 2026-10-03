---
name: sumi-design-system
description: Aplica o sistema de design Sumi 墨 (papel e carvão, movimento orgânico) em qualquer interface — CRM, dashboard, app. Use quando o usuário pedir telas, componentes ou refatoração visual "no padrão Sumi", "como a Profitify", ou mencionar papel/carvão, squircle, morfismo, física orgânica.
---

# Skill: Sumi Design System

## O que você recebe
- `sumi.css`: tokens dos dois temas, escalas, física global, keyframes. **Fonte única de verdade visual.**
- `sumi.js`: o motor de movimento. Chame `Sumi.init()` uma vez; tudo funciona por atributos `data-*`.
- `tokens.json`: os mesmos valores em JSON (Figma, Tailwind, Style Dictionary).
- `receitas.md`: marcação pronta de cada componente. **Copie, não reinvente.**
- `AGENTS.md`: as regras invioláveis e o checklist.
- `README.md`: filosofia, princípios → tokens e API completa.
- `exemplo.html`: prova de que funciona fora do manual.

## Procedimento
1. **Instale**: copie a pasta `sumi/` para o projeto. Carregue `sumi.css` no `<head>` e `sumi.js` no fim do `<body>`, e chame `Sumi.init({ theme: 'papel' })`.
   - React/Next: importe o CSS no layout raiz e chame `Sumi.init()` num `useEffect` do layout. O motor observa o DOM, então não é preciso nenhum wrapper.
   - Vue/Nuxt: `onMounted(() => Sumi.init())` no App.
2. **Leia `AGENTS.md` inteiro** antes de escrever qualquer tela.
3. **Monte cada componente a partir de `receitas.md`**, trocando só o conteúdo. Mantenha atributos, tokens e estrutura.
4. **Estados**: todo componente de dado precisa de carregando, vazio, erro (com retry que morfa), parcial (kasure) e ao vivo.
5. **Camadas fixas** (modal, drawer, toast, painel) vão num portal no fim do `<body>`, nunca dentro de um elemento com `transform`.
6. **Valide**: os dois temas, teclado (Tab, Esc, Enter, setas), `prefers-reduced-motion` e o checklist do `AGENTS.md`.

## Nunca
- Valores literais de cor, sombra, raio, curva ou duração.
- Mais de um botão carvão por área. Botão quebrando linha.
- Mensagem ou estado que aparece "do nada": use `data-collapse` e `data-morph`.
- Sombras fora das quatro alturas (`--sh1`, `--e2`, `--e3`, `--deb`). Elas têm a mesma estrutura de 5 camadas para poderem se interpolar.
- Animações próprias que disputam com a física global. Se precisar, use `var(--ease)` e as durações do sistema.

## Personalizar para outro produto
Mude só `--shu` (o selo) e, se necessário, a ordem dos pigmentos `--v1…--v5`. Todo o resto é fixo.
