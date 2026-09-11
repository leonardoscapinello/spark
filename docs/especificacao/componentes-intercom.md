# Componentes — referência Intercom

Primeiro conjunto implementado em 11/09/2026, conforme ADR-0033. Catálogo interativo no Storybook: `Fundamentos/Catálogo Intercom`. Os exemplos consomem os componentes reais, sem variantes exclusivas da demonstração. Formulário do catálogo valida localmente e não persiste dados.

## Medidas observadas nesta unidade

Fonte: Inbox aberto e modal «Criar visualização», consultados via DOM renderizado e estilos computados, incluindo Shadow DOM. Modal fechado por Cancelar sem salvar.

| Componente/estado | Evidência |
| --- | --- |
| Botão padrão | Inter 14/16 px, peso 600, altura 32 px, padding 8 × 12 px, raio 9999 px |
| Botão pequeno | Inter 13/16 px, altura 24 px, padding 4 × 8 px |
| Primário | Fundo #222222, texto #fafaf7 |
| Secundário | Fundo #f8f8f7, texto #1a1a1a |
| Ação por ícone | 24 ou 32 px; ícone 16 px; círculo |
| Item da sidebar | Altura 32 px, padding 4 × 12 px, raio 8 px; regular 400 e selecionado 600 |
| Item selecionado | Branco; contorno por sombra #e9eae6 de 1 px + 0 1px 4px rgba(20,20,20,.15) |
| Sidebar | Largura 236 px; fundo #fbfbf9, raio 16 px, sombra curta |
| Abas Detalhes/Copiloto | 42 px de altura, fonte 14/20 px, peso 600, padding vertical 10 px; texto inativo #646462 |
| Cabeçalho do acordeão | Fonte 14/21 px, peso 600, padding 12 × 24 px, gap 16 px |
| Campo do modal | Fonte 14/20 px, campo interno 38 px, padding 8 px, raio direito 7 px; envolve seletor de ícone separado |

## Entrega e limites

- `Button`: primário, secundário, ghost e elevado; tamanhos, ícones, loading, disabled, pill e retangular.
- `Input`, `Field`, `Label`, `ErrorText`: componentes existentes alinhados à base; `PasswordInput`, `Form`, `FieldDescription` e `FormActions` compõem o mesmo conjunto.
- `Sidebar`, `SidebarSection`, `SidebarItem`, `NavigationRail`: navegação compartilhada com seleção e contador.
- `Tabs`: painéis, seleção controlada ou interna, teclado e estado desabilitado.
- `Accordion`: seções independentes, controle externo opcional e teclado.
- `Icon`: conjunto inicial de desenhos locais de 16 px; silhuetas ainda não representam reprodução exata dos ícones do Intercom.

As cores de hover/foco, indicador laranja da aba (estimado visualmente), botão grande de 40 px, campo completo de 40 px e exibição de senha são extensões iniciais; falta medição independente desses estados. Campo de senha usa a base de Input, sem afirmar inspeção da autenticação do Intercom. Tema escuro, responsividade completa, sidebar recolhível, menus, modal, tabela, combobox e demais componentes ainda exigem suas unidades de implementação e referência. O catálogo é uma bancada de componentes, não uma cópia de uma tela real de Inbox.

Todos os valores novos de estilo estão em tokens. Ícones usam geometria SVG própria. A futura migração das telas precisa preservar leitura local, regras de core e integração real; o catálogo não substitui essas funcionalidades.
