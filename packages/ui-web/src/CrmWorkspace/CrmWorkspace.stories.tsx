import type { Meta, StoryObj } from "@storybook/react-vite";
import { CrmWorkspace, CrmSection, CrmLabel, CrmPhase, DealStageActions } from "./CrmWorkspace.js";
import { Button } from "../Button/Button.js";
const meta = { title: "CRM/Área do negócio", component: CrmWorkspace } satisfies Meta<typeof CrmWorkspace>;
export default meta;
export const ThreeColumns: StoryObj<typeof meta> = { args: { context: <CrmSection title="Negócio" description="Pessoa, empresa e contexto"><CrmLabel color="purple">Consultoria</CrmLabel></CrmSection>, current: <CrmSection title="Fase atual" description="Campos e informações desta etapa"><CrmLabel color="blue">Qualificação</CrmLabel></CrmSection>, actions: <CrmSection title="Próximos passos"><Button>Enviar proposta</Button></CrmSection> } };

export const QuickDeal: StoryObj<typeof meta> = { args: {
  context: <CrmSection title="Resumo"><CrmLabel color="purple">Consultoria</CrmLabel></CrmSection>,
  current: <CrmPhase name="Qualificação" count={2}><CrmSection title="Origem do negócio" description="Importante"><Button variant="secondary">Indicação</Button></CrmSection></CrmPhase>,
  actions: <DealStageActions destinations={[{ id: "proposal", label: "Proposta", color: "blue", detail: "Avançar" }, { id: "contact", label: "Contato", color: "amber", detail: "Retornar" }]} onMove={() => {}} onWon={() => {}} onLost={() => {}} />,
} };
