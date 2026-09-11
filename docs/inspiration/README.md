# Dossiê de referência — Spark

Coleta iniciada em 11/09/2026, nas sessões abertas de Pipedrive, Intercom e ManyChat. Este é um arquivo de pesquisa em andamento, com evidência visual e inventário funcional; não é uma declaração de paridade completa nem uma implementação.

## Direção definida pelo usuário

| Área do Spark | Referência principal | O que preservar |
| --- | --- | --- |
| CRM | Pipedrive | Kanban, cards, detalhe do negócio, atividades, produtos, filtros e pipelines |
| Atendimento | Intercom | Inbox, conversa, detalhes, tabelas, menus, widget e gestão de atendimento |
| Automação | ManyChat | Canvas, múltiplos gatilhos, nós, conexões, cores semânticas, ícones, painéis e facilidade de uso |
| Componentes gerais | Intercom | Densidade, hierarquia, dimensões, bordas, sombras e interação, conciliadas com a identidade Spark |
| Contatos e automações do ActiveCampaign | Adiado por decisão do usuário | Login indisponível; não foi pesquisado nesta sessão |

A orientação mais recente é explícita: **a interface de automação deve seguir o ManyChat também visualmente**. O Intercom não substitui essa referência no canvas. A integração deve unir contato, conversa, negócio e execução de automação, sem criar quatro produtos isolados.

## Como consultar

- [Pipedrive: recursos e jornadas](pipedrive/RECURSOS.md)
- [Intercom: recursos e jornadas](intercom/RECURSOS.md)
- [Intercom: especificação visual observada](intercom/VISUAL.md)
- [ManyChat: recursos, canvas e múltiplos gatilhos](manychat/RECURSOS.md)
- [Integrações e requisitos para o Spark](INTEGRACOES.md)
- [Cobertura, limites e próximos estados a capturar](COBERTURA.md)
- [Ocorrências durante a navegação](OCORRENCIAS.md)
- Índices de evidências: [Pipedrive](pipedrive/INDICE.md), [Intercom](intercom/INDICE.md), [ManyChat](manychat/INDICE.md)
- `manifesto.json`: metadados, dimensões, data e hash dos arquivos de evidência.

Cada estado tem um PNG e uma árvore de acessibilidade `.ax.txt`. O PNG registra a região visível; a árvore pode incluir elementos fora da área visível, virtualizados ou sem correspondência visual imediata. A existência de texto na árvore não prova que um erro foi exibido ao usuário. Medidas de CSS são observações do DOM renderizado, não tokens oficiais do fornecedor.

Os arquivos brutos ficam neste computador, fora do versionamento, porque a conta de ManyChat pertence a terceiros e contém dados operacionais e endereços de integração. Os textos de síntese não reproduzem credenciais nem URLs de webhook. Não houve publicação externa do arquivo de pesquisa.

## Convenção de evidência

**Observado**: tela ou comportamento aberto na sessão. **Formulário**: opções vistas, sem confirmar gravação. **Catálogo**: recurso anunciado no menu, sem abrir sua implementação. **Bloqueado**: plano, conta não conectada ou acesso impedindo análise. **Proposta Spark**: decisão sugerida a partir da pesquisa, ainda não implementada. **Pendente**: falta evidência suficiente.

Os ADRs do Spark continuam válidos. Medidas de terceiros não autorizam inserir valores literais no app: uma implementação futura deverá passar por `packages/tokens` e `packages/ui-web`. Regras, valores monetários, permissões e transições de domínio pertencem a `packages/core`; a integração de canais não muda o Postgres como fonte da verdade nem a leitura local das telas de trabalho.
