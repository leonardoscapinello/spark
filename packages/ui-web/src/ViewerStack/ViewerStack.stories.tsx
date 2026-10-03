import type { Meta, StoryObj } from "@storybook/react-vite";
import { userId } from "@spark/core";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { ViewerStack } from "./ViewerStack.js";

const viewers = ["Ana Oliveira", "Bruno Sá", "Carla Prado", "Daniel Lima", "Elisa Moura", "Fábio Costa"].map((name) => ({ userId: userId.create(), name, avatarUrl: null }));
const meta: Meta<typeof ViewerStack> = { title: "Dados/Pessoas visualizando", component: ViewerStack, decorators: [(Story) => <TooltipProvider><Story /></TooltipProvider>], args: { viewers: viewers.slice(0, 3), status: "connected" } };
export default meta;
type Story = StoryObj<typeof ViewerStack>;

export const Interativo: Story = {};
export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Estados" descricao="Pilha de avatares de 24 em −8px; o excedente vira +N.">
    <Fileira rotulo="Uma pessoa"><ViewerStack viewers={viewers.slice(0, 1)} status="connected" /></Fileira>
    <Fileira rotulo="Algumas"><ViewerStack viewers={viewers.slice(0, 3)} status="connected" /></Fileira>
    <Fileira rotulo="Muitas (+N)"><ViewerStack viewers={viewers} status="connected" /></Fileira>
    <Fileira rotulo="Conectando"><ViewerStack viewers={[]} status="connecting" /></Fileira>
    <Fileira rotulo="Sem conexão"><ViewerStack viewers={[]} status="unavailable" /></Fileira>
  </Secao></Prancha>,
};
