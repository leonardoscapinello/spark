import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "./Icon.js";

const meta: Meta<typeof Icon> = { title: "Componentes/Icon", component: Icon };
export default meta;
type Story = StoryObj<typeof Icon>;
export const Default: Story = { render: () => (<Icon name="inbox" />) };
