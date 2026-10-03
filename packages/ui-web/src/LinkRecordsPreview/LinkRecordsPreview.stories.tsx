import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { LinkRecordsPreview } from "./LinkRecordsPreview.js";

const meta: Meta<typeof LinkRecordsPreview> = { title: "Padrões/Prévia de vínculo", component: LinkRecordsPreview, args: { person: "Carla Prado", company: "Acme Brasil" } };
export default meta;
type Story = StoryObj<typeof LinkRecordsPreview>;

export const Interativo: Story = { render: (args) => <Mesa largura={440}><LinkRecordsPreview {...args} /></Mesa> };
export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Vínculo pessoa → empresa">
    <Fileira rotulo="Padrão" topo><Mesa largura={440}><LinkRecordsPreview person="Carla Prado" company="Acme Brasil" /></Mesa></Fileira>
    <Fileira rotulo="Nomes longos" topo><Mesa largura={440}><LinkRecordsPreview person="Ana Beatriz de Oliveira Santos" company="Companhia Brasileira de Distribuição e Logística" /></Mesa></Fileira>
    <Fileira rotulo="Estreito" topo><Mesa largura={300}><LinkRecordsPreview person="Rafael Moura" company="Nimbus" /></Mesa></Fileira>
  </Secao></Prancha>,
};
