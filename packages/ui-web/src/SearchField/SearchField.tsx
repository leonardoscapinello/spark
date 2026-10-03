import { useRef, type KeyboardEvent } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { inkTyping } from "../motion/inkTyping.js";
import { Spinner } from "../Spinner/Spinner.js";
import styles from "./SearchField.module.css";

export interface SearchFieldProps {
  /** Nome acessível: na barra de coleção a busca não tem rótulo visível. */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Resultado chegando: o ensō de 14 entra antes do botão de limpar. */
  loading?: boolean;
  /** Atalho mostrado à direita (ex.: "⌘K"). Só o desenho: quem chama liga a tecla. */
  shortcut?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Busca (origem: Campos, "Busca"): campo de verdade, não item de lista. Pílula
 * cavada com lupa de 16; com texto, aparece o × de 28 (Esc também limpa). A
 * altura é a do campo (--h-field): 40, ou 36 dentro da barra de coleção.
 */
export function SearchField({ label, value, onValueChange, placeholder = "Buscar", loading = false, shortcut, autoFocus, disabled, className }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const clear = () => { onValueChange(""); input.current?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value) { event.preventDefault(); event.stopPropagation(); onValueChange(""); }
  };
  return <div className={[styles.root, className].filter(Boolean).join(" ")} data-disabled={disabled || undefined}>
    <span className={styles.icon} aria-hidden="true"><Icon name="search" /></span>
    <input
      ref={input}
      type="search"
      className={styles.input}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      autoComplete="off"
      spellCheck={false}
      onKeyDown={onKeyDown}
      onInput={(event) => inkTyping(event.nativeEvent as InputEvent)}
      onChange={(event) => onValueChange(event.target.value)}
    />
    {loading && <Spinner size="sm" label="Buscando" />}
    {value && !disabled && <Button type="button" variant="ghost" size="sm" iconOnly icon={<Icon name="close" />} aria-label="Limpar busca" className={styles.clear} onClick={clear} />}
    {shortcut && !value && <kbd className={styles.kbd}>{shortcut}</kbd>}
  </div>;
}
