import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import s from "./Composer.module.css";

export interface ComposerTab<Id extends string = string> {
  id: Id;
  label: string;
  icon: IconName;
  disabled?: boolean;
}

export interface ComposerProps<Id extends string = string> {
  tabs: readonly ComposerTab<Id>[];
  value: Id;
  onValueChange: (id: Id) => void;
  children: ReactNode;
  label?: string;
}

/**
 * Onde se registra o que aconteceu e o que vem a seguir, no formato do
 * Pipedrive (docs/inspiration/pipedrive, captura 001): uma barra de abas com
 * ícone no topo de um cartão — a ativa em azul, sublinhada — e abaixo a área
 * de escrita da aba escolhida.
 *
 * A diferença para o `Tabs` comum é a intenção: `Tabs` separa leitura, este
 * separa **formas de registrar**. Por isso o corpo é um só, com padding de
 * composição, e a aba muda o que se escreve, não o que se lê.
 */
export function Composer<Id extends string = string>({ tabs, value, onValueChange, children, label = "Registrar" }: ComposerProps<Id>) {
  const activeTab = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (typeof activeTab.current?.scrollIntoView === "function") activeTab.current.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [value]);
  return <section className={s.root} aria-label={label}>
    <div className={s.tabs} role="tablist" aria-label={label}>
      {tabs.map((tab) => <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={value === tab.id}
        disabled={tab.disabled}
        ref={value === tab.id ? activeTab : undefined}
        className={s.tab}
        onClick={() => onValueChange(tab.id)}
      >
        <Icon name={tab.icon} />
        {tab.label}
      </button>)}
    </div>
    <div className={s.body}>{children}</div>
  </section>;
}

/** Linha de «clique aqui para…» — o estado fechado de uma aba do compositor. */
export function ComposerPrompt({ children, disabled = false, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" className={s.prompt} disabled={disabled} onClick={onClick}>{children}</button>;
}
