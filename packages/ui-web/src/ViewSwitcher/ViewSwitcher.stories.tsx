import { useState } from "react";
import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { ViewSwitcher, type ViewMode } from "./ViewSwitcher.js";

const meta: StoryMeta<typeof ViewSwitcher> = { title: "Fundamentos/Alternância de visualização", component: ViewSwitcher };
export default meta;
type Story = StoryObj<typeof ViewSwitcher>;
export const Interativa: Story = { render: () => <Example /> };

function Example() {
  const [value, setValue] = useState<ViewMode>("cards");
  return <ViewSwitcher label="Visualização dos registros" value={value} onValueChange={setValue} />;
}
