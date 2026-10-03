import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon/Icon.js";
import { MenuButton, MenuGroup, MenuItem, MenuNote, MenuSeparator } from "../Menu/Menu.js";
import { Select } from "../Select/Select.js";
import { Signal } from "../Signal/Signal.js";
import { Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ReplyComposer, ReplyComposerPreview, type ReplyComposerMode } from "./ReplyComposer.js";

const meta = {
  title: "Padrões/Compositor de resposta",
  component: ReplyComposer,
  args: { mode: "reply", value: "", placeholder: "Responder pelo WhatsApp Vendas…", maxLength: 20_000, submitting: false, replyDisabled: false, onModeChange: () => undefined, onValueChange: () => undefined, onSubmit: () => undefined },
  argTypes: { mode: { control: "inline-radio", options: ["reply", "note"] } },
  parameters: { docs: { description: { component: "Campo de resposta do atendimento: uma folha só que se ergue enquanto se escreve. Responder | Nota no segmentado deslizante; à direita, por onde a resposta sai. Texto sem caixa própria que cresce até 224px; ferramentas em tinta, contador em mono e o carvão de enviar (⌘/Ctrl + Enter também envia). Nota tem véu de aviso suave e «Somente equipe»." } } },
} satisfies Meta<typeof ReplyComposer>;
export default meta;
type Story = StoryObj<typeof meta>;

const rota = <MenuButton variant="ghost" size="sm" icon={<Icon name="whatsapp" />} aria-label="Responder por WhatsApp Vendas. Trocar" menu={<MenuGroup label="Responder por">
  <MenuItem icon={<Icon name="whatsapp" />} shortcut="+55 11 98765-4321" aria-current="true">WhatsApp Vendas</MenuItem>
  <MenuItem icon={<Icon name="instagram" />} shortcut="@carla.menezes">Instagram Loja Centro</MenuItem>
  <MenuItem icon={<Icon name="mail" />} shortcut="carla@acme.com.br">E-mail Suporte</MenuItem>
</MenuGroup>}>WhatsApp Vendas</MenuButton>;

const prontas = <MenuButton variant="ghost" size="sm" iconOnly indicator={false} icon={<Icon name="text" />} aria-label="Inserir resposta pronta" menu={<>
  <MenuGroup label="Respostas prontas"><MenuItem shortcut="/ola">Boas-vindas</MenuItem><MenuItem shortcut="/prazo">Prazo de entrega</MenuItem></MenuGroup>
  <MenuSeparator />
  <MenuItem icon={<Icon name="settings" />}>Gerenciar respostas</MenuItem>
</>} />;

const LONGO = Array.from({ length: 14 }, (_, index) => `Linha ${index + 1} de uma resposta longa: o campo cresce até 224px e depois rola por dentro.`).join("\n");

type Props = Partial<ComponentProps<typeof ReplyComposer>>;

/** Composição com estado, para as histórias que precisam digitar, anexar e trocar de modo. */
function Composto({ inicial = "reply", texto = "", ...props }: Props & { inicial?: ReplyComposerMode; texto?: string }) {
  const [mode, setMode] = useState<ReplyComposerMode>(inicial);
  const [value, setValue] = useState(texto);
  const [file, setFile] = useState<{ name: string; uploading?: boolean } | null>(props.attachment ?? null);
  return <ReplyComposer
    mode={mode}
    onModeChange={setMode}
    value={value}
    onValueChange={setValue}
    onSubmit={() => setValue("")}
    placeholder={mode === "note" ? "Adicione contexto para a equipe…" : "Responder pelo WhatsApp Vendas…"}
    route={rota}
    tools={prontas}
    onAttach={(files) => setFile({ name: files[0]?.name ?? "arquivo" })}
    onRemoveAttachment={() => setFile(null)}
    {...props}
    attachment={file}
  />;
}

/** Todos os controles: modo, texto, enviando, sem canal que responda, limite. */
export const Interativo: Story = { render: (args) => <Mesa largura={640}><ReplyComposer {...args} route={rota} tools={prontas} /></Mesa> };

/** Modo × estado lado a lado. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Modo × estado" descricao="O carvão de enviar desbota sem texto; enviando, mostra o ensō. A nota troca a rota pelo selo «Somente equipe» e ganha o véu de aviso.">
      <Matriz colunas={["Vazio", "Com texto", "Enviando", "Com anexo"]} linhas={(["reply", "note"] as const).map((mode) => ({
        rotulo: mode === "reply" ? "Responder" : "Nota",
        celulas: [
          <Mesa key="v" largura={420}><Composto inicial={mode} /></Mesa>,
          <Mesa key="t" largura={420}><Composto inicial={mode} texto="Olá, Carla! Segue o link do plano anual." /></Mesa>,
          <Mesa key="e" largura={420}><Composto inicial={mode} texto="Olá, Carla! Segue o link do plano anual." submitting /></Mesa>,
          <Mesa key="a" largura={420}><Composto inicial={mode} attachment={{ name: "contrato-anual.pdf" }} canSubmit /></Mesa>,
        ],
      }))} />
    </Secao>
    <Secao titulo="Casos do canal">
      <Matriz colunas={["Sem canal que responda", "Anexo subindo", "Passou do limite"]} linhas={[{
        rotulo: "Estado",
        celulas: [
          <Mesa key="m" largura={420}><Composto inicial="note" replyDisabled /></Mesa>,
          <Mesa key="u" largura={420}><Composto attachment={{ name: "foto-produto.jpg", uploading: true }} /></Mesa>,
          <Mesa key="l" largura={420}><Composto texto="Texto que passou do limite configurado." maxLength={20} /></Mesa>,
        ],
      }]} />
    </Secao>
  </Prancha>,
};

/** Responder: a caixa escolhida à direita, clipe e respostas prontas em tinta, carvão para enviar. */
export const Responder: Story = { render: () => <Mesa largura={640}><Composto /></Mesa> };
/** Nota: véu de aviso suave e «Somente equipe». */
export const Nota: Story = { render: () => <Mesa largura={640}><Composto inicial="note" /></Mesa> };
/** Fora da janela de 24 h do WhatsApp: o aviso abre espaço e o texto vira o modelo aprovado. */
export const ForaDaJanela: Story = {
  name: "Fora da janela de 24 h",
  render: () => <Mesa largura={640}><Composto canSubmit notice={<Signal tone="warning">Fora da janela de 24 h do WhatsApp: só modelo aprovado passa.</Signal>} body={<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <Select label="Modelo aprovado" defaultValue="entrega" options={[{ value: "entrega", label: "pedido_saiu_para_entrega (pt_BR)" }]} />
    <ReplyComposerPreview>Olá, Carla! Seu pedido 1234 saiu para entrega e chega até amanhã.</ReplyComposerPreview>
  </div>} /></Mesa>,
};
/** Sem respostas prontas para a equipe: o menu explica em vez de ficar vazio. */
export const SemRespostasProntas: Story = { name: "Sem respostas prontas", render: () => <Mesa largura={640}><Composto tools={<MenuButton variant="ghost" size="sm" iconOnly indicator={false} icon={<Icon name="text" />} aria-label="Inserir resposta pronta" menu={<MenuNote>Nenhuma resposta pronta para esta equipe.</MenuNote>} />} /></Mesa> };
/** Texto longo: o campo cresce até 224px e rola por dentro. */
export const TextoLongo: Story = { name: "Texto longo", render: () => <Mesa largura={640}><Composto texto={LONGO} /></Mesa> };
/** Coluna estreita (celular): a rota encolhe com reticências, nada vaza da folha. */
export const Estreita: Story = { render: () => <Mesa largura={340}><Composto texto="Olá!" /></Mesa> };
/** Desabilitado: a caixa escolhida não responde (conversa manual) — só nota. */
export const SoNota: Story = { name: "Só nota", render: () => <Mesa largura={640}><Composto inicial="note" replyDisabled /></Mesa> };
