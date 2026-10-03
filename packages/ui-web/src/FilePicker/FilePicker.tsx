import { useId, useRef, useState, type DragEvent } from "react";
import { Icon } from "../Icon/Icon.js";
import { IconTile } from "../IconTile/IconTile.js";
import { Button, type ButtonSize } from "../Button/Button.js";
import styles from "./FilePicker.module.css";
export interface FilePickerProps { accept?: string; multiple?: boolean; disabled?: boolean; label?: string; hint?: string; appearance?: "dropzone" | "button"; size?: ButtonSize; iconOnly?: boolean; /** Arquivo já escolhido: a área mostra o ✓ e o nome, e continua aceitando outro. */ selectedName?: string; onFiles: (files: File[]) => void }
/** Envio (origem: Campos, "Upload"): área cavada de raio 28 com tracejado de 1,5; arrastando, a borda vira tinta e o fundo, realce. */
export function FilePicker({ accept, multiple = true, disabled, label = "Solte arquivos aqui ou clique para escolher", hint = "Até 5 GB por arquivo", appearance = "dropzone", size, iconOnly, selectedName, onFiles }: FilePickerProps) {
  const id = useId(); const input = useRef<HTMLInputElement>(null); const [dragging, setDragging] = useState(false);
  function deliver(list: FileList | null) { if (list?.length) onFiles(Array.from(list)); if (input.current) input.current.value = ""; }
  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); if (!disabled) deliver(event.dataTransfer.files); }
  if (appearance === "button") return <span className={styles.buttonContainer}>
    <input ref={input} id={id} type="file" accept={accept} multiple={multiple} disabled={disabled} tabIndex={-1} aria-hidden="true" className={styles.input} onChange={(event) => deliver(event.target.files)} />
    {iconOnly
      ? <Button type="button" {...(size ? { size } : {})} disabled={disabled} iconOnly icon={<Icon name="upload" />} aria-label={label} onClick={() => input.current?.click()} />
      : <Button type="button" {...(size ? { size } : {})} disabled={disabled} icon={<Icon name="upload" />} onClick={() => input.current?.click()}>{label}</Button>}
  </span>;
  return <label htmlFor={id} className={styles.root} data-dragging={dragging || undefined} data-disabled={disabled || undefined} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><input ref={input} id={id} type="file" accept={accept} multiple={multiple} disabled={disabled} className={styles.input} onChange={(event) => deliver(event.target.files)} />{selectedName ? <><IconTile icon="check" tone="success" /><strong>{selectedName}</strong><small>Solte outro arquivo ou clique para trocar</small></> : <><IconTile icon="upload" surface="folha" /><strong>{label}</strong><small>{hint}</small></>}</label>;
}
