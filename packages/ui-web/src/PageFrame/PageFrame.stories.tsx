import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { EmptyState } from "../EmptyState/EmptyState.js";
import { PageHeader } from "../PageHeader/PageHeader.js";
import { Prancha, Secao } from "../storybook/Prancha.js";
import { PageFrame } from "./PageFrame.js";

const meta: Meta<typeof PageFrame> = { title: "Estrutura/Área de trabalho", component: PageFrame, args: { width: "fluid" }, argTypes: { width: { control: "inline-radio", options: ["fluid", "content"] } } };
export default meta;
type Story = StoryObj<typeof PageFrame>;

export const Interativo: Story = { render: (args) => <PageFrame {...args}><PageHeader title="Pessoas" actions={<Button>Nova pessoa</Button>} /><EmptyState icon="user" title="Nenhuma pessoa cadastrada" description="As pessoas cadastradas aparecem aqui." /></PageFrame> };

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Largura" descricao="Padding de 32 no desktop e 16 no celular; o cabeçalho encosta no topo.">
    <PageFrame><PageHeader title="Lista larga" /><EmptyState icon="file" title="Conteúdo que ocupa a largura" description="Tabelas e quadros usam a largura inteira." /></PageFrame>
    <PageFrame width="content"><PageHeader eyebrow="Administração" title="Conteúdo centralizado" description="Formulários e configurações mantêm uma largura confortável." /><EmptyState icon="settings" title="Configurações" description="O conteúdo fica centrado." /></PageFrame>
  </Secao>
</Prancha> };
