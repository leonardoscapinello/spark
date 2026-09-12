import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { PublicationStatus } from "./PublicationStatus.js";

const meta: StoryMeta<typeof PublicationStatus> = {
  title: "Estado/Publicação",
  component: PublicationStatus,
  args: { published: true, publicUrl: "https://exemplo.com/formulario" },
};
export default meta;
type Story = StoryObj<typeof PublicationStatus>;
export const Publicado: Story = {};
export const Rascunho: Story = { args: { published: false } };
export const PaginaPublicada: Story = { args: { publishedLabel: "Publicada" } };
