# ADR-0044 — Identidade fiel à origem e física única

**Status:** Aceito
**Data:** 2026-10-02
**Substitui:** ADR-0039 quanto a valores de forma, sombra, tipografia e movimento; ADR-0040; ADR-0041 quanto à família padrão e aos menus; ADR-0042 quanto à geometria de ações (`rounded`); ADR-0043 quanto à composição dos menus flutuantes. Preserva a composição por colunas, a arquitetura do design system e o ADR-0025 (vidro só no `Glass`).

## Contexto

O usuário refinou um design system próprio no Claude Design e pediu que o Spark o receba por inteiro: componentes, campos, raios, cartões, modais, vidro, fonte, e a física de 550 ms. A migração anterior (ADR-0039 a 0043) adaptou os valores em vez de copiá-los. O resultado foi inconsistente: campo com raio 12, card 20, menu 18, durações de 180 a 240 ms, Brockmann como fonte padrão. Cada componente ficou "quase igual" à origem, e o usuário reportou bordas quadradas, sombras e cores divergentes de tela para tela.

## Decisão

- **Cópia fiel.** Os valores da origem (`docs/referencias/identidade/origem/`) entram nos tokens com o mesmo nome: `--bg --sf --sf2 --sf3 --bd --bd2 --tx…--tx4 --ac --acs --ring --ok/--oks… --glass --gbd --sh1 --e2 --e3 --deb --ink --inkp --grain --v0…--v6 --shu`. Escalas: `--r-*` (controle em pílula; superfície em squircle 18/28/36/44/56), `--h-*`, `--fs/--lh/--ls/--fw-*`, `--ease*`, `--t-*`. Um teste de contrato compara os temas com a origem, e outro reprova `var(--x)` sem definição.
- **Uma só física.** A regra global (`packages/ui-web/src/identidade.css`) anima cor, sombra, borda, transform, opacidade e filtro em 550 ms Respiro. O toque responde em 100 ms (`data-press`), indicadores deslizam (`data-slide`/`data-ind`), mensagens abrem espaço (`data-collapse`), camadas flutuantes entram e saem com os keyframes da origem. A física é implementada em React e CSS, sem o motor global de DOM da origem: indicador, morfismo de rótulo, tinta ao digitar e senha a carvão são hooks e utilitários de `ui-web/src/motion`.
- **Geist e Geist Mono** são a tipografia padrão. Brockmann e Inter continuam disponíveis como escolha da organização.
- **Ícones** em viewBox 24, traço 1.5, pontas redondas. Os que a origem não tinha foram desenhados no mesmo traço.
- **Nome.** No código, o sistema se chama "identidade". O nome do artefato de origem não entra no produto.
- **Vocabulário único.** Os nomes anteriores (`--color-*`, `--typography-*`, `--radius-*`, `--motion-*`, `--effect-*`) foram removidos. O que ainda não tem equivalente direto vive como `--legado-*`. O lint `spark/identidade-legado` avisa cada uso até zerar; `spark/identidade` reprova cor, curva, duração, raio acima de 8px e família literais em qualquer CSS importado.
- **Regras de produto que acompanham a migração:** linha de tabela de registros abre a página do registro (`DataTable onRowOpen`). Listas densas não usam pílula em linhas de várias linhas. Status é sinal pequeno. Rótulos ficam em português.

## Alternativas consideradas

Carregar o CSS e o JS da origem como estão foi descartado pelos mesmos motivos do ADR-0039: seletores universais e observadores de mutação disputam o DOM com React e Base UI. A física foi reescrita com o mesmo resultado visual. Adaptar valores "ao contexto" foi descartado: foi exatamente o que gerou a inconsistência.

## Consequências

Toda tela que consome tokens muda de uma vez. A dívida restante é visível e mensurável: número de avisos `identidade-legado`. Telas com CSS próprio precisam ser reescritas pela receita (`docs/referencias/identidade/README.md`). A organização que personalizou cores ou fonte mantém a personalização. O preset antigo continua reconhecido como padrão, sem migração de banco.
