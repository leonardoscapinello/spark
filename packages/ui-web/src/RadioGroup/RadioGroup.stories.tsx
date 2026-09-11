import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioGroup } from "./RadioGroup.js";

const meta: Meta<typeof RadioGroup> = { title: "Componentes/RadioGroup", component: RadioGroup };
export default meta;
type Story = StoryObj<typeof RadioGroup>;
export const Default: Story = { render: () => (<RadioGroup label="Visibilidade" options={[{value:"me",label:"Somente eu"},{value:"all",label:"Todos"}]} />) };
