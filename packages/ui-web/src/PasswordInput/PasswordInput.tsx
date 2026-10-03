import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input, type InputProps } from "../Input/Input.js";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { syncCharcoal } from "../motion/charcoal.js";
import styles from "./PasswordInput.module.css";

/**
 * Senha (origem: Campos, "Senha"): o mesmo campo cavado, botão de tinta de 28
 * para mostrar/ocultar dentro da pílula, e cada caractere escondido vira uma
 * marca de carvão. O input real continua lá — leitor de tela, autofill e
 * gerenciador de senha usam ele normalmente.
 */
export function PasswordInput({ id, disabled, readOnly, size = "md", className, onInput, ...props }: Omit<InputProps, "type">) {
  const generatedId = useId();
  const [visible, setVisible] = useState(false);
  const inputId = id ?? generatedId;
  const overlay = useRef<HTMLSpanElement>(null);
  const sync = useCallback(() => {
    const input = document.getElementById(inputId);
    if (input instanceof HTMLInputElement && overlay.current) syncCharcoal(input, overlay.current);
  }, [inputId]);
  useEffect(() => {
    sync();
    // Autofill do navegador não dispara input: confere o valor de tempos em tempos, como a origem.
    const timer = window.setInterval(sync, 350);
    return () => window.clearInterval(timer);
  }, [sync, visible]);
  return <div className={styles.root}>
    <Input
      {...props}
      id={inputId}
      size={size}
      disabled={disabled}
      readOnly={readOnly}
      type={visible ? "text" : "password"}
      className={[styles.input, className].filter(Boolean).join(" ")}
      onInput={(event) => { sync(); onInput?.(event); }}
      endAdornment={<>
        <span ref={overlay} className={styles.charcoal} aria-hidden="true" />
        <Button type="button" size="sm" variant="ghost" iconOnly disabled={disabled} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-controls={inputId} aria-pressed={visible} onClick={() => setVisible(v => !v)} icon={<Icon name={visible ? "eyeOff" : "eye"} />} />
      </>}
    />
  </div>;
}
