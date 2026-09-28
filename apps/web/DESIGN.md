# Contrato visual — CRM

Complementa ADR-0020 e ADR-0033, sem substituí-los. Escopo: ficha do negócio, visualização rápida, histórico e configuração da etapa.

## Direção
Modo operar: atendimento frequente, leitura rápida e edição direta. Fundo `color-ground` separa painéis sólidos `color-surface`; `surface2` agrupa ferramentas internas. O azul indica seleção/ação; verde, vermelho e âmbar mantêm significado de sucesso, perda e atenção. Não usar cores decorativas para compensar uma estrutura fraca.

## Composição
- Página: cabeçalho, etapas e dois espaços independentes — ficha lateral e área de trabalho.
- Visualização rápida: contexto, trabalho da etapa e movimentação se adaptam ao espaço; não reduzir a página inteira para caber numa modal.
- Usar uma superfície por função. Proibido encaixar cartões apenas para explicar outro cartão.
- Painéis separados por `space-4` ou `space-5`; conteúdo com `space-4`/`space-5`; controles relacionados com `space-2`.
- Valores editáveis permanecem reconhecíveis. O hover muda fundo/borda, nunca geometria ou tamanho.

## Contratos por componente
- Equipe no cabeçalho: responsável e seguidores compartilham altura `controlLarge`, raio e padding.
- Etapa: um título e o nome da etapa; cada campo aparece uma vez no bloco, com seu nível. Sem contador e selo repetindo a mesma informação em três níveis.
- Registro: nota e atividades acessíveis na mesma área; texto digitado é preservado ao alternar.
- Próximas atividades: vazio ocupa uma linha com ação de agendamento. Lista com limite de altura próprio.
- Histórico: data uma vez por grupo; evento com título, horário e autor na primeira linha, mudança logo abaixo. Rolagem própria mantém ações e filtros acessíveis.
- Tooltip de identidade: padding interno, nome e detalhe alinhados, sem encostar na borda.
- Configuração: abas Identidade, Campos e Movimentação. A matriz usa a largura disponível e nomes completos; campos opcionais de criação aparecem no mesmo painel.
- Cores: amostras visuais selecionáveis e hexadecimal; não repetir nome, legenda e demonstração em blocos distintos.

## Verificação de entrega
Inspecionar uma vez a ficha em desktop e largura estreita, a visualização rápida, os menus do cabeçalho e as três áreas da configuração. Conferir: texto legível, nenhum overflow horizontal de página, foco visível, campos sem truncamento na matriz, rolagens com limites, estados vazios úteis. Corrigir defeitos concretos em lote. Rodar `pnpm check` conforme CLAUDE.md. Não confundir teste técnico aprovado com aprovação estética do usuário.

## Fonte dos valores
Cores, tipografia, espaços e dimensões vêm de `packages/tokens`. Componentes compartilhados vivem em `packages/ui-web`. A composição usa esses contratos sem inventar uma variante de botão por tela.
