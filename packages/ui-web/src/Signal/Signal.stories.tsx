import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Signal } from "./Signal.js";

const meta: Meta<typeof Signal> = { title: "Retorno/Sinal de estado", component: Signal, args: { tone: "info", children: "Próxima: Enviar proposta", live: false } };
export default meta;
type Story = StoryObj<typeof Signal>;

export const Interativo: Story = {};

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Tons" descricao="Ponto de 7px na cor do estado; o texto fica em tinta 3.">
    <Fileira rotulo="Perigo"><Signal tone="danger">Atrasada: Ligar para Ana</Signal></Fileira>
    <Fileira rotulo="Informação"><Signal tone="info">Próxima: Enviar proposta</Signal></Fileira>
    <Fileira rotulo="Atenção"><Signal tone="warning">Sem próximo passo</Signal></Fileira>
    <Fileira rotulo="Sucesso"><Signal tone="success">Concluída</Signal></Fileira>
    <Fileira rotulo="Neutro"><Signal>Sem prazo</Signal></Fileira>
    <Fileira rotulo="Ao vivo"><Signal tone="success" live>Ao vivo</Signal></Fileira>
    <Fileira rotulo="Só o ponto"><Signal tone="danger" title="Atrasada" /></Fileira>
    <Fileira rotulo="Texto longo"><Mesa largura={180}><Signal tone="info">Próxima: Revisar proposta com a diretoria financeira</Signal></Mesa></Fileira>
  </Secao></Prancha>,
};
