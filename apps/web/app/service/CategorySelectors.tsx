import type { CSSProperties } from "react";
import { serviceCategoryPath, type ServiceConfiguration } from "@spark/core";
import { Field, Label, Select } from "@spark/ui-web";
import styles from "../routes/settings.module.css";

export function CategorySelectors({ value, onChange, config, disabled = false }: { value: string | null; onChange: (value: string | null) => void; config: Pick<ServiceConfiguration, "categories">; disabled?: boolean }) {
  const path = serviceCategoryPath(value, config.categories);
  return <div className={styles.categoryFields}>{[0, 1, 2].map(depth => {
    const parent = depth === 0 ? null : path[depth - 1]?.id;
    const label = `Categoria N${depth + 1}`;
    const options = config.categories.filter(category => category.parentId === parent && (!category.archived || category.id === path[depth]?.id));
    return <div key={depth} data-collapse="" data-reveal-field="" data-open={parent !== undefined ? "true" : "false"} inert={parent === undefined} aria-hidden={parent === undefined} style={{ "--g": "var(--space-4)" } as CSSProperties}><div><Field>
      <Label>{label}</Label>
      <Select wrapValue label={label} disabled={disabled || parent === undefined} value={path[depth]?.id ?? ""} options={[
        { value: "", label: parent === undefined ? `Selecione a categoria N${depth} primeiro` : "Não definida" },
        ...options.map(category => ({ value: category.id, label: category.name })),
      ]} onValueChange={id => onChange(id || parent || null)} />
    </Field></div></div>;
  })}</div>;
}
