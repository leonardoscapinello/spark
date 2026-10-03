import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { FieldDescription } from "../Form/Form.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { Select } from "../Select/Select.js";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { Textarea } from "../Textarea/Textarea.js";
import { ActionModal } from "./ActionModal.js";
import { Modal, ModalClose, ModalColumn, ModalColumns, ModalContent, ModalTrigger, type ModalContentProps } from "./Modal.js";

function Formulario() {
  return (
    <>
      <Field><Label>Nome da visualização</Label><Input placeholder="Ex.: Qualificados de São Paulo" /></Field>
      <Field><Label>Equipe</Label><Select label="Equipe" options={[{ value: "vendas", label: "Vendas" }, { value: "suporte", label: "Atendimento" }]} /></Field>
      <Field><Label>Descrição</Label><Textarea rows={3} /><FieldDescription>Aparece para quem abrir a visualização.</FieldDescription></Field>
    </>
  );
}

const rodape = <><ModalClose render={<Button variant="secondary">Cancelar</Button>} /><Button>Salvar</Button></>;

function Abrir({ rotulo, ...props }: { rotulo: string } & Partial<ModalContentProps>) {
  return (
    <Modal>
      <ModalTrigger render={<Button variant="secondary">{rotulo}</Button>} />
      <ModalContent title="Criar visualização" description="Escolha os critérios das conversas que deseja acompanhar." footer={rodape} {...props}>
        <Formulario />
      </ModalContent>
    </Modal>
  );
}

const meta = {
  title: "Camadas/Modal",
  component: ModalContent,
  subcomponents: { Modal, ModalTrigger, ModalClose, ModalColumns, ModalColumn, ActionModal },
  parameters: {
    docs: { description: { component: "Folha segurada sobre o véu. Sobe 10 px e assenta em 620 ms, afunda em 280 ms ao sair; em gaveta, desliza da borda em 450 ms e sai em 220 ms. Título de 20, fechar em tinta, ações no rodapé: secundária e carvão." } },
  },
} satisfies Meta<typeof ModalContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {
  args: { title: "Criar visualização", description: "Escolha os critérios das conversas que deseja acompanhar.", size: "default", placement: "center", children: null },
  argTypes: {
    size: { control: "inline-radio", options: ["default", "wide", "workspace", "record"] },
    placement: { control: "inline-radio", options: ["center", "right", "left", "top", "bottom"] },
    children: { control: false },
  },
  render: args => (
    <Modal>
      <ModalTrigger render={<Button>Abrir modal</Button>} />
      <ModalContent {...args} footer={rodape}><Formulario /></ModalContent>
    </Modal>
  ),
};

export const Aberto: Story = {
  name: "Aberto",
  tags: ["!autodocs"],
  args: { title: "", children: null },
  render: () => (
    <Modal defaultOpen>
      <ModalTrigger render={<Button>Abrir de novo</Button>} />
      <ModalContent title="Criar visualização" description="Escolha os critérios das conversas que deseja acompanhar." footer={rodape}><Formulario /></ModalContent>
    </Modal>
  ),
};

export const TamanhosEPosicoes: Story = {
  name: "Tamanhos e posições",
  args: { title: "", children: null },
  render: () => (
    <Prancha>
      <Secao titulo="Tamanhos" descricao="default para formulário curto; wide para duas colunas; workspace para ferramenta; record para a ficha aberta por cima da lista (85 %).">
        <Fileira rotulo="size">{(["default", "wide", "workspace", "record"] as const).map(tamanho => <Abrir key={tamanho} rotulo={tamanho} size={tamanho} />)}</Fileira>
      </Secao>
      <Secao titulo="Posições" descricao="Fora do centro, a modal vira gaveta e o véu desfoca só do lado dela.">
        <Fileira rotulo="placement">{(["center", "right", "left", "top", "bottom"] as const).map(posicao => <Abrir key={posicao} rotulo={posicao} placement={posicao} />)}</Fileira>
      </Secao>
      <Secao titulo="Composições">
        <Fileira rotulo="Colunas">
          <Modal>
            <ModalTrigger render={<Button variant="secondary">Duas colunas</Button>} />
            <ModalContent title="Mesclar contatos" size="wide" footer={rodape}>
              <ModalColumns>
                <ModalColumn title="Manter"><Field><Label>Nome</Label><Input defaultValue="Ana Souza" /></Field></ModalColumn>
                <ModalColumn title="Descartar"><Field><Label>Nome</Label><Input defaultValue="Ana S." /></Field></ModalColumn>
              </ModalColumns>
            </ModalContent>
          </Modal>
        </Fileira>
        <Fileira rotulo="Ação no cabeçalho">
          <Modal>
            <ModalTrigger render={<Button variant="secondary">Com ação</Button>} />
            <ModalContent title="Proposta anual" headerAction={<Button variant="ghost" size="sm" iconOnly icon={<Icon name="copy" />} aria-label="Copiar link" />} footer={rodape}><Formulario /></ModalContent>
          </Modal>
        </Fileira>
        <Fileira rotulo="Corpo rente">
          <Modal>
            <ModalTrigger render={<Button variant="secondary">Sem respiro</Button>} />
            <ModalContent title="Prévia" bodyDensity="flush"><div style={{ height: 240, background: "var(--sf2)" }} /></ModalContent>
          </Modal>
        </Fileira>
      </Secao>
    </Prancha>
  ),
};

function Confirmacao({ falhar }: { falhar: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  return (
    <>
      <Button variant={falhar ? "secondary" : "primary"} onClick={() => { setTentativas(0); setAberto(true); }}>{falhar ? "Confirmar (falha na 1ª)" : "Confirmar"}</Button>
      <ActionModal
        open={aberto}
        onOpenChange={setAberto}
        title="Concluir atividade?"
        confirmLabel="Concluir"
        onConfirm={() => new Promise<void>((resolve, reject) => window.setTimeout(() => {
          setTentativas(valor => valor + 1);
          if (falhar && tentativas === 0) reject(new Error("A conexão caiu. Tente de novo."));
          else resolve();
        }, 900))}
      >
        <p>A atividade sai da agenda e entra no histórico do negócio.</p>
      </ActionModal>
    </>
  );
}

export const Confirmar: Story = {
  name: "Confirmação com retorno",
  args: { title: "", children: null },
  render: () => (
    <Prancha>
      <Secao titulo="ActionModal" descricao="Enquanto confirma, o botão carrega e a modal não fecha; se falhar, a mensagem real aparece num aviso e a modal continua aberta para tentar de novo.">
        <Fileira rotulo="Experimente"><Confirmacao falhar={false} /><Confirmacao falhar /></Fileira>
      </Secao>
    </Prancha>
  ),
};
