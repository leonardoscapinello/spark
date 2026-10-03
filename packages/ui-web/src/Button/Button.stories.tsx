import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "../Avatar/Avatar.js";
import { AvatarStack } from "../Avatar/AvatarStack.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { glyphs } from "../Icon/glyphs.js";
import { MenuButton, MenuGroup, MenuItem, MenuSeparator, SplitButton } from "../Menu/Menu.js";
import { Fileira, Matriz, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { Button, type ButtonSize, type ButtonVariant } from "./Button.js";
import { FeedbackButton, type FeedbackState } from "./FeedbackButton.js";

const ICONES = Object.keys(glyphs) as IconName[];
const comIcone = Object.fromEntries(ICONES.map(nome => [nome, <Icon name={nome} />]));

const VARIANTES: readonly [ButtonVariant, string][] = [
  ["primary", "Carvão · primary"],
  ["secondary", "Folha · secondary"],
  ["raised", "Folha · raised"],
  ["ghost", "Tinta · ghost"],
  ["row", "Linha · row"],
  ["link", "Link · link"],
];
const TAMANHOS: readonly ButtonSize[] = ["sm", "md", "lg"];
const PESSOAS = ["Ana Souza", "Rafael Lima", "Beatriz Nogueira", "Carlos Dias", "Marina Costa"];

const meta = {
  title: "Ações/Botão",
  component: Button,
  args: { children: "Salvar", variant: "primary", size: "md", tone: "neutral", loading: false, disabled: false, iconOnly: false },
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTES.map(([variante]) => variante) },
    size: { control: "inline-radio", options: TAMANHOS },
    tone: { control: "inline-radio", options: ["neutral", "success", "danger"] },
    icon: { control: "select", options: ICONES, mapping: comIcone },
    trailingIcon: { control: "select", options: ICONES, mapping: comIcone },
    shape: { table: { disable: true } },
    children: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component: "Um botão para o sistema inteiro. Carvão é a ação principal (um por área); folha é a ação comum; tinta é a ação discreta; linha é item de lista; link é texto. Todo botão é pílula, responde no pointer-down e troca de rótulo escoando a largura.",
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Variantes: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Variantes × estados" descricao="Cada linha é uma variante; cada coluna, um estado. Passe o cursor e pressione para ver a física.">
        <Matriz
          colunas={["Repouso", "Com ícone", "Ícone à direita", "Só ícone", "Carregando", "Desabilitado"]}
          linhas={VARIANTES.map(([variante, rotulo]) => ({
            rotulo,
            celulas: [
              <Button variant={variante}>Salvar</Button>,
              <Button variant={variante} icon={<Icon name="plus" />}>Criar</Button>,
              <Button variant={variante} trailingIcon={<Icon name="chevronDown" />}>Ordenar</Button>,
              <Button variant={variante} iconOnly icon={<Icon name="more" />} aria-label="Mais ações" />,
              <Button variant={variante} loading>Salvando…</Button>,
              <Button variant={variante} disabled>Salvar</Button>,
            ],
          }))}
        />
      </Secao>
      <Secao titulo="Linha selecionada" descricao="A variante row é o item de lista: tinta em repouso, folha pousada quando selecionada.">
        <Fileira rotulo="row" coluna>
          <Button variant="row" icon={<Icon name="inbox" />}>Sua caixa de entrada</Button>
          <Button variant="row" icon={<Icon name="user" />} data-selected="">Atribuídas a você</Button>
          <Button variant="row" icon={<Icon name="star" />} disabled>Favoritas</Button>
        </Fileira>
      </Secao>
    </Prancha>
  ),
};

export const Tamanhos: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Tamanhos" descricao="sm 28 · md 36 · lg 44. O ícone acompanha (14 · 16 · 18) e o encaixe da esquerda é 20 no sm e 24 nos demais.">
        <Matriz
          colunas={TAMANHOS.map(tamanho => tamanho)}
          linhas={[
            { rotulo: "Texto", celulas: TAMANHOS.map(tamanho => <Button size={tamanho}>Salvar</Button>) },
            { rotulo: "Com ícone", celulas: TAMANHOS.map(tamanho => <Button size={tamanho} variant="secondary" icon={<Icon name="plus" />}>Criar</Button>) },
            { rotulo: "Com avatar", celulas: TAMANHOS.map(tamanho => <Button size={tamanho} variant="secondary" icon={<Avatar name="Ana Souza" size="small" />}>Ana Souza</Button>) },
            { rotulo: "Só ícone", celulas: TAMANHOS.map(tamanho => <Button size={tamanho} variant="ghost" iconOnly icon={<Icon name="settings" />} aria-label="Configurações" />) },
            { rotulo: "Carregando", celulas: TAMANHOS.map(tamanho => <Button size={tamanho} loading>Salvando…</Button>) },
          ]}
        />
      </Secao>
    </Prancha>
  ),
};

export const Tons: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Tons" descricao="Sucesso e perigo. No carvão o tom pinta o botão; na folha vira fundo suave com traço na cor; na tinta muda só a cor.">
        <Matriz
          colunas={["Carvão", "Folha", "Tinta", "Desabilitado"]}
          linhas={([["success", "Sucesso", "check", "Ganho"], ["danger", "Perigo", "close", "Perdido"]] as const).map(([tom, rotulo, icone, texto]) => ({
            rotulo,
            celulas: [
              <Button tone={tom} icon={<Icon name={icone} />}>{texto}</Button>,
              <Button tone={tom} variant="secondary" icon={<Icon name={icone} />}>{texto}</Button>,
              <Button tone={tom} variant="ghost" icon={<Icon name={icone} />}>{texto}</Button>,
              <Button tone={tom} variant="secondary" disabled icon={<Icon name={icone} />}>{texto}</Button>,
            ],
          }))}
        />
      </Secao>
    </Prancha>
  ),
};

export const MesmoEncaixe: Story = {
  name: "Ícone, avatar e grupo no mesmo encaixe",
  render: () => (
    <Prancha>
      <Secao titulo="O texto começa sempre no mesmo lugar" descricao="Ícone, avatar e grupo de avatares ocupam o mesmo encaixe de 24, centralizado na curva da pílula. Responsável e Seguidores são o mesmo botão e não podem divergir.">
        {TAMANHOS.map(tamanho => (
          <Fileira key={tamanho} rotulo={tamanho} coluna>
            <Button size={tamanho} variant="secondary" icon={<Icon name="account" />}>Sem responsável</Button>
            <Button size={tamanho} variant="secondary" icon={<Avatar name="Ana Souza" size="small" />}>Ana Souza</Button>
            <Button size={tamanho} variant="secondary" icon={<AvatarStack overflow={2}>{PESSOAS.slice(0, 3).map(nome => <Avatar key={nome} name={nome} size="small" />)}</AvatarStack>}>5 seguidores</Button>
            <Button size={tamanho} variant="secondary" icon={<Icon name="team" />}>Seguidores</Button>
          </Fileira>
        ))}
      </Secao>
    </Prancha>
  ),
};

function Abrir({ children }: { children: ReactNode }) {
  return <Palco altura={260}>{children}</Palco>;
}

export const ComMenu: Story = {
  name: "Com menu",
  render: () => (
    <Prancha>
      <Secao titulo="Botão com menu" descricao="O botão é o mesmo; o menu abre com o mesmo vidro e o mesmo estalo em todo lugar. A seta gira ao abrir.">
        <Abrir>
          <Fileira rotulo="Variantes">
            <MenuButton variant="secondary" menu={<><MenuItem icon={<Icon name="user" />}>Atribuir</MenuItem><MenuItem icon={<Icon name="inbox" />}>Mover para a caixa</MenuItem><MenuSeparator /><MenuItem danger icon={<Icon name="trash" />}>Excluir</MenuItem></>}>Ações</MenuButton>
            <MenuButton variant="primary" icon={<Icon name="plus" />} menu={<><MenuItem icon={<Icon name="user" />}>Pessoa</MenuItem><MenuItem icon={<Icon name="building" />}>Empresa</MenuItem><MenuItem icon={<Icon name="briefcase" />}>Negócio</MenuItem></>}>Criar</MenuButton>
            <MenuButton variant="ghost" indicator={false} iconOnly icon={<Icon name="more" />} aria-label="Mais ações" menu={<><MenuItem>Duplicar</MenuItem><MenuItem>Arquivar</MenuItem></>} />
            <MenuButton variant="secondary" icon={<Avatar name="Ana Souza" size="small" />} menu={<MenuGroup label="Responsável">{PESSOAS.map(nome => <MenuItem key={nome} icon={<Avatar name={nome} size="small" />}>{nome}</MenuItem>)}</MenuGroup>}>Ana Souza</MenuButton>
          </Fileira>
        </Abrir>
      </Secao>
      <Secao titulo="Botão dividido" descricao="Ação principal à esquerda; alternativas na seta. As duas partes são o mesmo botão.">
        <Abrir>
          <Fileira rotulo="Variantes">
            <SplitButton menuLabel="Opções de envio" menu={<><MenuItem>Enviar e fechar</MenuItem><MenuItem>Agendar envio</MenuItem></>}>Enviar</SplitButton>
            <SplitButton variant="secondary" menuLabel="Opções de salvar" menu={<MenuItem>Salvar como…</MenuItem>}>Salvar</SplitButton>
            <SplitButton disabled menuLabel="Opções indisponíveis" menu={<MenuItem>Agendar</MenuItem>}>Enviar</SplitButton>
          </Fileira>
        </Abrir>
      </Secao>
    </Prancha>
  ),
};

function Retorno({ falhar = false, variante = "primary" }: { falhar?: boolean; variante?: ButtonVariant }) {
  const [estado, setEstado] = useState<FeedbackState>("idle");
  const relogio = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(relogio.current), []);
  return (
    <FeedbackButton
      variant={variante}
      state={estado}
      labels={falhar ? { idle: "Salvar (vai falhar)" } : {}}
      onClick={() => {
        window.clearTimeout(relogio.current);
        setEstado("pending");
        relogio.current = window.setTimeout(() => {
          setEstado(falhar ? "error" : "success");
          relogio.current = window.setTimeout(() => setEstado("idle"), 2400);
        }, 1200);
      }}
    />
  );
}

export const RetornoDeAcao: Story = {
  name: "Retorno de ação",
  render: () => (
    <Prancha>
      <Secao titulo="Salvando, salvo, erro" descricao="O mesmo botão conta o resultado: o rótulo troca e a largura escoa, o ensō gira no encaixe do ícone, o ✓ ou o alerta ficam no lugar dele. O estado vem do resultado real da operação.">
        <Fileira rotulo="Experimente"><Retorno /><Retorno falhar /><Retorno variante="secondary" /></Fileira>
        <Fileira rotulo="Estados parados">
          {(["idle", "pending", "success", "error"] as const).map(estado => <FeedbackButton key={estado} state={estado} />)}
        </Fileira>
      </Secao>
    </Prancha>
  ),
};

export const RotuloLongo: Story = {
  name: "Rótulo longo",
  render: () => (
    <Prancha>
      <Secao titulo="Rótulo que não cabe" descricao="O rótulo nunca quebra linha: corta com reticências e, no hover, desliza para mostrar o resto.">
        <Fileira rotulo="Largura 180">
          <div style={{ width: 180 }}><Button variant="secondary" icon={<Icon name="send" />}>Encaminhar para a equipe de sucesso do cliente</Button></div>
        </Fileira>
      </Secao>
    </Prancha>
  ),
};

export const Foco: Story = {
  args: { variant: "secondary", children: "Foco pelo teclado" },
  play: ({ canvasElement }) => {
    canvasElement.querySelector("button")?.focus();
  },
};
