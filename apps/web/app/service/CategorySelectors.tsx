import type { CSSProperties } from "react";
import { serviceCategoryPath, type ServiceConfiguration } from "@spark/core";
import { InlineField, Select } from "@spark/ui-web";
import styles from "../routes/settings.module.css";

const LABELS = ["Categoria", "Subcategoria", "Detalhe"] as const;

/** Categoria em até três níveis, legenda | valor; cada nível aparece quando o anterior tem filhos. */
export function CategorySelectors({ value, onChange, config, disabled = false }: { value: string | null; onChange: (value: string | null) => Promise<unknown>; config: Pick<ServiceConfiguration, "categories">; disabled?: boolean }) {
  const path = serviceCategoryPath(value, config.categories);
  return <div className={styles.categoryFields}>{[0, 1, 2].map(depth => {
    const parent = depth === 0 ? null : path[depth - 1]?.id;
    const label = LABELS[depth]!;
    const options = parent === undefined ? [] : config.categories.filter(category => category.parentId === parent && (!category.archived || category.id === path[depth]?.id));
    const open = depth === 0 || options.length > 0;
    return <div key={depth} data-collapse="" data-reveal-field="" data-open={open ? "true" : "false"} inert={!open} aria-hidden={!open} style={{ "--g": "var(--space-0)" } as CSSProperties}><div>
      <InlineField label={label} value={path[depth]?.name ?? "Não definida"} empty={!path[depth]} disabled={disabled || !open}>
        {close => <Select label={label} value={path[depth]?.id ?? ""} options={[
          { value: "", label: "Não definida" },
          ...options.map(category => ({ value: category.id, label: category.name })),
        ]} onValueChange={id => close(onChange(id || parent || null))} />}
      </InlineField>
    </div></div>;
  })}</div>;
}
