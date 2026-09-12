import { useId, useState } from "react";
import { Button } from "../Button/Button.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Modal, ModalContent } from "../Modal/Modal.js";
import styles from "./QuickNavigation.module.css";

export interface QuickNavigationItem {
  id: string;
  label: string;
  group: string;
  icon: IconName;
}

export interface QuickNavigationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly QuickNavigationItem[];
  onSelect: (id: string) => void;
}

export function QuickNavigation({ open, onOpenChange, items, onSelect }: QuickNavigationProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = search
    ? items.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase("pt-BR").includes(search))
    : items;
  const active = filtered[Math.min(activeIndex, filtered.length - 1)];

  function close() {
    setQuery("");
    setActiveIndex(0);
    onOpenChange(false);
  }

  function select(id: string) {
    close();
    onSelect(id);
  }

  return <Modal open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); else onOpenChange(true); }}>
    <ModalContent title="Ir para" description="Encontre uma área de trabalho ou configuração.">
      <div className={styles.search}>
        <Input
          autoFocus
          aria-label="Buscar área"
          aria-controls={listId}
          aria-activedescendant={active ? `${listId}-${active.id}` : undefined}
          value={query}
          startAdornment={<Icon name="search" />}
          placeholder="Buscar área ou módulo"
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, filtered.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
            if (event.key === "Enter" && active) { event.preventDefault(); select(active.id); }
          }}
        />
      </div>
      <div className={styles.results} id={listId} role="listbox" aria-label="Áreas disponíveis">
        {filtered.length === 0 ? <p className={styles.empty}>Nenhuma área encontrada.</p> : filtered.map((item, index) => {
          const previous = filtered[index - 1];
          return <div key={item.id}>
            {previous?.group !== item.group && <p className={styles.group}>{item.group}</p>}
            <Button id={`${listId}-${item.id}`} role="option" aria-selected={index === activeIndex} variant="ghost" shape="rounded" className={styles.option} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(item.id)}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              <Icon name="right" />
            </Button>
          </div>;
        })}
      </div>
      <p className={styles.hint}>↑ ↓ Navegar · Enter Abrir · Esc Fechar</p>
    </ModalContent>
  </Modal>;
}
