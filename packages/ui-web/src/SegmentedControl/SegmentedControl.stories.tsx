import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SegmentedControl } from "./SegmentedControl.js";

const meta: Meta<typeof SegmentedControl> = { title: "Fundamentos/Controle segmentado", component: SegmentedControl };
export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const EditorEPrevia: Story = { render: () => <Example /> };

function Example() {
  const [value, setValue] = useState<"editor" | "preview">("editor");
  return <SegmentedControl label="Visualização da página" value={value} options={[{ value: "editor", label: "Editar" }, { value: "preview", label: "Prévia" }]} onValueChange={setValue} />;
}
