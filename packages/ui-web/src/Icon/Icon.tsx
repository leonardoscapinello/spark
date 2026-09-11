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
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: { name: IconName } & Omit<ComponentProps<"svg">, "children">) {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.root} {...props}><path d={paths[name]} /></svg>;
}
