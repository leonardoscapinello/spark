import { useState } from "react";
import { Button } from "../Button/Button.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover/Popover.js";
import s from "./DataTable.module.css";

export interface CatalogColumn { id: string; label: string; group?: string; alwaysVisible?: boolean }

/** Escolha de colunas visíveis, como o «+» no fim do cabeçalho da referência
 * (docs/inspiration/intercom/capturas/030-catalogo-colunas.png). A tabela não
 * guarda a escolha: quem chama decide se ela é de sessão, de usuário ou de view. */
export function ColumnCatalog({ columns, hidden, onChange, tableLabel }: { columns: readonly CatalogColumn[]; hidden: ReadonlySet<string>; onChange: (ids: string[]) => void; tableLabel: string }) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = search ? columns.filter(column => `${column.label} ${column.group ?? ""}`.toLocaleLowerCase("pt-BR").includes(search)) : columns;
  return <Popover>
    <PopoverTrigger render={<Button size="sm" variant="ghost" shape="rounded" iconOnly aria-label={`Escolher colunas de ${tableLabel}`} icon={<Icon name="plus" />} />} />
    <PopoverContent title="Colunas">
      <Input autoFocus aria-label="Pesquisar colunas" value={query} startAdornment={<Icon name="search" />} placeholder="Pesquisar colunas" onChange={event => setQuery(event.target.value)} />
      <div className={s.catalogList}>
        {filtered.length === 0 ? <p className={s.catalogEmpty}>Nenhuma coluna encontrada.</p> : filtered.map((column, index) => <div key={column.id}>
          {column.group && filtered[index - 1]?.group !== column.group && <p className={s.catalogGroup}>{column.group}</p>}
          <Checkbox
            checked={!hidden.has(column.id)}
            disabled={column.alwaysVisible ?? false}
            onCheckedChange={checked => onChange(checked ? [...hidden].filter(id => id !== column.id) : [...hidden, column.id])}
          >{column.label}</Checkbox>
        </div>)}
      </div>
    </PopoverContent>
  </Popover>;
}
