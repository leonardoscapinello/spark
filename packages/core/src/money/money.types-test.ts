/**
 * Prova de compilador — não roda como teste em runtime, é verificada pelo
 * `tsc --noEmit` (pnpm typecheck). Se um dia `preco * 0.9` passar a compilar,
 * é porque alguém trocou Money de volta para um brand por interseção com
 * number, e é isso que este arquivo pega. Ver docs/adr/0019 e
 * docs/arquitetura/fase-0.md ("pronto quando: preco * 0.9 não compila").
 */
import { money, type Money } from "./money.js";

const preco: Money = money(1990);

// @ts-expect-error — Money é um objeto opaco; não é number nem bigint,
// então o operador `*` não aceita como operando.
const _semDesconto = preco * 0.9;

// @ts-expect-error — mesma razão: `-` exige number/bigint dos dois lados.
const _semSubtracao = preco - money(100);

// @ts-expect-error — um número cru não satisfaz o tipo opaco. Só `money()` produz um Money.
const _construcaoDireta: Money = 1990;

// A única forma correta é pelas funções do módulo:
// aplicarDesconto(preco, { tipo: "percentual", valor: 10 })

export {};
