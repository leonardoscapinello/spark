import type { Meta, StoryObj } from "@storybook/react-vite";
import { Surface } from "../Surface/Surface.js";
import { Prancha, Secao } from "./Prancha.js";
import s from "./Identidade.module.css";

const CAMADAS = [
  { nome: "Tokens", onde: "packages/tokens", texto: "Cor, papel, tinta, raio, altura, sombra, fonte, curva e duração. Um valor muda aqui e chega a tudo." },
  { nome: "Física", onde: "packages/ui-web/src/identidade.css", texto: "Uma só física: 550 ms Respiro para cor, sombra e forma; toque em 100 ms; indicadores que deslizam; camadas que entram e saem." },
  { nome: "Componentes", onde: "packages/ui-web", texto: "Botão, campo, menu, tabela, folha. Cada padrão tem um dono. A aparência mora aqui e só aqui." },
  { nome: "Telas", onde: "apps/web", texto: "Só fazem layout: posição, grade, espaço. Nunca cor, borda, raio, sombra ou fonte (ADR-0045)." },
] as const;

const GRUPOS = [
  ["Identidade", "Os tokens e a física, lidos ao vivo da folha de estilo carregada."],
  ["Ações", "Botões em todas as variantes, botão com menu, botão dividido, retorno de ação e link de volta."],
  ["Campos", "Texto, senha, máscara, CPF/CNPJ, telefone, dinheiro, porcentagem, data e hora, seletores, busca, cor, arquivo e campo que edita na linha."],
  ["Escolhas", "Caixa de seleção, chave, opção única, controle segmentado e alternância de visualização."],
  ["Navegação", "Barra lateral, trilho de módulos, abas, abas com link, sanfona, busca rápida e listas de escolha."],
  ["Camadas", "Menu, popover, dica, modal, painel lateral e o vidro que todas usam."],
  ["Dados", "Tabela, linha de lista, avatar, identidade de pessoa e de registro, etiqueta, sinal, linha do tempo, calendário e gráficos."],
  ["Retorno", "Notificação, aviso, estado vazio, carregamento, progresso e confirmação."],
  ["Superfícies", "Folha, cartão, indicador e as composições de painel."],
  ["Estrutura", "Cabeçalho de página e de registro, moldura de área, barra de coleção e filtros."],
  ["Padrões", "Composições prontas que as telas repetem: formulário, ficha, área do CRM, compositor."],
] as const;

function ComeceAqui() {
  return (
    <Prancha>
      <header className={s.capa}>
        <h1>Um sistema só</h1>
        <p>
          Este Storybook é o sistema inteiro do Spark, não uma página de exemplo. Cada componente aparece com todas as
          variantes e estados, nos dois temas e em qualquer largura. Mudou o token ou o componente, muda aqui e em
          toda tela que o usa.
        </p>
      </header>

      <Secao titulo="Como o sistema é montado" descricao="Quatro camadas, cada uma com um dono. A de cima alimenta a de baixo.">
        <div className={s.camadas}>
          {CAMADAS.map(camada => (
            <Surface key={camada.nome} elevation="pousada" radius="lista" className={s.camada}>
              <strong>{camada.nome}</strong>
              <span>{camada.texto}</span>
              <code>{camada.onde}</code>
            </Surface>
          ))}
        </div>
      </Secao>

      <Secao titulo="Como ver" descricao="A barra de ferramentas do Storybook troca o contexto de todas as histórias de uma vez.">
        <ul className={s.regras}>
          <li><strong>Tema:</strong> Claro, Escuro ou Do sistema. Menus, modais e dicas acompanham.</li>
          <li><strong>Tamanho de tela:</strong> Celular 375, Tablet 768, Notebook 1280 e Desktop 1440.</li>
          <li><strong>Docs:</strong> cada componente tem uma página com todas as histórias e a tabela de props.</li>
          <li><strong>Acessibilidade:</strong> a aba de acessibilidade aponta violação em qualquer história.</li>
        </ul>
      </Secao>

      <Secao titulo="O que tem em cada grupo">
        <ul className={s.regras}>
          {GRUPOS.map(([grupo, texto]) => <li key={grupo}><strong>{grupo}:</strong> {texto}</li>)}
        </ul>
      </Secao>

      <Secao titulo="Regras que valem para tudo" descricao="Decididas nos ADRs 0044 e 0045 e nas correções do usuário.">
        <ul className={s.regras}>
          <li><strong>Um padrão, um componente.</strong> Se dois lugares mostram a mesma coisa, é o mesmo componente.</li>
          <li><strong>Tela só faz layout.</strong> Aparência nova vira variante do componente, nunca CSS de tela.</li>
          <li><strong>Nada de valor literal.</strong> Cor, raio, sombra, fonte, curva e duração vêm dos tokens.</li>
          <li><strong>Controles são pílula.</strong> Superfícies são squircle, com os raios da identidade.</li>
          <li><strong>Ícone e avatar ocupam o mesmo encaixe.</strong> O texto começa sempre no mesmo lugar.</li>
          <li><strong>Texto que informa nunca usa --tx4.</strong> E nada vaza do contêiner.</li>
          <li><strong>Toda linha de tabela abre o registro.</strong> Clique, Enter ou clique do meio para nova aba.</li>
          <li><strong>Cor só quando significa.</strong> Status é sinal pequeno; listas longas são densas.</li>
        </ul>
      </Secao>
    </Prancha>
  );
}

const meta = {
  title: "Identidade/Comece aqui",
  component: ComeceAqui,
  tags: ["!autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof ComeceAqui>;

export default meta;

export const UmSistemaSo: StoryObj<typeof meta> = { name: "Um sistema só" };
