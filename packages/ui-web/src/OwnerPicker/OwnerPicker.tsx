import { Avatar } from "../Avatar/Avatar.js";
import type { ButtonSize } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { MenuButton, MenuGroup, MenuItem, MenuSeparator } from "../Menu/Menu.js";
import s from "./OwnerPicker.module.css";

export interface OwnerPickerPerson {
  id: string;
  name: string;
  avatarUrl?: string | null;
  deactivatedAt?: string | null;
}

export interface OwnerPickerProps {
  /** Quem pode ser responsável; desativados não entram na lista. */
  people: readonly OwnerPickerPerson[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Título do grupo e começo do nome acessível («Responsável pelo negócio»). */
  label?: string;
  emptyLabel?: string;
  disabled?: boolean;
  size?: ButtonSize;
}

/**
 * Responsável de um registro: folha com o avatar concêntrico e o nome; o menu
 * lista as pessoas com avatar no encaixe de 24, a atual marcada. É o único
 * desenho de "responsável" — cabeçalho do negócio, visão rápida e fichas.
 */
export function OwnerPicker({ people, value, onChange, label = "Responsável", emptyLabel = "Sem responsável", disabled = false, size = "md" }: OwnerPickerProps) {
  const owner = people.find((person) => person.id === value);
  const active = people.filter((person) => !person.deactivatedAt);
  return <MenuButton
    variant="secondary"
    size={size}
    disabled={disabled}
    className={s.trigger}
    /* Avatar (ou o ícone, sem dono) no encaixe de ícone do botão: o texto
     * começa no mesmo x de «Seguidores» e de qualquer outro gatilho. */
    icon={owner ? <Avatar name={owner.name} src={owner.avatarUrl ?? null} size="small" /> : <Icon name="account" />}
    aria-label={`${label}: ${owner?.name ?? emptyLabel}. Trocar`}
    menu={<MenuGroup label={label}>
      {active.map((person) => <MenuItem key={person.id} icon={<Avatar name={person.name} src={person.avatarUrl ?? null} size="small" />} {...(person.id === value ? { shortcut: "atual", "aria-current": "true" as const } : {})} onClick={() => { if (person.id !== value) onChange(person.id); }}>{person.name}</MenuItem>)}
      {value && <><MenuSeparator /><MenuItem icon={<Icon name="close" />} onClick={() => onChange(null)}>{emptyLabel}</MenuItem></>}
    </MenuGroup>}
  >{owner?.name ?? emptyLabel}</MenuButton>;
}
