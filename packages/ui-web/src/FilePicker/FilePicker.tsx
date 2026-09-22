import { useId, useRef, useState, type DragEvent } from "react";
import { Icon } from "../Icon/Icon.js";
import { Button, type ButtonSize } from "../Button/Button.js";
import styles from "./FilePicker.module.css";
export interface FilePickerProps { accept?: string; multiple?: boolean; disabled?: boolean; label?: string; hint?: string; appearance?: "dropzone" | "button"; size?: ButtonSize; iconOnly?: boolean; onFiles: (files: File[]) => void }
export function FilePicker({ accept, multiple = true, disabled, label = "Solte arquivos aqui ou clique para escolher", hint = "Até 5 GB por arquivo", appearance = "dropzone", size, iconOnly, onFiles }: FilePickerProps) {
  const id = useId(); const input = useRef<HTMLInputElement>(null); const [dragging, setDragging] = useState(false);
  function deliver(list: FileList | null) { if (list?.length) onFiles(Array.from(list)); if (input.current) input.current.value = ""; }
  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); if (!disabled) deliver(event.dataTransfer.files); }
  if (appearance === "button") return <span className={styles.buttonContainer}>
    <input ref={input} id={id} type="file" accept={accept} multiple={multiple} disabled={disabled} tabIndex={-1} aria-hidden="true" className={styles.input} onChange={(event) => deliver(event.target.files)} />
    {iconOnly
      ? <Button type="button" {...(size ? { size } : {})} disabled={disabled} iconOnly icon={<Icon name="upload" />} aria-label={label} onClick={() => input.current?.click()} />
      : <Button type="button" {...(size ? { size } : {})} disabled={disabled} icon={<Icon name="upload" />} onClick={() => input.current?.click()}>{label}</Button>}
  </span>;
  return <label htmlFor={id} className={styles.root} data-dragging={dragging || undefined} data-disabled={disabled || undefined} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><input ref={input} id={id} type="file" accept={accept} multiple={multiple} disabled={disabled} className={styles.input} onChange={(event) => deliver(event.target.files)} /><span className={styles.icon}><Icon name="upload" /></span><strong>{label}</strong><small>{hint}</small></label>;
}
