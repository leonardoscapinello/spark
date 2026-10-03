import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { EmptyState } from "./EmptyState.js";

const meta: StoryMeta<typeof EmptyState> = {
  title: "Retorno/Estado vazio",
  component: EmptyState,
  args: { icon: "mail", title: "Comece com uma campanha", description: "Crie um público e prepare sua primeira mensagem para os contatos.", variant: "default" },
  argTypes: { variant: { control: "inline-radio", options: ["default", "onboarding", "featured"] } },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Interativo: Story = { args: { action: <Button>Criar público</Button> } };

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Cartão" descricao="Disco cavado de 48, título 500 15, uma frase de 12 e no máximo uma ação de tinta.">
    <EmptyState icon="file" title="Nenhum arquivo" description="Os arquivos enviados aparecem aqui." />
    <EmptyState icon="search" title="Nenhuma pessoa encontrada" description="Tente outro nome, e-mail ou telefone." action={<Button size="sm" variant="secondary">Limpar busca</Button>} />
  </Secao>
  <Secao titulo="Primeiro passo">
    <EmptyState variant="onboarding" icon="user" title="Comece com seus contatos" description="Cadastre uma pessoa ou importe sua base para reunir o histórico de relacionamento em um só lugar." action={<Button>Nova pessoa</Button>} secondaryAction={<Button variant="secondary">Importar CSV</Button>} />
  </Secao>
  <Secao titulo="Primeiro uso, com esboço" descricao="O esboço muda conforme o assunto: registro, gráfico, fluxo, agenda e conversa.">
    <EmptyState variant="featured" icon="user" title="Cadastre a primeira pessoa" description="Reúna pessoas, empresas e conversas em uma base que a equipe pode acompanhar." action={<Button>Nova pessoa</Button>} />
    <EmptyState variant="featured" icon="chart" title="Os relatórios começam com seus registros" description="Acompanhe os resultados da equipe no mesmo lugar." />
    <EmptyState variant="featured" icon="bolt" title="Crie sua primeira automação" description="Escolha um gatilho e defina a próxima ação." />
    <EmptyState variant="featured" icon="calendar" title="Planeje a primeira atividade" description="Agende tarefas e reuniões com sua equipe." />
    <EmptyState variant="featured" icon="mail" title="Prepare sua primeira campanha" description="Escolha um público e escreva sua mensagem." />
  </Secao>
</Prancha> };

export const TextoLongo: Story = { args: { icon: "folder", title: "Nenhum arquivo nesta pasta compartilhada com a equipe comercial", description: "Os arquivos enviados por qualquer pessoa da equipe aparecem aqui, com o nome de quem enviou e a data. Arraste para cá ou use o botão de envio." } };
export const Estreito: Story = { render: () => <Mesa largura={320}><EmptyState variant="featured" icon="user" title="Cadastre a primeira pessoa" description="Reúna pessoas, empresas e conversas em uma base." action={<Button>Nova pessoa</Button>} /></Mesa> };
