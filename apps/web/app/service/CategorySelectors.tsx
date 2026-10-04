import { serviceCategoryPath, type ServiceConfiguration } from "@spark/core";
import { Select } from "@spark/ui-web";
import styles from "../routes/settings.module.css";
export function CategorySelectors({ value, onChange, config }: { value: string | null; onChange: (value: string | null) => void; config: Pick<ServiceConfiguration, "categories"> }) {
  const path = serviceCategoryPath(value, config.categories);
  return <div className={styles.form}>{[0, 1, 2].map(depth => {
    const parent = depth === 0 ? null : path[depth - 1]?.id;
    if (parent === undefined) return null;
    return <Select key={depth} label={`Categoria de nível ${depth + 1}`} value={path[depth]?.id ?? ""} options={[{ value: "", label: depth === 0 ? "Geral / todas as categorias" : `Todas as categorias de nível ${depth + 1}` }, ...config.categories.filter(c => !c.archived && c.parentId === parent).map(c => ({ value: c.id, label: c.name }))]} onValueChange={id => onChange(id || parent)} />;
  })}</div>;
}
