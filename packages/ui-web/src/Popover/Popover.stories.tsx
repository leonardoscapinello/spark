import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { Fileira, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover.js";

const meta: Meta<typeof Popover> = { title: "Camadas/Popover", component: Popover };
export default meta;
type Story = StoryObj<typeof Popover>;

export const Interativo: Story = { render: () => <Palco altura={260}><Popover><PopoverTrigger render={<Button variant="secondary">Abrir filtro</Button>} /><PopoverContent title="Filtros"><Field><Label>Nome</Label><Input placeholder="Buscar por nome" /></Field><Button>Aplicar</Button></PopoverContent></Popover></Palco> };
export const Variantes: Story = { render: () => <Prancha><Secao titulo="Aberto" descricao="Folha de lista com título 500 15; abre descendo 6px.">
  <Fileira rotulo="Com campo"><Palco altura={260}><Popover defaultOpen><PopoverTrigger render={<Button variant="secondary">Salvar visualização</Button>} /><PopoverContent title="Visualizações salvas"><Field><Label>Nome</Label><Input placeholder="Ex.: Qualificados de São Paulo" /></Field><Button>Salvar</Button></PopoverContent></Popover></Palco></Fileira>
</Secao></Prancha> };
export const TituloLongo: Story = { render: () => <Palco altura={240}><Popover defaultOpen><PopoverTrigger render={<Button variant="secondary">Abrir</Button>} /><PopoverContent title="Visualizações salvas por toda a equipe comercial da regional sul"><Input aria-label="Nome" /></PopoverContent></Popover></Palco> };
