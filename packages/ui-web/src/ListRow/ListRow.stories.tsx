import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "../Avatar/Avatar.js";
import { Button } from "../Button/Button.js";
import { Signal } from "../Signal/Signal.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ListRow, RowList } from "./ListRow.js";

const meta: Meta<typeof ListRow> = { title: "Dados/Linha de lista", component: ListRow, args: { title: "Renovação 2027", description: "Em aberto", meta: "R$ 48.000,00", icon: "briefcase", done: false, selected: false } };
export default meta;
type Story = StoryObj<typeof ListRow>;

export const Interativo: Story = { render: (args) => <Mesa largura={440}><RowList label="Exemplo"><ListRow {...args} /></RowList></Mesa> };

export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Encaixe" descricao="Disco de ícone ou avatar de 32; o texto de todas as linhas começa na mesma coluna.">
      <Mesa largura={460}><RowList label="Encaixes">
        <ListRow index={0} icon="phone" title="Ligar para Ana" description="Ligação" meta="02/10 · 14:30" />
        <ListRow index={1} leading={<Avatar name="Carla Prado" />} title="Carla Prado" description="carla@acme.com" />
        <ListRow index={2} title="Sem encaixe" description="Linha só de texto" />
      </RowList></Mesa>
    </Secao>
    <Secao titulo="Estados">
      <Fileira rotulo="Link (realce)" topo><Mesa largura={460}><RowList label="Links"><ListRow icon="briefcase" title="Expansão Kaze" description="Proposta enviada" meta="R$ 96.000,00" render={<a href="#negocio" />} /></RowList></Mesa></Fileira>
      <Fileira rotulo="Selecionada" topo><Mesa largura={460}><RowList label="Seleção"><ListRow icon="message" title="Pedido de proposta" description="WhatsApp" meta="09:12" selected /></RowList></Mesa></Fileira>
      <Fileira rotulo="Concluída" topo><Mesa largura={460}><RowList label="Concluídas"><ListRow icon="check" title="Enviar contrato" description="Tarefa" meta="01/10 · 17:00" done /></RowList></Mesa></Fileira>
      <Fileira rotulo="Com ações" topo><Mesa largura={460}><RowList label="Ações"><ListRow icon="phone" title="Ligar para Ana" description={<Signal tone="danger">Atrasada · Ligação</Signal>} meta="30/09 · 10:00" trailing={<><Button size="sm" variant="ghost">Editar</Button><Button size="sm" variant="secondary">Concluir</Button></>} /></RowList></Mesa></Fileira>
      <Fileira rotulo="Três linhas" topo><Mesa largura={460}><RowList label="Prévia"><ListRow leading={<Avatar name="Rafael Moura" />} title="Rafael Moura" description="Instagram · há 5 min" detail="Oi! Vi o anúncio de vocês e queria entender como funciona a implantação para uma equipe de 40 pessoas." meta="10:42" /></RowList></Mesa></Fileira>
      <Fileira rotulo="Estreita" topo><Mesa largura={240}><RowList label="Estreita"><ListRow icon="file" title="Proposta comercial revisada versão final" description="PDF · 2,4 MB" meta="ontem" /></RowList></Mesa></Fileira>
    </Secao>
  </Prancha>,
};

export const MuitosItens: Story = {
  render: () => <Mesa largura={460}><RowList label="Atividades">{Array.from({ length: 14 }, (_, index) => <ListRow key={index} index={index} icon={index % 3 === 0 ? "phone" : index % 3 === 1 ? "mail" : "check"} title={`Atividade ${index + 1}`} description={index % 4 === 0 ? <Signal tone="danger">Atrasada</Signal> : "Pendente"} meta={`0${(index % 9) + 1}/10 · 09:00`} />)}</RowList></Mesa>,
};
