import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Fileira, Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { UserAvatar } from "../UserAvatar/UserAvatar.js";
import { Avatar } from "./Avatar.js";
import { AvatarStack } from "./AvatarStack.js";

const NOMES = ["Ana Souza", "Rafael Lima", "Beatriz Nogueira", "Carlos Dias", "Marina Costa", "João Pedro Alves"];
const FOTO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23c9c2b5'/%3E%3Ccircle cx='40' cy='31' r='14' fill='%236b645a'/%3E%3Cpath d='M14 76a26 26 0 0 1 52 0' fill='%236b645a'/%3E%3C/svg%3E";
const TAMANHOS = [["small", "24"], ["medium", "32"], ["large", "40"], ["hero", "56"]] as const;

const meta = {
  title: "Dados/Avatar",
  component: Avatar,
  subcomponents: { AvatarStack, UserAvatar },
  args: { name: "Ana Souza", size: "medium", src: null },
  argTypes: { size: { control: "inline-radio", options: TAMANHOS.map(([tamanho]) => tamanho) } },
  parameters: {
    docs: { description: { component: "Pessoa é círculo em pigmento com iniciais em 500; a mesma pessoa tem sempre a mesma cor. Foto quando houver; se falhar, volta às iniciais. Grupo de pessoas é AvatarStack: sobreposição de −8 e anel do papel." } },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Variantes: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Tamanhos × conteúdo" descricao="24 em linha densa e botão; 32 em lista; 40 em cabeçalho de conversa; 56 em ficha.">
        <Matriz
          colunas={TAMANHOS.map(([tamanho, px]) => `${tamanho} · ${px}`)}
          linhas={[
            { rotulo: "Iniciais", celulas: TAMANHOS.map(([tamanho]) => <Avatar name="Ana Souza" size={tamanho} />) },
            { rotulo: "Foto", celulas: TAMANHOS.map(([tamanho]) => <Avatar name="Ana Souza" src={FOTO} size={tamanho} />) },
            { rotulo: "Foto quebrada", celulas: TAMANHOS.map(([tamanho]) => <Avatar name="Rafael Lima" src="https://invalido.example/foto.png" size={tamanho} />) },
            { rotulo: "Sem nome", celulas: TAMANHOS.map(([tamanho]) => <Avatar name="" size={tamanho} />) },
          ]}
        />
      </Secao>
      <Secao titulo="Pigmento por nome" descricao="Quatro pigmentos, escolhidos por hash do nome. Iniciais em --sobre-cor.">
        <Fileira rotulo="Pessoas">{NOMES.map(nome => <Avatar key={nome} name={nome} size="large" />)}</Fileira>
      </Secao>
      <Secao titulo="Grupo de pessoas" descricao="Seguidores, participantes, quem está vendo. Excedente vira +N.">
        <Fileira rotulo="2, 3 e 6 pessoas">
          <AvatarStack>{NOMES.slice(0, 2).map(nome => <Avatar key={nome} name={nome} size="small" />)}</AvatarStack>
          <AvatarStack>{NOMES.slice(0, 3).map(nome => <Avatar key={nome} name={nome} size="small" />)}</AvatarStack>
          <AvatarStack overflow={3}>{NOMES.slice(0, 3).map(nome => <Avatar key={nome} name={nome} size="small" />)}</AvatarStack>
        </Fileira>
        <Fileira rotulo="Dentro de botão">
          <Button variant="secondary" icon={<AvatarStack overflow={3}>{NOMES.slice(0, 3).map(nome => <Avatar key={nome} name={nome} size="small" />)}</AvatarStack>}>6 seguidores</Button>
          <Button icon={<AvatarStack>{NOMES.slice(0, 2).map(nome => <Avatar key={nome} name={nome} size="small" />)}</AvatarStack>}>Convidar</Button>
        </Fileira>
      </Secao>
      <Secao titulo="Usuário do sistema" descricao="UserAvatar lê a foto do perfil canônico; quem integra só atualiza o perfil.">
        <Fileira rotulo="UserAvatar">
          <UserAvatar user={{ name: "Ana Souza", avatarUrl: FOTO }} size="large" />
          <UserAvatar user={{ name: "Rafael Lima", avatarUrl: null }} size="large" />
        </Fileira>
      </Secao>
    </Prancha>
  ),
};
