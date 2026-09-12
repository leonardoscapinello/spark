import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { BackLink } from "./BackLink.js";

const meta: StoryMeta<typeof BackLink> = {
  title: "Navegação/Voltar",
  component: BackLink,
  args: { href: "/deals", children: "Negócios" },
};
export default meta;
type Story = StoryObj<typeof BackLink>;
export const Padrao: Story = {};
