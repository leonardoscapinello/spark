import s from "./AnimatedValue.module.css";

const digits = "0123456789";

/** A string formatada continua sendo o único valor anunciado por tecnologia assistiva. */
export function AnimatedValue({ value }: { value: string | number }) {
  const text = String(value);
  return <span className={s.root}>
    <span className={s.accessible}>{text}</span>
    <span aria-hidden="true" className={s.visual}>{Array.from(text, (character, index) => {
      if (!digits.includes(character)) return <span key={text.length - index}>{character}</span>;
      return <span key={text.length - index} className={s.digit}><span className={s.reel} style={{ transform: `translateY(${-Number(character)}em)` }} /></span>;
    })}</span>
  </span>;
}
