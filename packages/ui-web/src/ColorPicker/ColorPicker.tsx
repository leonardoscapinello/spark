import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Input } from "../Input/Input.js";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import s from "./ColorPicker.module.css";

export interface CrmColorOption {
  value: string;
  label: string;
  swatch: string;
}

export const CRM_COLOR_OPTIONS: readonly CrmColorOption[] = [
  { value: "neutral", label: "Cinza", swatch: "var(--color-inkMuted)" },
  { value: "blue", label: "Azul", swatch: "var(--color-accent)" },
  { value: "green", label: "Verde", swatch: "var(--color-statusSuccess)" },
  { value: "red", label: "Vermelho", swatch: "var(--color-statusDanger)" },
  { value: "amber", label: "Âmbar", swatch: "var(--color-statusWarning)" },
  { value: "purple", label: "Roxo", swatch: "color-mix(in srgb, var(--color-accent), var(--color-statusDanger))" },
  { value: "#06BFF5", label: "Ciano", swatch: "#06BFF5" },
  { value: "#C8A65D", label: "Dourado", swatch: "#C8A65D" },
  { value: "#6B5DD3", label: "Íris", swatch: "#6B5DD3" },
  { value: "#D45B9C", label: "Rosa", swatch: "#D45B9C" },
  { value: "#E8784A", label: "Coral", swatch: "#E8784A" },
  { value: "#4A8DDE", label: "Céu", swatch: "#4A8DDE" },
];
type SwatchStyle = CSSProperties & { "--swatch": string };
function swatchStyle(value: string): SwatchStyle { return { "--swatch": value }; }

export function ColorPicker({ label, value, onValueChange, options = CRM_COLOR_OPTIONS }: { label: string; value: string; onValueChange: (value: string) => void; options?: readonly CrmColorOption[] }) {
  const [draft, setDraft] = useState(isHex(value) ? value : "");
  const [error, setError] = useState(false);
  const selectedSwatch = useRef<HTMLSpanElement>(null);
  const [resolvedColor, setResolvedColor] = useState("");
  useEffect(() => {
    if (!selectedSwatch.current) return;
    const color = getComputedStyle(selectedSwatch.current).backgroundColor;
    const channels = color.match(/[\d.]+/g);
    if (!channels || channels.length < 3) return;
    const scale = color.startsWith("color(srgb ") ? 255 : 1;
    setResolvedColor(`#${channels.slice(0, 3).map((channel) => Math.round(Number(channel) * scale).toString(16).padStart(2, "0")).join("")}`);
  }, [value]);
  const customValue = isHex(value) ? value : resolvedColor;

  function choose(next: string) {
    setError(false);
    setDraft(isHex(next) ? next : "");
    onValueChange(next);
  }

  function chooseCustom(next: string) {
    const normalized = next.trim().toUpperCase();
    setDraft(next);
    if (!isHex(normalized)) {
      setError(next.trim() !== "");
      return;
    }
    setError(false);
    onValueChange(normalized);
  }

  return <div className={s.root} role="group" aria-label={label}>
    <div className={s.grid} role="radiogroup" aria-label={`${label} predefinida`}>
      {options.map((option) => {
        const selected = value === option.value;
        return <Button key={option.value} type="button" variant="ghost" className={s.option} data-selected={selected || undefined} role="radio" aria-checked={selected} onClick={() => choose(option.value)} title={option.label} aria-label={option.label}>
          <span ref={selected ? selectedSwatch : undefined} className={s.swatch} style={swatchStyle(option.swatch)} aria-hidden="true">{selected && <Icon name="check" />}</span>
        </Button>;
      })}
    </div>
    <div className={s.custom}>
      <span className={s.customLabel}>Personalizada</span>
      <Input aria-label="Cor hexadecimal" value={draft} placeholder="#RRGGBB" onChange={(event) => chooseCustom(event.target.value)} onBlur={() => { if (draft && !isHex(draft)) setError(true); }} />
      <input className={s.native} aria-label="Selecionar cor" type="color" value={customValue} onChange={(event) => chooseCustom(event.target.value)} style={{ backgroundColor: customValue }} />
    </div>
    {error && <span className={s.error} role="alert">Use seis caracteres hexadecimais, como #1B45E8.</span>}
  </div>;
}

function isHex(value: string): boolean { return /^#[0-9a-fA-F]{6}$/.test(value); }
