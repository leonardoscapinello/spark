# Redesign — ponto de pausa em 13/09/2026

**Estado:** em andamento. Este registro preserva a direção e o próximo ponto de trabalho; não declara paridade completa com as referências.

## Direção mantida

- Interface geral: estrutura, densidade, tipografia e comportamento inspirados nas capturas da Intercom em [`../inspiration/intercom/capturas/`](../inspiration/intercom/capturas/), conforme [ADR-0033](../adr/0033-interface-fiel-intercom.md).
- Identidade: logotipo Leonardo Scapinello e acentos azuis; âmbar apenas como cor semântica, conforme [ADR-0034](../adr/0034-acentos-azuis-da-marca.md).
- Automações: lista e editor orientados pelas capturas da ManyChat em [`../inspiration/manychat/capturas/`](../inspiration/manychat/capturas/). Interações do CRM usam as capturas da Pipedrive em [`../inspiration/pipedrive/capturas/`](../inspiration/pipedrive/capturas/).
- Componentes reutilizáveis ficam em `packages/ui-web`, valores visuais em `packages/tokens` e telas em `apps/web/app/routes`. Nenhuma tela deve exibir nomes de fornecedores internos ao usuário.

## Entregue até a pausa

- Shell por módulos: trilho com símbolo da marca; ao expandir, símbolo e assinatura aparecem juntos. Leads, Administração e a lista de Automações têm navegação secundária; o editor de Automações conserva o canvas livre. O menu de perfil separa conta e administração.
- Leads e CRM: listas de pessoas e empresas, perfis relacionados, funil, atividades em calendário semanal, catálogo com painel de produto/variações e edição de ofertas. Tabelas, cabeçalhos, ações e estados vazios reutilizam componentes da biblioteca.
- Atendimento: área de conversas em colunas com filas, conversa e detalhes, com adaptação para tela estreita. “Atendimento” é o nome do módulo; a caixa de entrada fica dentro dele.
- Automações: cartões, tabela, filtros e contagem real de execuções; editor com canvas, blocos, conexões, zoom, paleta e inspetor. A implementação ainda não equivale a todos os recursos da ManyChat.
- Administração, campanhas, social e conteúdo têm navegação e telas próprias. O catálogo Storybook documenta os componentes compartilhados já criados.

## Ainda falta para fechar o design

1. Comparar **telas renderizadas** com as capturas, em desktop, tablet e celular: login, Leads, perfis, funil, Atendimento, Automações, Administração, campanhas, social e conteúdo. O código e `pnpm check` não comprovam paridade visual.
2. Ajustar diferenças encontradas de composição, largura, alinhamento, ícones, tipografia, estados de hover/foco, menus, painéis e transições. Confirmar que não surge rolagem horizontal da página ao abrir sobreposições.
3. Revisar estados de dados vazios, carregamento, erro, leitura sem permissão e listas extensas em cada formato. Verificar acessibilidade de teclado e movimento reduzido nas interações ajustadas.
4. Avaliar o tema escuro separadamente: o [ADR-0033](../adr/0033-interface-fiel-intercom.md) o registra como provisório. Não afirmar fidelidade dele sem referência e comparação.
5. ~~Consolidar o inventário em [`../especificacao/componentes-intercom.md`](../especificacao/componentes-intercom.md)~~ — feito em 13/09: a conferência contra o código está na seção «Consolidação do inventário». Restam ali, como faltando de fato, **resize e reordenação de coluna**, **editor rico**, **ícones exatos** e **hover/foco medidos sistematicamente**.

## Retomada de 13/09

Duas pendências da tabela foram fechadas: **seleção de linhas** e **catálogo de colunas** no `DataTable`, ambas controladas pela tela e cobertas por teste e história no Storybook. Também foi corrigida uma regressão em que o formulário de edição de pessoa ficava sem estilo — o módulo CSS não tinha as classes que a tela referenciava.

O item 1 acima **não avançou**: comparar as telas renderizadas exige sessão autenticada, e o login depende do Supabase real. Enquanto não houver acesso, a comparação visual das telas compostas continua parada; o que dá para conferir sem sessão é o Storybook.

## Retomada e teste

Os processos locais do Spark foram parados a pedido do usuário: web `:3100`, API `:3000` e Storybook `:6006`. Nenhum banco ou serviço de outro projeto foi encerrado. Para retomar, no repositório:

```bash
pnpm --filter @spark/api dev
pnpm --filter @spark/web dev
pnpm --filter @spark/ui-web storybook
```

Começar pelo fluxo visual **Leads → pessoa → negócio → Atendimento** e depois **Automações → editor**, em janela larga e em largura móvel. Registrar diferenças concretas, corrigir uma unidade por vez e seguir o limite de verificação do [`../../CLAUDE.md`](../../CLAUDE.md). A última execução de `pnpm check` foi interrompida para liberar a máquina; a alteração experimental de TypeScript associada a ela foi revertida.
