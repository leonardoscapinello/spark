# ADR-0045 — Tela só faz layout; aparência é do componente

**Status:** Aceito
**Data:** 2026-10-02
**Complementa:** ADR-0020 (design system próprio) e ADR-0044 (identidade fiel).

## Contexto

O usuário corrigiu o mesmo elemento várias vezes e viu a correção não chegar ao resto do sistema: o botão do atendimento diferente do botão da ficha; o campo da ficha de negócio diferente do campo do perfil da pessoa; "Responsável" e "Seguidores" com espaçamentos diferentes no mesmo cabeçalho. A causa é estrutural. As telas têm CSS próprio com cor, fundo, borda, raio, sombra e fonte (1.214 declarações em 37 arquivos na auditoria de 02/10/2026) e, em 30 lugares, passam `className` para um componente do design system e mudam a aparência dele. Cada uma dessas telas é uma cópia do componente que não recebe o próximo ajuste.

A expectativa do usuário é a do Figma: editar o componente atualiza todo lugar que o usa.

## Decisão

- **CSS de tela só faz layout:** posição, grade, flex, tamanho, espaçamento, ordem, rolagem, camadas. Aparência — cor, fundo, borda, raio, sombra, tipografia, opacidade, filtro, transição e animação — é do componente em `packages/ui-web`.
- **`className` em componente do design system é só layout.** Variação de aparência vira prop ou variante do próprio componente.
- **Um padrão, um componente.** As famílias e seus donos estão na auditoria (`docs/arquitetura/auditoria-componentes-2026-10-02.md`, seção 0). Padrão sem dono ganha componente novo em `packages/ui-web`, com história, antes de ser usado.
- **Mecanismo:** o lint `spark/tela-so-layout` aponta cada declaração de aparência no CSS das telas. Começa como aviso, para medir a dívida, e vira erro quando o número chegar a zero. A folha global `app.css` fica fora da regra.

## Alternativas consideradas

Corrigir tela por tela com mais cuidado foi o que vinha sendo feito, e foi o que produziu as divergências. Proibir CSS de tela por completo foi descartado: layout é legitimamente da tela. Um lint de "não sobrescrever componente" sem regra para o restante do CSS deixaria passar padrões desenhados do zero na tela, que são a maior parte da dívida.

## Consequências

Mudar um componente passa a mudar o sistema inteiro, e o número de avisos mostra quanto ainda não está assim. Telas ficam mais finas; o design system cresce com componentes que hoje existem só como CSS de tela (linha de lista densa, etiqueta, folha genérica, abas com link, título de seção). Quem precisa de uma aparência nova cria a variante no componente, não na tela.
