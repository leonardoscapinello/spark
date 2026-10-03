import type { Meta, StoryObj } from "@storybook/react-vite";
import { Prancha, Secao } from "../storybook/Prancha.js";
import s from "../storybook/Identidade.module.css";
import { Glass, type GlassTier } from "./Glass.js";

const TIERS: readonly [GlassTier, string][] = [
  ["subtle", "Barra flutuante discreta."],
  ["panel", "Menu, seletor, popover: o mesmo vidro em todo dropdown."],
  ["modal", "Camada sobre o véu."],
  ["help", "Dica em carvão."],
];

const meta: Meta<typeof Glass> = {
  title: "Camadas/Vidro",
  component: Glass,
  args: { tier: "panel", children: "Barra de navegação flutuante" },
  argTypes: { tier: { control: "inline-radio", options: TIERS.map(([tier]) => tier) } },
  decorators: [Story => <div className={s.listras}><Story /></div>],
  parameters: {
    docs: { description: { component: "O único lugar do sistema com backdrop-filter (ADR-0025). Vive na navegação flutuante; conteúdo é sempre papel sólido. tier escolhe desfoque, fundo e borda juntos." } },
  },
};

export default meta;
type Story = StoryObj<typeof Glass>;

export const Interativo: Story = {
  render: args => <Glass {...args}><div className={s.vidroConteudo}>{args.children}</div></Glass>,
};

export const Camadas: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Os quatro vidros">
        <div className={s.grade}>
          {TIERS.map(([tier, uso]) => (
            <Glass key={tier} tier={tier}><div className={s.vidroConteudo}><strong>tier="{tier}"</strong><small>{uso}</small></div></Glass>
          ))}
        </div>
      </Secao>
    </Prancha>
  ),
};
