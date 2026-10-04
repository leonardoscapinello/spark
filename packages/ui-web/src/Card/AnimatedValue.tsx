import { useState, type CSSProperties } from "react";
import s from "./AnimatedValue.module.css";

const digits = "0123456789";

/**
 * Odômetro (origem: Dados, "Odômetro"): cada dígito rola para cima quando sobe
 * e para baixo quando desce, em 900 ms, com 55 ms de atraso por casa contando
 * da unidade. As casas são alinhadas pelo fim do texto, para o número que ganha
 * uma casa não deslocar os dígitos que já estavam lá. A string formatada
 * continua sendo o único valor anunciado por tecnologia assistiva.
 */
export function AnimatedValue({ value, paused = false }: { value: string | number; paused?: boolean }) {
  const [displayed, setDisplayed] = useState(value);
  if (!paused && displayed !== value) setDisplayed(value);
  const text = String(displayed);
  return <span className={s.root}>
    <span className={s.accessible}>{text}</span>
    <span aria-hidden="true" className={s.visual}>{Array.from(text, (character, index) => {
      const fromEnd = text.length - 1 - index;
      if (!digits.includes(character)) return <span key={`s${fromEnd}`} className={s.separator}>{character}</span>;
      return <span key={`d${fromEnd}`} className={s.digit}><span className={s.reel} style={{ "--p": fromEnd, transform: `translateY(${-Number(character)}em)` } as CSSProperties} /></span>;
    })}</span>
  </span>;
}
