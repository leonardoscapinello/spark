# Contrato visual — app web

Segue o ADR-0044 (identidade fiel à origem e física única), que substitui as direções visuais dos ADRs 0039 a 0043. Escopo: todas as telas do app.

## Fonte única

- Valores: `packages/tokens` (vocabulário da identidade: `--bg --sf --sf2 --sf3 --tx… --sh1 --e2 --e3 --deb --r-* --h-* --ease* --t-*`).
- Física, keyframes e atributos de movimento: `packages/ui-web/src/identidade.css`.
- Componentes: `packages/ui-web`. A tela compõe; não redesenha controle. O casco (trilho, sidebar, folha, abas da área) também é componente: `AppShell`, `AppContent`, `NavigationRail`, `RailGroup`, `LinkTabs`.
- Catálogo vivo: o Storybook de `packages/ui-web` mostra o sistema inteiro, lido dos tokens e dos componentes reais.
- Receitas, vocabulário antigo→novo e as regras que o usuário cobrou: [`docs/referencias/identidade/README.md`](../../docs/referencias/identidade/README.md).
- Valores exatos de cada componente: `docs/referencias/identidade/spec/*.md`.

## Esqueleto (preservado)

Trilho de módulos (sidebar compacta de 68, abre para 196 com rótulos), sidebar da área (236) e folha de conteúdo, soltos 16px da borda sobre a mesa de papel. Abas da área sublinhadas no topo da folha, com o traço deslizando. Painéis inspirados no Intercom continuam com suas colunas.

## Regras de produto que valem para toda tela

1. Toda tabela de registros abre a página do registro ao clicar na linha (`DataTable onRowOpen`).
2. Listas que podem ter centenas de itens são densas (avatar 32, duas ou três linhas curtas). Status é sinal pequeno.
3. Texto informativo nunca em `--tx4`. Nada vaza do contêiner. Ícone e avatar no mesmo encaixe.
4. Rótulos em português. Sem status técnico em inglês na interface.
5. A cor só aparece quando significa. Estado e etapa usam ponto ou traço fino; etiquetas da ficha usam fundo no pigmento cadastrado com contraste de leitura, conforme pedido do usuário. Preservar pílulas, bordas, superfícies e raios da identidade.

## Verificação de entrega

`pnpm check` conforme o CLAUDE.md. `spark/identidade`, `spark/identidade-legado` e `spark/tela-so-layout` são erro: o CSS de tela que pinta, arredonda, sombreia ou escreve fonte não passa. Componente novo ou alterado entra no Storybook com todas as variantes e estados (`pnpm --filter @spark/ui-web storybook`, com tema e largura na barra de ferramentas). Inspecionar a tela uma vez em desktop e largura estreita, nos dois temas. Não confundir teste técnico aprovado com aprovação estética do usuário.

## Ficha de negócio

Organização compacta para atendimento: voltar em controle circular ao lado do título; valor e contexto abaixo dele; ações de equipe e fechamento à direita. A trilha de etapas mantém as setas interligadas sem arredondar as pontas, conforme solicitação específica.

Uma superfície de trabalho com contexto em `--sf2` e conteúdo em `--sf3`, raio `--r-lg`. Abas de conteúdo usam o trilho segmentado da identidade (`--r-pill`, `--deb`, seleção com `--sh1`). Usar o componente Tabs segmentado existente, com indicador deslizante; não criar variante exclusiva da ficha. Registrar notas e agendar ficam juntos em Atividades, no contexto do atendimento. Histórico consulta registros já feitos. Itens e valores contém produtos e Pessoas e empresa contém vínculos. Não há barra de ações geral abaixo das abas. Seções internas são planas para evitar cartões aninhados. As etiquetas ficam em uma linha, com até duas visíveis e contador que abre todas. Obrigatoriedade aparece somente como ícone vermelho + “Obrigatório” ou ícone âmbar + “Importante”, sem repetir “preenchido”. Em largura estreita, a área de atendimento vem antes dos dados.
