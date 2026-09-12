import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { FilePicker } from "./FilePicker.js";

const meta: StoryMeta<typeof FilePicker> = { title: "Fundamentos/Envio de arquivos", component: FilePicker, args: { onFiles: () => undefined } };
export default meta;
type Story = StoryObj<typeof FilePicker>;
export const AreaDeEnvio: Story = {};
export const Botao: Story = { args: { appearance: "button", label: "Enviar arquivos" } };
