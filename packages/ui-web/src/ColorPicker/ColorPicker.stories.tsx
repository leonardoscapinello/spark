import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ColorInput, ColorPicker } from "./ColorPicker.js";

function Paleta({ inicial = "neutral" }: { inicial?: string }) { const [value, setValue] = useState(inicial); return <ColorPicker label="Cor da etapa" value={value} onValueChange={setValue} />; }
function Marca({ inicial = "#1d1b18", label = "Acento", description = "Links, ações e seleção" }: { inicial?: string; label?: string; description?: string }) { const [value, setValue] = useState(inicial); return <ColorInput label={label} description={description} value={value} onValueChange={setValue} />; }

const meta: Meta<typeof Paleta> = { title: "Campos/Cor", component: Paleta, args: { inicial: "neutral" } };
export default meta;
type Story = StoryObj<typeof Paleta>;

export const Interativo: Story = {};
export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Paleta da etapa" descricao="Cores nomeadas e personalizadas; a escolhida ganha o ✓.">
    <Fileira rotulo="Neutra escolhida" topo><Paleta /></Fileira>
    <Fileira rotulo="Personalizada" topo><Paleta inicial="#06BFF5" /></Fileira>
  </Secao>
  <Secao titulo="Cor de marca" descricao="Amostra de 40 em pílula cavada que abre o seletor do sistema.">
    <Mesa largura={320}><div style={{ display: "grid", gap: 16 }}><Marca /><Marca label="Fundo da aplicação" description="Base das áreas de trabalho" inicial="#f6f4ef" /><Marca label="Perigo" description="Perdas e erros" inicial="#cf3f28" /></div></Mesa>
  </Secao>
</Prancha> };
export const Estreito: Story = { render: () => <Mesa largura={260}><Paleta /></Mesa> };
