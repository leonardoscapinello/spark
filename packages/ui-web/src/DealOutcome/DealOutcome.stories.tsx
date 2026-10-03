import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { DealOutcomeCelebration, celebrateDealOutcome } from "./DealOutcome.js";

const meta: Meta<typeof DealOutcomeCelebration> = { title: "Retorno/Desfecho do negócio", component: DealOutcomeCelebration };
export default meta;
type Story = StoryObj<typeof DealOutcomeCelebration>;

/** O aviso escuta o evento global: dispare um desfecho e ele sobe do topo. */
export const Interativo: Story = {
  render: () => <Prancha><Secao titulo="Disparar" descricao="Pílula de carvão que sobe como toast; o ganho solta um halo no disco.">
    <Fileira rotulo="Desfechos">
      <Button variant="secondary" tone="success" onClick={() => celebrateDealOutcome({ status: "won", name: "Contrato anual Acme" })}>Ganho</Button>
      <Button variant="secondary" tone="danger" onClick={() => celebrateDealOutcome({ status: "lost", name: "Renovação Nimbus" })}>Perdido</Button>
      <Button variant="ghost" onClick={() => celebrateDealOutcome({ status: "won" })}>Ganho sem nome</Button>
      <Button variant="ghost" onClick={() => celebrateDealOutcome({ status: "lost", name: "Implantação completa do CRM para a operação comercial nacional com 40 lojas" })}>Nome longo</Button>
    </Fileira>
    <DealOutcomeCelebration />
  </Secao></Prancha>,
};
