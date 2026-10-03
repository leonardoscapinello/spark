import { Field } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import { inkTyping } from "../motion/inkTyping.js";
import input from "../Input/Input.module.css";
import styles from "./Textarea.module.css";
export function Textarea({ rows = 4, className, onInput, ...props }: Omit<ComponentProps<typeof Field.Control>, "type" | "render"> & { rows?: number }) {
  return <Field.Control className={[input.root, styles.root, className].filter(Boolean).join(" ")} render={<textarea rows={rows} />} onInput={(event) => { inkTyping(event.nativeEvent as InputEvent); onInput?.(event); }} {...props} />;
}
