import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button/Button.js";
import { Chip } from "../Chip/Chip.js";
import { Icon } from "../Icon/Icon.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import s from "../storybook/Identidade.module.css";
import { ActionCard, ActionCardGroup, Card, CardContentState, MetricCard, ProgressBar, ProgressCard, SummaryList, type CardState } from "./Card.js";

const meta = {
  title: "Superfícies/Cartão",
  component: Card,
  subcomponents: { MetricCard, ProgressCard, ProgressBar, SummaryList, ActionCard, ActionCardGroup, CardContentState },
  args: { title: "Volume de conversas", description: "Resumo do período", children: "Conteúdo fornecido pelo módulo.", appearance: "outlined" },
  argTypes: { appearance: { control: "inline-radio", options: ["outlined", "elevated"] }, children: { control: false } },
  parameters: {
    docs: { description: { component: "Folha pousada com título de 15 em 500, descrição de 12 e corpo. Com href ou linkRender o cartão inteiro abre o registro; as ações continuam clicáveis por cima. Indicador, progresso, resumo e próximo passo são variações da mesma folha." } },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Variantes: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Aparência e composição">
        <div className={s.grade}>
          <Card title="Pousado" description="appearance=outlined">Conteúdo do cartão.</Card>
          <Card title="Erguido" description="appearance=elevated" appearance="elevated">Conteúdo do cartão.</Card>
          <Card title="Com estado e ações" description="Atualizada há 2 horas" leading={<Chip tone="success" dot>Ativa</Chip>} actions={<Button variant="ghost" size="sm" iconOnly icon={<Icon name="more" />} aria-label="Mais opções" />} footer="Rodapé com informação de apoio">Conteúdo do cartão.</Card>
        </div>
      </Secao>
      <Secao titulo="Cartão clicável" descricao="A folha inteira abre o registro: ergue no hover, recebe foco pelo teclado, e o botão de ações continua independente.">
        <div className={s.grade}>
          <Card title="Formulário de contato" description="Captura pela página principal" href="#formulario" actions={<Chip tone="success" dot>Publicado</Chip>} footer={<Button variant="secondary" size="sm">Copiar link</Button>}>12 campos · 340 respostas</Card>
          <Card title="Página de evento" description="Rascunho" href="#pagina" actions={<Chip dot>Rascunho</Chip>}>Atualizada ontem</Card>
        </div>
      </Secao>
      <Secao titulo="Título longo">
        <Mesa largura={280}><Card title="Qualificação de leads vindos de campanhas pagas no último trimestre" description="Descrição igualmente longa para conferir que nada vaza da folha.">Conteúdo.</Card></Mesa>
      </Secao>
    </Prancha>
  ),
};

function ComEstados() {
  const [estado, setEstado] = useState<CardState>("loading");
  return (
    <div className={s.grade}>
      {(["loading", "empty", "error", "ready"] as const).map(cada => (
        <Card key={cada} title={`state="${cada}"`} description="Mesmo cartão, quatro estados">
          <CardContentState state={cada === "error" ? estado === "error" ? "error" : cada : cada} onRetry={() => setEstado("loading")}>
            <MetricValue />
          </CardContentState>
        </Card>
      ))}
      <Card title="Gráfico carregando" description="loadingVariant=chart"><CardContentState state="loading" loadingVariant="chart"><MetricValue /></CardContentState></Card>
      <Card title="Rosca carregando" description="loadingVariant=donut"><CardContentState state="loading" loadingVariant="donut"><MetricValue /></CardContentState></Card>
    </div>
  );
}

function MetricValue() {
  return <strong>R$ 48.250,00</strong>;
}

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Carregando, vazio, erro e pronto" descricao="O conteúdo troca dentro da mesma folha; o cartão não pula de altura sem motivo.">
        <ComEstados />
      </Secao>
    </Prancha>
  ),
};

export const Indicadores: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Indicador, progresso e resumo">
        <div className={s.grade}>
          <MetricCard title="Conversas" value="1.508" comparison="↑ 12% no período" sentiment="positive" />
          <MetricCard title="Tempo de resposta" value="14 min" comparison="↑ 3 min no período" sentiment="negative" />
          <MetricCard title="Negócios abertos" value="86" comparison="igual ao período anterior" />
          <MetricCard title="Receita" value="—" state="error" onRetry={() => undefined} />
          <ProgressCard title="Meta mensal" value={84} label="84% concluída" />
        </div>
        <Mesa largura={420}>
          <ProgressBar label="E-mails enviados" value={42} max={100} />
          <ProgressBar label="Campanha sem destinatários" value={0} max={100} />
          <SummaryList label="Resumo do negócio" items={[{ id: "valor", label: "Valor", value: "R$ 35.000,00" }, { id: "etapa", label: "Etapa", value: "Proposta", detail: "há 4 dias" }, { id: "dono", label: "Responsável", value: "Ana Souza", action: <Button variant="link">Trocar</Button> }]} />
        </Mesa>
      </Secao>
    </Prancha>
  ),
};

export const ProximosPassos: Story = {
  name: "Próximos passos",
  render: () => (
    <ActionCardGroup title="Prepare seu primeiro envio">
      <ActionCard icon="team" title="Escolha o público" description="Defina os contatos que devem receber a campanha." action={<Button variant="secondary">Criar público</Button>} />
      <ActionCard icon="mail" title="Escreva a mensagem" description="Comece de um modelo ou do zero." action={<Button variant="secondary">Escrever</Button>} />
      <ActionCard icon="calendar" title="Agende o envio" description="Escolha o melhor horário para o público." action={<Button variant="secondary">Agendar</Button>} />
    </ActionCardGroup>
  ),
};
