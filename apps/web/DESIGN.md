# Contrato visual — CRM

Segue ADR-0020, ADR-0039 e ADR-0040; substitui a direção visual anterior deste contrato. Escopo: ficha do negócio, visualização rápida, histórico e configuração da etapa.

## Direção
Modo operar: atendimento frequente, leitura rápida e edição direta. Fundo de papel quente `color-ground` separa painéis sólidos `color-surface`; `surface2` recebe campos em baixo-relevo. No escuro, a mesma hierarquia usa carvão. Tinta indica seleção/ação; verde, vermelho e âmbar mantêm significado de sucesso, perda e atenção. Não usar cores decorativas para compensar uma estrutura fraca.

## Identidade compartilhada
- Geist para texto e títulos; Geist Mono para números, datas e eixos. Fontes locais.
- Botões de ação e chips em pílula. Campos e seletores têm raio de 12px e contorno visível; cartões e colunas usam 20px, menus 18px e modais 28px. Curvas contínuas não justificam raios excessivos.
- Sombras curtas de contato, menus elevados e modais acima deles. Textura restrita a overlays. O backdrop de modal usa desfoque progressivo dentro do primitivo Glass; conteúdo e colunas permanecem sólidos.
- Pressão em 100 ms; feedback de campos em 180 ms, menus em 200 ms e seleção em 240 ms. Modais preservam a acomodação de 450 ms e saída de 280 ms. Estados mudam imediatamente; o movimento acompanha. Movimento reduzido remove deslocamentos. O blur progressivo é fixo: a transição anima sua opacidade, não recalcula o raio do filtro a cada frame.
- Gráficos usam tinta na primeira série, pigmentos nas demais, comparação/projeção tracejada e tooltips na superfície inversa. Estados vazio, erro e ausência de dados continuam explícitos.
- O ZIP fornecido é evidência em `docs/referencias/spark-design/original.zip`; seu nome, filosofia e script global não entram no produto.

## Composição
- Página: cabeçalho, etapas e dois espaços independentes — ficha lateral e área de trabalho.
- Visualização rápida: contexto, trabalho da etapa e movimentação se adaptam ao espaço; não reduzir a página inteira para caber numa modal.
- Usar uma superfície por função. Proibido encaixar cartões apenas para explicar outro cartão.
- Painéis separados por `space-4` ou `space-5`; conteúdo com `space-4`/`space-5`; controles relacionados com `space-2`.
- Valores editáveis permanecem reconhecíveis. O hover muda fundo/borda, nunca geometria ou tamanho.

## Contratos por componente
- Ações no cabeçalho: responsável, seguidores e desfechos usam Button secondary lg, raio controlRadius e movimento compartilhado. Tons success/danger pertencem ao componente; a rota não redesenha controles.
- Etapa: um título e o nome da etapa; cada campo aparece uma vez no bloco, com seu nível. Sem contador e selo repetindo a mesma informação em três níveis.
- Registro: nota e atividades em abas com navegação por teclado e indicador móvel. Texto digitado é preservado ao alternar; campo e ações expandem conforme a escrita, respeitando movimento reduzido.
- Visão rápida: campos e condições da etapa ficam no Resumo; a coluna central é dedicada ao registro e ao histórico. Vínculos usam uma ou duas colunas conforme a largura real do painel.
- Campo vazio inline: ação textual Adicionar com sinal de mais, sem simular um input preenchido. Ao editar, revelar o controle correspondente com transição breve.
- Próximas atividades: vazio ocupa uma linha com ação de agendamento. Lista com limite de altura próprio.
- Histórico: data uma vez por grupo; evento com título, horário e autor na primeira linha, mudança logo abaixo. Rolagem própria mantém ações e filtros acessíveis.
- Tooltip de identidade: padding interno, nome e detalhe alinhados, sem encostar na borda.
- Configuração: abas Identidade, Campos e Movimentação. A matriz usa a largura disponível e nomes completos; campos opcionais de criação aparecem no mesmo painel.
- Cores: amostras visuais selecionáveis e hexadecimal; não repetir nome, legenda e demonstração em blocos distintos.

## Verificação de entrega
Inspecionar uma vez a ficha em desktop e largura estreita, a visualização rápida, os menus do cabeçalho e as três áreas da configuração. Conferir: texto legível, nenhum overflow horizontal de página, foco visível, campos sem truncamento na matriz, rolagens com limites, estados vazios úteis. Corrigir defeitos concretos em lote. Rodar `pnpm check` conforme CLAUDE.md. Não confundir teste técnico aprovado com aprovação estética do usuário.

## Padrão de ações e etapas
Botões padrão são rounded; pill é explícito. Ações são elevadas, campos são rebaixados, menus são flutuantes. A trilha de etapas usa segmentos no mesmo vocabulário, com carvão apenas na etapa atual; sem recortes angulares. Ficha e visão rápida compartilham os tons de desfecho (ADR-0042).

## Fonte dos valores
Cores, tipografia, espaços e dimensões vêm de `packages/tokens`. Componentes compartilhados vivem em `packages/ui-web`. A composição usa esses contratos sem inventar uma variante de botão por tela.

## Tipografia e menus da marca
Brockmann é a família principal (400, 500, 600, 700; normal e itálico); Geist Mono complementa dados técnicos. Menus flutuantes compartilham Glass, espaçamento compacto, foco suave e abertura por transform/opacity. Não aplicar textura de cartão nos dropdowns. ADR-0041.
