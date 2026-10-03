import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Fileira, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { Tooltip, TooltipProvider } from "./Tooltip.js";

const meta: Meta<typeof Tooltip> = {
  title: "Camadas/Dica",
  component: Tooltip,
  args: { content: "Atribuir a conversa", children: <Button variant="ghost" iconOnly icon={<Icon name="user" />} aria-label="Atribuir" />, size: "default", appearance: "help", side: "top", pinOnClick: true },
  argTypes: {
    size: { control: "inline-radio", options: ["default", "compact"] },
    appearance: { control: "inline-radio", options: ["help", "surface"] },
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] },
    children: { control: false },
  },
  decorators: [Story => <TooltipProvider><Story /></TooltipProvider>],
  parameters: {
    docs: { description: { component: "Dica: pílula de carvão que entra depois de 250 ms e sai na hora. Abre por hover e por foco do teclado; um clique fixa a dica de ajuda. A variante folha é para conteúdo mais longo." } },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Interativo: Story = { decorators: [Story => <Palco altura={200}><Story /></Palco>] };

export const Variantes: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Aparências e tamanhos" descricao="Passe o cursor ou use Tab em cada botão.">
        <Fileira rotulo="Ajuda · carvão">
          <Tooltip content="Mais informações sobre o prazo de resposta."><Button variant="secondary" icon={<Icon name="info" />}>Padrão</Button></Tooltip>
          <Tooltip size="compact" pinOnClick={false} content="Automações"><Button variant="ghost" iconOnly icon={<Icon name="zap" />} aria-label="Automações" /></Tooltip>
        </Fileira>
        <Fileira rotulo="Folha · surface">
          <Tooltip appearance="surface" content="O prazo conta a partir da primeira mensagem do cliente e pausa fora do horário de atendimento."><Button variant="secondary" icon={<Icon name="clock" />}>Texto longo</Button></Tooltip>
        </Fileira>
        <Fileira rotulo="Lados">
          {(["top", "right", "bottom", "left"] as const).map(lado => (
            <Tooltip key={lado} side={lado} size="compact" pinOnClick={false} content={`Dica em ${lado}`}><Button variant="secondary" size="sm">{lado}</Button></Tooltip>
          ))}
        </Fileira>
      </Secao>
    </Prancha>
  ),
};
