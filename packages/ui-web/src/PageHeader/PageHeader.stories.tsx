import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { BackLink } from "../BackLink/BackLink.js";
import { Button } from "../Button/Button.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { PageHeader } from "./PageHeader.js";

const meta: StoryMeta<typeof PageHeader> = {
  title: "Estrutura/Cabeçalho de página",
  component: PageHeader,
  args: { title: "Pessoas", eyebrow: "", description: "Acompanhe as pessoas e o histórico de relacionamento." },
};
export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Interativo: Story = { render: (args) => <PageHeader {...args} actions={<><Button variant="secondary">Importar CSV</Button><Button>Nova pessoa</Button></>} /> };

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Composição" descricao="Título 500: 22 no celular e no tablet, 28 a partir de 1024. Sem ícone — a navegação já diz onde se está.">
    <Fileira rotulo="Só título" coluna><PageHeader title="Relatórios" /></Fileira>
    <Fileira rotulo="Com ações" coluna><PageHeader title="Pessoas" actions={<><Button variant="secondary">Importar CSV</Button><Button>Nova pessoa</Button></>} /></Fileira>
    <Fileira rotulo="Com contexto e apoio" coluna><PageHeader eyebrow="Administração" title="Usuários" description="Controle quem acessa o sistema e quais permissões cada pessoa recebe." actions={<Button>Convidar usuário</Button>} /></Fileira>
    <Fileira rotulo="Com voltar" coluna><PageHeader back={<BackLink href="#pessoas">Pessoas</BackLink>} title="Importar pessoas" description="Traga uma lista CSV, revise os dados e grave apenas as linhas válidas." /></Fileira>
  </Secao>
</Prancha> };

export const TituloLongo: Story = { render: () => <PageHeader title="Configuração dos campos obrigatórios e importantes de cada etapa do funil comercial" description="Campo obrigatório impede o negócio de avançar enquanto estiver vazio." actions={<Button>Salvar</Button>} /> };
export const Estreito: Story = { render: () => <Mesa largura={360}><PageHeader eyebrow="Administração" title="Grupos de permissões" description="Defina o que cada equipe pode consultar, criar e administrar." actions={<Button>Novo grupo</Button>} /></Mesa> };
