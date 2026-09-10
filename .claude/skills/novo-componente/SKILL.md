---
name: novo-componente
description: Criar um componente no design system do Spark (packages/ui-web ou ui-native). Use ao adicionar qualquer campo, botão, controle ou primitivo de UI — e sempre que a alternativa seria escrever um elemento HTML nativo no código de aplicação.
---

# Novo componente no design system

Todo componente vive em `packages/ui-web` (web e desktop) ou `packages/ui-native` (mobile). **Nunca no app.**

## Antes de começar

1. **Já existe?** Procure em `packages/ui-web/src`. Variação de componente existente é uma prop, não um componente novo.
2. **É de domínio ou de sistema?** `MoneyInput` é de sistema. `SeletorDePipeline` é de domínio e mora no módulo — construído *sobre* os componentes de sistema.

## Estrutura

```
packages/ui-web/src/<Componente>/
├── <Componente>.tsx          implementação
├── <Componente>.stories.tsx  uma história por estado
├── <Componente>.test.tsx     interação + acessibilidade
└── index.ts
```

## Regras

**Comportamento vem do primitivo.** Base UI para tudo; React Aria só para data/hora com locale e casos de leitor de tela complexos. Nunca implemente foco, navegação por teclado ou ARIA na mão.

**Estilo vem de token.** Sem valor literal — nem cor, nem espaçamento, nem raio, nem duração. Tudo de `packages/tokens`, pela camada semântica (`color.action.primary`), nunca pelo primitivo (`teal.600`).

**Tipo vem de `core`.** Campo que lida com valor de domínio devolve o tipo marcado, não `string`:

```tsx
<MoneyInput  value={Money}  onChange={(v: Money) => …} />
<DocumentInput value={CPF | CNPJ} … />
```

**Erro vem do schema.** A mensagem nasce do Zod em `packages/core`, nunca escrita no componente.

## Checklist — nenhum item é opcional

- [ ] Estados: repouso, foco, hover, desabilitado, somente-leitura, carregando, erro, sucesso
- [ ] Rótulo e descrição associados por `id`
- [ ] `aria-invalid` e `aria-describedby` corretos
- [ ] Operável só pelo teclado, do início ao fim
- [ ] Foco visível — e **não removível por prop**
- [ ] Tamanhos `sm` / `md` / `lg`, de token
- [ ] `prefers-reduced-motion` respeitado
- [ ] Área de toque ≥ 44×44 px no mobile
- [ ] Uma história por estado no Storybook
- [ ] Teste de interação e de acessibilidade
- [ ] Exportado no `index.ts` do pacote

## Pronto quando

`pnpm check` sai 0. Uma vez. Ver [ADR-0024](../../../docs/adr/0024-limite-de-verificacao.md).

Referência completa: [ADR-0020](../../../docs/adr/0020-design-system-proprio.md).
