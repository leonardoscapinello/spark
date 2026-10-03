import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { PublicationStatus } from "./PublicationStatus.js";

const meta: StoryMeta<typeof PublicationStatus> = { title: "Retorno/Situação de publicação", component: PublicationStatus, args: { published: true, publishedLabel: "Publicado", publicUrl: "https://exemplo.com/formulario" } };
export default meta;
type Story = StoryObj<typeof PublicationStatus>;

export const Interativo: Story = {};
export const Variantes: Story = { render: () => <Prancha><Secao titulo="Situações" descricao="Publicado leva o ponto verde e o atalho de copiar o link; rascunho fica neutro.">
  <Fileira rotulo="Publicado" coluna><PublicationStatus published publicUrl="https://exemplo.com/formulario" /></Fileira>
  <Fileira rotulo="Publicada (página)" coluna><PublicationStatus published publishedLabel="Publicada" publicUrl="https://exemplo.com/p/aurora" /></Fileira>
  <Fileira rotulo="Publicado sem link" coluna><PublicationStatus published /></Fileira>
  <Fileira rotulo="Rascunho" coluna><PublicationStatus published={false} /></Fileira>
</Secao></Prancha> };
export const Estreito: Story = { render: () => <Mesa largura={240}><PublicationStatus published publicUrl="https://exemplo.com/formulario" /></Mesa> };
