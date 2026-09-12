import { Field } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import input from "../Input/Input.module.css";
import styles from "./Textarea.module.css";
export function Textarea({ rows = 4, className, ...props }: Omit<ComponentProps<typeof Field.Control>, "type" | "render"> & { rows?: number }) {
  return <Field.Control className={[input.root, styles.root, className].filter(Boolean).join(" ")} render={<textarea rows={rows} />} {...props} />;
}
