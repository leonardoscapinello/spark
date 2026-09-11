import { useId, useRef, useState, type DragEvent } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./FilePicker.module.css";
export interface FilePickerProps { accept?: string; multiple?: boolean; disabled?: boolean; label?: string; hint?: string; onFiles: (files: File[]) => void }
export function FilePicker({ accept, multiple = true, disabled, label = "Solte arquivos aqui ou clique para escolher", hint = "Até 5 GB por arquivo", onFiles }: FilePickerProps) {
  const id = useId(); const input = useRef<HTMLInputElement>(null); const [dragging, setDragging] = useState(false);
  function deliver(list: FileList | null) { if (list?.length) onFiles(Array.from(list)); if (input.current) input.current.value = ""; }
  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); if (!disabled) deliver(event.dataTransfer.files); }
  return <label htmlFor={id} className={styles.root} data-dragging={dragging || undefined} data-disabled={disabled || undefined} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><input ref={input} id={id} type="file" accept={accept} multiple={multiple} disabled={disabled} className={styles.input} onChange={(event) => deliver(event.target.files)} /><span className={styles.icon}><Icon name="upload" /></span><strong>{label}</strong><small>{hint}</small></label>;
}
