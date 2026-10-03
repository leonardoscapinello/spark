import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { NoteCard } from "./NoteCard.js";

const meta: Meta<typeof NoteCard> = { title: "Dados/Nota", component: NoteCard, args: { author: "Carla Prado", createdAt: "2026-10-02T14:30:00-03:00", body: "Cliente pediu a proposta revisada até sexta.", onRemove: () => undefined } };
export default meta;
type Story = StoryObj<typeof NoteCard>;

export const Interativo: Story = { render: (args) => <Mesa largura={420}><NoteCard {...args} /></Mesa> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Nota" descricao="Quem escreveu remove; os demais só leem.">
    <Fileira rotulo="Com remover" topo><Mesa largura={420}><NoteCard author="Carla Prado" createdAt="2026-10-02T14:30:00-03:00" body="Cliente pediu a proposta revisada até sexta." onRemove={() => undefined} /></Mesa></Fileira>
    <Fileira rotulo="Só leitura" topo><Mesa largura={420}><NoteCard author="Rafael Moura" createdAt="2026-10-01T09:12:00-03:00" body="Ligação feita; retorno combinado para a próxima semana." /></Mesa></Fileira>
    <Fileira rotulo="Texto longo" topo><Mesa largura={420}><NoteCard author="Leonardo Scapinello" createdAt="2026-09-30T18:05:00-03:00" body={"Reunião com diretoria.\n\nPontos:\n- escopo da fase 2\n- prazo de implantação\n- desconto para pagamento anual, que precisa de aprovação do financeiro antes do envio da proposta revisada."} /></Mesa></Fileira>
    <Fileira rotulo="Estreito" topo><Mesa largura={260}><NoteCard author="Ana Beatriz de Oliveira Santos" createdAt="2026-09-30T18:05:00-03:00" body="Nome longo e coluna estreita." onRemove={() => undefined} /></Mesa></Fileira>
  </Secao></Prancha>,
};
