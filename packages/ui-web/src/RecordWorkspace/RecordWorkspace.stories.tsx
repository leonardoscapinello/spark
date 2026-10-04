import type { Meta, StoryObj } from "@storybook/react-vite";
import { RecordWorkspace } from "./RecordWorkspace.js";
import { Button } from "../Button/Button.js";
const meta = { title: "Padrões/Ficha de atendimento", component: RecordWorkspace } satisfies Meta<typeof RecordWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Atendimento: Story = { args: { context: "Dados e campos do negócio", actions: <Button>Adicionar nota</Button>, children: "Atividades e histórico" } };
