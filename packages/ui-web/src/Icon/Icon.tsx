import type { ComponentProps } from "react";
import styles from "./Icon.module.css";
const paths = {
  up: "m5 9.5 3-3 3 3",
  minus: "M3 8h10",
  check: "m3 8 3 3 7-7",
  close: "m4 4 8 8M12 4l-8 8",
  right: "m6 4 4 4-4 4",
  undo: "M5 5H2V2m0 3 3-3m-3 3h7a5 5 0 0 1 0 10H6",
  plus: "M8 3v10M3 8h10",
  chevron: "m5 6.5 3 3 3-3",
  search: "M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2Zm4 9 3 3",
  inbox: "M3 3h10l2 7v3H1v-3l2-7Zm-2 7h4l1 2h4l1-2h4",
  user: "M8 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM2 15v-2a6 6 0 0 1 12 0v2",
  account: "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.6 12.5a4.5 4.5 0 0 1 8.8 0",
  mail: "M1 3h14v10H1V3Zm0 0 7 6 7-6",
  phone: "M3 1h2l1 3-1.5 1.5a10 10 0 0 0 6 6L12 10l3 1v2a2 2 0 0 1-2.2 2A13 13 0 0 1 1 3.2 2 2 0 0 1 3 1Z",
  eye: "M1 8s2-5 7-5 7 5 7 5-2 5-7 5-7-5-7-5Zm7-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  eyeOff: "m2 2 12 12M5 3.6A8 8 0 0 1 8 3c5 0 7 5 7 5a12 12 0 0 1-2 2.5M10.5 12.5A8 8 0 0 1 8 13c-5 0-7-5-7-5a12 12 0 0 1 2-2.5",
  menu: "M2 3h12M2 8h12M2 13h12",
  more: "M3 8h.01M8 8h.01M13 8h.01",
  star: "m8 1.5 2 4 4.5.6-3.2 3.1.8 4.4L8 11l-4 2.3.8-4.4-3.2-3.1 4.5-.6 2-4Z",
  message: "M2 2.5h12v8H6l-4 3v-11Z",
  upload: "M8 11V2m0 0L4.5 5.5M8 2l3.5 3.5M2 10v4h12v-4",
  download: "M8 2v9m0 0 3.5-3.5M8 11 4.5 7.5M2 14h12",
  trash: "M3 4h10M6 4V2h4v2m2 0-.6 10H4.6L4 4m3 3v4m2-4v4",
  file: "M4 1h5l3 3v11H4V1Zm5 0v3h3",
  page: "M1 2h14v12H1V2Zm0 3h14M4 3.5h.01m2 0h.01M4 8h8M4 10.5h5",
  form: "M3 1h10v14H3V1Zm2 4h2v2H5V5Zm4 1h2M5 9h2v2H5V9Zm4 1h2",
  folder: "M1 4h6l1.5 2H15v8H1V4Zm0 2h14",
  image: "M2 2h12v12H2V2Zm2 9 3-3 2 2 2-3 2 4H4Zm2-6h.01",
  text: "M2 3h12M2 7h12M2 11h9M2 14h7",
  grid: "M2 2h5v5H2V2Zm7 0h5v5H9V2ZM2 9h5v5H2V9Zm7 0h5v5H9V9Z",
  building: "M2.5 14V3l5.5-2 5.5 2v11M1 14h14M5 5h1m4 0h1M5 8h1m4 0h1M5 11h1m4 0h1M7 14v-3h2v3",
  briefcase: "M2 5h12v9H2V5Zm3 0V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M2 9h12M7 8v2h2V8",
  bolt: "M9 1 3.5 8H8l-1 7 5.5-8H8l1-6Z",
  calendar: "M2 3h12v11H2V3Zm3-2v4m6-4v4M2 7h12",
  settings: "M6.1 1h3.8l.4 1.7 1.2.7 1.6-.5L15 6.2l-1.2 1.1v1.4l1.2 1.1-1.9 3.3-1.6-.5-1.2.7-.4 1.7H6.1l-.4-1.7-1.2-.7-1.6.5L1 9.8l1.2-1.1V7.3L1 6.2l1.9-3.3 1.6.5 1.2-.7L6.1 1ZM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  chart: "M2 13V8m4 5V3m4 10V6m4 7V1M1 14h14",
  team: "M6 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm6 .5a2 2 0 1 0 0 4M1.5 14v-2a4.5 4.5 0 0 1 9 0v2m1.5-5a3 3 0 0 1 2.5 3v2",
  exit: "M6 2H2v12h4m4-9 4 3-4 3m4-3H5",
  pushpin: "M6 2h4v4l2 3H4l2-3V2ZM8 9v5",
  filter: "M2 3h12L9.5 8.5V13l-3 1V8.5L2 3Z",
  /* Glifos de TIPO DE CAMPO (Pipefy): quem varre o painel reconhece o campo
   * pelo desenho antes de ler o rótulo. */
  hash: "M6.5 2.5 5 13.5M11 2.5 9.5 13.5M2.5 6h11M2 10h11",
  coin: "M8 2.2a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6ZM10 5.8H7.3a1.3 1.3 0 0 0 0 2.5h1.4a1.3 1.3 0 0 1 0 2.6H6",
  link: "M6.8 9.2a2.8 2.8 0 0 1 0-4l1.4-1.4a2.8 2.8 0 0 1 4 4l-.7.7M9.2 6.8a2.8 2.8 0 0 1 0 4l-1.4 1.4a2.8 2.8 0 0 1-4-4l.7-.7",
  list: "M6 4h8M6 8h8M6 12h8M3 4h.01M3 8h.01M3 12h.01",
  /* Lápis: o sinal de «isto dá para mudar aqui mesmo». */
  pencil: "M11.5 2.5a1.4 1.4 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z",
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: { name: IconName } & Omit<ComponentProps<"svg">, "children">) {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.root} {...props}><path d={paths[name]} /></svg>;
}
