import type { Meta, StoryObj } from "@storybook/react-vite";
import { Modal } from "./Modal.js";
import { ModalTrigger, ModalContent } from "./Modal.js";
import { Button } from "../Button/Button.js";
const meta: Meta<typeof Modal> = { title: "Componentes/Modal", component: Modal };
export default meta;
type Story = StoryObj<typeof Modal>;
export const Default: Story = { render: () => (<Modal><ModalTrigger render={<Button>Abrir modal</Button>} /><ModalContent title="Detalhes" description="Informações adicionais">Conteúdo da janela</ModalContent></Modal>) };
