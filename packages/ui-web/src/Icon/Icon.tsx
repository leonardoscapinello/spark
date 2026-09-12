import type { ComponentProps } from "react";
import styles from "./Icon.module.css";
const paths = {
  up: "m5 9.5 3-3 3 3",
  minus: "M3 8h10",
  check: "m3 8 3 3 7-7",
  close: "m4 4 8 8M12 4l-8 8",
  right: "m6 4 4 4-4 4",
  plus: "M8 3v10M3 8h10",
  chevron: "m5 6.5 3 3 3-3",
  search: "M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2Zm4 9 3 3",
  inbox: "M3 3h10l2 7v3H1v-3l2-7Zm-2 7h4l1 2h4l1-2h4",
  user: "M8 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM2 15v-2a6 6 0 0 1 12 0v2",
  mail: "M1 3h14v10H1V3Zm0 0 7 6 7-6",
  eye: "M1 8s2-5 7-5 7 5 7 5-2 5-7 5-7-5-7-5Zm7-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  eyeOff: "m2 2 12 12M5 3.6A8 8 0 0 1 8 3c5 0 7 5 7 5a12 12 0 0 1-2 2.5M10.5 12.5A8 8 0 0 1 8 13c-5 0-7-5-7-5a12 12 0 0 1 2-2.5",
  menu: "M2 3h12M2 8h12M2 13h12",
  star: "m8 1.5 2 4 4.5.6-3.2 3.1.8 4.4L8 11l-4 2.3.8-4.4-3.2-3.1 4.5-.6 2-4Z",
  message: "M2 2.5h12v8H6l-4 3v-11Z",
  upload: "M8 11V2m0 0L4.5 5.5M8 2l3.5 3.5M2 10v4h12v-4",
  download: "M8 2v9m0 0 3.5-3.5M8 11 4.5 7.5M2 14h12",
  trash: "M3 4h10M6 4V2h4v2m2 0-.6 10H4.6L4 4m3 3v4m2-4v4",
  file: "M4 1h5l3 3v11H4V1Zm5 0v3h3",
  grid: "M2 2h5v5H2V2Zm7 0h5v5H9V2ZM2 9h5v5H2V9Zm7 0h5v5H9V9Z",
  building: "M2.5 14V3l5.5-2 5.5 2v11M1 14h14M5 5h1m4 0h1M5 8h1m4 0h1M5 11h1m4 0h1M7 14v-3h2v3",
  briefcase: "M2 5h12v9H2V5Zm3 0V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M2 9h12M7 8v2h2V8",
  bolt: "M9 1 3.5 8H8l-1 7 5.5-8H8l1-6Z",
  calendar: "M2 3h12v11H2V3Zm3-2v4m6-4v4M2 7h12",
  settings: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm0 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  chart: "M2 13V8m4 5V3m4 10V6m4 7V1M1 14h14",
  team: "M6 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm6 .5a2 2 0 1 0 0 4M1.5 14v-2a4.5 4.5 0 0 1 9 0v2m1.5-5a3 3 0 0 1 2.5 3v2",
  exit: "M6 2H2v12h4m4-9 4 3-4 3m4-3H5",
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: { name: IconName } & Omit<ComponentProps<"svg">, "children">) {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.root} {...props}><path d={paths[name]} /></svg>;
}
