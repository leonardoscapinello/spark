import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
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

/** Formas de registrar: indicador contínuo e foco/teclado geridos pelo Base UI. */
export function Composer<Id extends string = string>({ tabs, value, onValueChange, children, label = "Registrar" }: ComposerProps<Id>) {
  return <Tabs.Root value={value} onValueChange={next => {
    const selected = tabs.find(tab => tab.id === next);
    if (selected) onValueChange(selected.id);
  }} className={s.root} render={<section aria-label={label} />}>
    <Tabs.List className={s.tabs} aria-label={label} activateOnFocus>
      {tabs.map(tab => <Tabs.Tab key={tab.id} value={tab.id} disabled={tab.disabled} className={s.tab}>
        <Icon name={tab.icon} /><span>{tab.label}</span>
      </Tabs.Tab>)}
      <Tabs.Indicator className={s.indicator} />
    </Tabs.List>
    <Tabs.Panel key={value} value={value} className={s.body}>{children}</Tabs.Panel>
  </Tabs.Root>;
}

export function ComposerPrompt({ children, disabled = false, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <Button variant="secondary" icon={<Icon name="calendar" />} aria-haspopup="dialog" disabled={disabled} onClick={onClick}>{children}</Button>;
}
