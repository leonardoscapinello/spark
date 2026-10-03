import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { CrmLabel, CrmPhase, CrmSection, CrmWorkspace, CRM_COLORS, DealStageActions } from "./CrmWorkspace.js";

const meta: Meta<typeof CrmWorkspace> = {
  title: "Padrões/Área do CRM",
  component: CrmWorkspace,
  args: {
    context: <CrmSection title="Negócio" description="Pessoa, empresa e contexto"><CrmLabel color="purple">Consultoria</CrmLabel></CrmSection>,
    current: <CrmPhase name="Qualificação" color="blue" count={2}><CrmSection title="Origem do negócio" description="Importante"><Button variant="secondary">Indicação</Button></CrmSection></CrmPhase>,
    actions: <DealStageActions destinations={[{ id: "contato", label: "Contato feito", color: "amber", detail: "Retornar" }, { id: "qualificado", label: "Qualificação", color: "blue", detail: "Atual", current: true }, { id: "proposta", label: "Proposta enviada", color: "purple", detail: "Avançar" }]} onMove={() => undefined} onWon={() => undefined} onLost={() => undefined} />,
  },
};
export default meta;
type Story = StoryObj<typeof CrmWorkspace>;

export const Interativo: Story = {};

export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Etiqueta de CRM" descricao="Chip neutro; a cor da etiqueta ou da etapa fica só no ponto.">
      <Fileira rotulo="Cores">{CRM_COLORS.map((color) => <CrmLabel key={color.value} color={color.value}>{color.label}</CrmLabel>)}<CrmLabel color="#c2410c">Cor própria</CrmLabel></Fileira>
      <Fileira rotulo="Pequena (cartão)"><CrmLabel size="sm" color="blue">cliente</CrmLabel><CrmLabel size="sm">demo</CrmLabel></Fileira>
    </Secao>
    <Secao titulo="Mover negócio" descricao="Lista de escolhas com a etapa atual marcada; Ganho e Perdido com o rótulo inteiro.">
      <Fileira rotulo="Aberto" topo><Mesa largura={300}><DealStageActions destinations={[{ id: "contato", label: "Contato feito", color: "amber", detail: "Retornar" }, { id: "qualificado", label: "Qualificado", color: "blue", detail: "Atual", current: true }, { id: "proposta", label: "Proposta enviada", color: "purple", detail: "Avançar" }, { id: "negociacao", label: "Negociação", color: "green", detail: "Avançar" }]} onMove={() => undefined} onWon={() => undefined} onLost={() => undefined} /></Mesa></Fileira>
      <Fileira rotulo="Sem destinos" topo><Mesa largura={300}><DealStageActions destinations={[{ id: "qualificado", label: "Qualificado", color: "blue", detail: "Atual", current: true }]} onMove={() => undefined} /></Mesa></Fileira>
      <Fileira rotulo="Encerrado" topo><Mesa largura={300}><DealStageActions closed destinations={[]} onMove={() => undefined} /></Mesa></Fileira>
      <Fileira rotulo="Coluna estreita" topo><Mesa largura={200}><DealStageActions destinations={[{ id: "proposta", label: "Proposta enviada para a diretoria", color: "purple", detail: "Avançar" }]} onMove={() => undefined} onWon={() => undefined} onLost={() => undefined} /></Mesa></Fileira>
    </Secao>
    <Secao titulo="Fase e seção">
      <Fileira rotulo="Fase" topo><Mesa largura={420}><CrmPhase name="Negociação" color="green" title="Nesta etapa" count={1}><CrmSection title="Orçamento aprovado" description="Obrigatório para avançar"><Button variant="secondary">Registrar</Button></CrmSection></CrmPhase></Mesa></Fileira>
    </Secao>
  </Prancha>,
};
