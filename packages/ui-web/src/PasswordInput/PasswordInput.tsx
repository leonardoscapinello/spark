import { useId, useState } from "react";
import { Input, type InputProps } from "../Input/Input.js";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import styles from "./PasswordInput.module.css";
export function PasswordInput({ id, disabled, readOnly, size = "md", ...props }: Omit<InputProps, "type">) {
  const generatedId = useId();
  const [visible, setVisible] = useState(false);
  const inputId = id ?? generatedId;
  return <div className={styles.root}>
    <Input {...props} id={inputId} size={size} disabled={disabled} readOnly={readOnly} type={visible ? "text" : "password"} className={styles.input} />
    <Button type="button" size="sm" variant="ghost" iconOnly disabled={disabled} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-controls={inputId} aria-pressed={visible} onClick={() => setVisible(v => !v)} icon={<Icon name={visible ? "eyeOff" : "eye"} />} />
  </div>;
}
