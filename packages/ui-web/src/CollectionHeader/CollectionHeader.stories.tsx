import type { Meta, StoryObj } from "@storybook/react-vite";
import { CollectionHeader } from "./CollectionHeader.js";
import { Button } from "../Button/Button.js";
const meta: Meta<typeof CollectionHeader> = { title: "Estrutura/Cabeçalho de coleção", component: CollectionHeader };
export default meta;
type Story = StoryObj<typeof CollectionHeader>;
export const Funil: Story = { args: { label: "Negócios", selection: <Button variant="secondary">Funil de demonstração</Button>, count: "0 negócios", value: "R$ 0,00", actions: <Button>Novo negócio</Button> } };
