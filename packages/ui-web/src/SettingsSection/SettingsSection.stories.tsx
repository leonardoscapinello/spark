import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { SettingsRow, SettingsSection } from "./SettingsSection.js";

const meta: Meta<typeof SettingsRow> = { title: "Estrutura/Configurações", component: SettingsRow, args: { title: "Outros dispositivos", description: "Revoga as sessões abertas em outros navegadores e aparelhos." } };
export default meta;
type Story = StoryObj<typeof SettingsRow>;

export const Interativo: Story = { render: (args) => <Mesa largura={560}><SettingsRow {...args}><Button variant="secondary">Encerrar outras sessões</Button></SettingsRow></Mesa> };
export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Linha de configuração" descricao="O que é, uma frase de apoio e a ação à direita; fio entre linhas.">
    <Mesa largura={560}>
      <SettingsRow title="Outros dispositivos" description="Revoga as sessões abertas em outros navegadores e aparelhos."><Button variant="secondary">Encerrar outras sessões</Button></SettingsRow>
      <SettingsRow title="Todos os dispositivos" description="Revoga todas as sessões, inclusive esta, e volta para o login."><Button variant="secondary" tone="danger">Sair de todos</Button></SettingsRow>
      <SettingsRow title="Aplicativo autenticador" description="Ativado em 2 de outubro de 2026"><Button size="sm" variant="ghost" tone="danger">Remover</Button></SettingsRow>
      <SettingsRow title="Sem ação" description="Só informação, sem botão." />
    </Mesa>
  </Secao>
  <Secao titulo="Grupo com cartões">
    <SettingsSection title="Pessoas e acesso"><div>Usuários</div><div>Times</div><div>Grupos de permissões</div></SettingsSection>
  </Secao>
</Prancha> };
export const TextoLongo: Story = { render: () => <Mesa largura={360}><SettingsRow title="Encerrar todas as sessões abertas em navegadores e aparelhos de outras pessoas da equipe" description="Todas as outras sessões da sua conta perderão a autorização para se renovar e precisarão entrar de novo."><Button variant="secondary">Encerrar</Button></SettingsRow></Mesa> };
