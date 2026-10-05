import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mesa } from "../storybook/Prancha.js";
import { RegionBoundary } from "./RegionBoundary.js";

function Quebra(): never { throw new Error("Cannot read properties of undefined (reading 'companyId')"); }

const meta: Meta = { title: "Retorno/Erro numa área" };
export default meta;
type Story = StoryObj;

/** Uma área que quebrou: o erro fica nela; o resto da tela segue. */
export const AreaQuebrada: Story = { render: () => <Mesa largura={360}><RegionBoundary label="Detalhes do atendimento"><Quebra /></RegionBoundary></Mesa> };
/** Área saudável: a barreira é invisível. */
export const AreaSaudavel: Story = { render: () => <Mesa largura={360}><RegionBoundary label="Detalhes do atendimento">Conteúdo normal da área.</RegionBoundary></Mesa> };
