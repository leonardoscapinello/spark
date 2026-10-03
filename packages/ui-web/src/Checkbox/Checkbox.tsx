import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import type { ComponentProps, ReactNode } from "react";
import s from "../shared/choices.module.css";

/** Checkbox (origem: Controles): caixa 20 em squircle; o ✓ é um traço só,
 * desenhado de 24 a 0 depois que a caixa escurece. Indeterminado: um traço
 * horizontal. O indicador fica montado para o traço poder voltar. */
export function Checkbox({ children, ...props }: Omit<ComponentProps<typeof BaseCheckbox.Root>, "children"> & { children: ReactNode }) {
  return <label className={s.label}>
    <BaseCheckbox.Root className={s.checkbox} {...props}>
      <BaseCheckbox.Indicator className={s.indicator} keepMounted>
        {props.indeterminate
          ? <span className={s.dash} aria-hidden="true" />
          : <svg className={s.mark} viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 7" /></svg>}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
    <span>{children}</span>
  </label>;
}
