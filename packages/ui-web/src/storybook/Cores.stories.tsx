import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { Prancha, Secao } from "./Prancha.js";
import { contraste, ehCor, nomesDeTokens, rgbDe, useTema, valorDe } from "./tokens.js";
import s from "./Identidade.module.css";

const GRUPOS: readonly { titulo: string; descricao: string; nomes: readonly string[] }[] = [
  { titulo: "Papel", descricao: "A mesa e as folhas. --bg é a mesa; --sf a folha pousada; --sf2 a folha cavada (campo, trilho); --sf3 a folha segurada (botão secundário, menu, modal).", nomes: ["--bg", "--sf", "--sf2", "--sf3"] },
  { titulo: "Tinta", descricao: "Texto em quatro intensidades. --tx4 é só para o que pode sumir: placeholder e desabilitado. Texto que informa vai até --tx3.", nomes: ["--tx", "--tx2", "--tx3", "--tx4"] },
  { titulo: "Linhas", descricao: "Fios de 1 px: borda de folha, borda de campo e grade de gráfico.", nomes: ["--bd", "--bd2", "--grid"] },
  { titulo: "Carvão e foco", descricao: "A ação principal (um carvão por área), o hover dela, a tinta sobre o carvão, o realce suave de hover e seleção, e o halo de foco.", nomes: ["--ac", "--ach", "--acf", "--acs", "--ring"] },
  { titulo: "Estados", descricao: "Cor que significa, sempre em par: o traço e o fundo suave.", nomes: ["--ok", "--oks", "--er", "--ers", "--wa", "--was", "--in", "--ins"] },
  { titulo: "Pigmentos", descricao: "Avatares, etapas, etiquetas e séries de gráfico. --shu é o vermelho da identidade.", nomes: ["--v0", "--v1", "--v2", "--v3", "--v4", "--v5", "--v6", "--shu"] },
  { titulo: "Vidro e véu", descricao: "Só dentro do Glass: camadas flutuantes de navegação, nunca conteúdo.", nomes: ["--glass", "--glass-lista", "--gbd", "--veil", "--vig"] },
  { titulo: "Sobre a cor", descricao: "Tinta usada sobre pigmento e estado sólido, como as iniciais do avatar.", nomes: ["--sobre-cor"] },
];

const FUNDOS = ["--bg", "--sf", "--sf2", "--sf3"] as const;
const TINTAS = ["--tx", "--tx2", "--tx3", "--tx4"] as const;
const PARES = [
  ["--acf", "--ac", "Tinta sobre carvão"],
  ["--ok", "--oks", "Sucesso"],
  ["--er", "--ers", "Erro"],
  ["--wa", "--was", "Atenção"],
  ["--in", "--ins", "Informação"],
  ["--sobre-cor", "--v1", "Iniciais sobre pigmento 1"],
  ["--sobre-cor", "--v2", "Iniciais sobre pigmento 2"],
  ["--sobre-cor", "--v3", "Iniciais sobre pigmento 3"],
  ["--sobre-cor", "--v4", "Iniciais sobre pigmento 4"],
] as const;

function Cartela({ nome }: { nome: string }) {
  return (
    <div className={s.cartela}>
      <span className={s.cor} style={{ "--c": `var(${nome})` } as CSSProperties} />
      <code className={s.nome}>{nome}</code>
      <span className={s.valor}>{valorDe(nome) || "não definido"}</span>
    </div>
  );
}

function Razao({ texto, fundo }: { texto: string; fundo: string }) {
  const opaco = (rgbDe(fundo)?.[3] ?? 0) >= 1;
  const razao = opaco ? contraste(texto, fundo) : null;
  if (razao === null) return <td>—</td>;
  const minimo = texto === "--tx4" ? 3 : 4.5;
  return <td data-aprovado={razao >= minimo || undefined} data-falha={razao < minimo || undefined}>{razao.toFixed(2)}</td>;
}

function Cores() {
  useTema();
  const agrupados = new Set(GRUPOS.flatMap(grupo => grupo.nomes));
  const outros = nomesDeTokens().filter(nome => !agrupados.has(nome) && !nome.startsWith("--legado-") && ehCor(valorDe(nome)));
  return (
    <Prancha>
      {GRUPOS.map(grupo => (
        <Secao key={grupo.titulo} titulo={grupo.titulo} descricao={grupo.descricao}>
          <div className={s.grade}>{grupo.nomes.map(nome => <Cartela key={nome} nome={nome} />)}</div>
        </Secao>
      ))}
      {outros.length > 0 && (
        <Secao titulo="Demais cores" descricao="Tokens de cor carregados que não pertencem a um grupo acima. Aparecem aqui sozinhos quando alguém cria um.">
          <div className={s.grade}>{outros.map(nome => <Cartela key={nome} nome={nome} />)}</div>
        </Secao>
      )}
      <Secao titulo="Leitura" descricao="Contraste WCAG de cada tinta sobre cada papel, no tema ativo. Texto informativo pede 4,5; --tx4 só aparece em placeholder e desabilitado, onde o mínimo é 3.">
        <table className={s.tabela}>
          <thead><tr><th scope="col">Tinta</th>{FUNDOS.map(fundo => <th key={fundo} scope="col">{fundo}</th>)}</tr></thead>
          <tbody>
            {TINTAS.map(tinta => (
              <tr key={tinta}><th scope="row"><span className={s.leitura} style={{ "--tinta": `var(${tinta})` } as CSSProperties}>{tinta}</span></th>{FUNDOS.map(fundo => <Razao key={fundo} texto={tinta} fundo={fundo} />)}</tr>
            ))}
          </tbody>
        </table>
      </Secao>
      <Secao titulo="Pares de estado" descricao="Traço sobre o próprio fundo suave, e tinta sobre carvão e pigmento.">
        <table className={s.tabela}>
          <thead><tr><th scope="col">Par</th><th scope="col">Amostra</th><th scope="col">Contraste</th></tr></thead>
          <tbody>
            {PARES.map(([texto, fundo, rotulo]) => (
              <tr key={`${texto}${fundo}`}>
                <th scope="row">{rotulo}</th>
                <td><span className={s.leitura} style={{ "--tinta": `var(${texto})`, "--fundo": `var(${fundo})` } as CSSProperties}>{texto} sobre {fundo}</span></td>
                <Razao texto={texto} fundo={fundo} />
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>
    </Prancha>
  );
}

const meta = { title: "Identidade/Cores", component: Cores, tags: ["!autodocs"] } satisfies Meta<typeof Cores>;
export default meta;
export const Paleta: StoryObj<typeof meta> = { name: "Paleta e leitura" };
