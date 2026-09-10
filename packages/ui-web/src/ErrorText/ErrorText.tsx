import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentPropsWithoutRef } from "react";
import styles from "./ErrorText.module.css";

export type ErrorTextProps = ComponentPropsWithoutRef<typeof BaseField.Error>;

/**
 * Mensagem de erro do campo. A mensagem vem do schema Zod de packages/core
 * (docs/adr/0019) — nunca escrita aqui.
 *
 * `match` por padrão é `true`: por definição do Spark, quem decide se o
 * campo está inválido é a validação externa (Zod), não o ValidityState
 * nativo do navegador — sem isto, Field.Error só aparece quando bate com
 * uma regra de validação HTML5 (required, pattern...), que não é o nosso
 * modelo. O pai controla a visibilidade renderizando <ErrorText> condicionalmente.
 */
export function ErrorText({ className, match = true, ...rest }: ErrorTextProps) {
  const cls = className ? `${styles.root} ${className}` : styles.root;
  return <BaseField.Error className={cls} match={match} {...rest} />;
}
