import type { ReactNode } from "react";
import styles from "./PageFrame.module.css";

export interface PageFrameProps {
  children: ReactNode;
  width?: "fluid" | "content";
  className?: string;
}

export function PageFrame({ children, width = "fluid", className }: PageFrameProps) {
  return <div className={[styles.root, width === "content" && styles.content, className].filter(Boolean).join(" ")}>{children}</div>;
}
