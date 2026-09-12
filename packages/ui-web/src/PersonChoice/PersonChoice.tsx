import { Avatar } from "../Avatar/Avatar.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import styles from "./PersonChoice.module.css";

export interface PersonChoiceProps {
  name: string;
  detail?: string;
  avatarUrl?: string | null;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function PersonChoice({ name, detail, avatarUrl, checked, disabled, onCheckedChange }: PersonChoiceProps) {
  return <div className={styles.root} data-checked={checked || undefined}>
    <Checkbox checked={checked} disabled={disabled} onCheckedChange={onCheckedChange}>
      <span className={styles.person}>
        <Avatar name={name} src={avatarUrl ?? null} size="small" />
        <span className={styles.copy}>
          <strong>{name}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </span>
    </Checkbox>
  </div>;
}
