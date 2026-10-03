import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { Surface, type SurfaceElevation } from "../Surface/Surface.js";
import { Amostra, Prancha, Secao } from "./Prancha.js";
import { comPrefixo, nomesDeTokens, useTema, valorDe } from "./tokens.js";
import s from "./Identidade.module.css";

const SOMBRAS: Record<string, { uso: string; fundo?: string; tinta?: string }> = {
  "--sh1": { uso: "Folha pousada: botão secundário, item selecionado, cartão." },
  "--e2": { uso: "Folha erguida: barra lateral, menu, hover de folha clicável." },
  "--e3": { uso: "Folha segurada: modal e painel lateral." },
  "--deb": { uso: "Cavado: campo, trilho do switch, caixa de seleção.", fundo: "var(--sf2)" },
  "--ink": { uso: "Carvão: botão primário em repouso.", fundo: "var(--ac)", tinta: "var(--acf)" },
  "--inkp": { uso: "Carvão pressionado.", fundo: "var(--ac)", tinta: "var(--acf)" },
};

const ALTURAS: readonly [SurfaceElevation, string][] = [
  ["pousada", "Cartão, tabela, seção. O padrão."],
  ["erguida", "Barra lateral, coluna em destaque, hover."],
  ["segurada", "Modal e painel lateral: está na mão."],
  ["cavada", "Trilho, coluna do quadro, área de soltar."],
];

function Relevo() {
  useTema();
  const nomes = nomesDeTokens();
  const extras = comPrefixo(nomes, "--sombra-");
  return (
    <Prancha>
      <Secao titulo="Sombras" descricao="Cinco camadas em cada sombra, com a mesma estrutura, para uma passar para a outra em 550 ms sem salto.">
        <div className={s.grade}>
          {[...Object.keys(SOMBRAS), ...extras].map(nome => {
            const info = SOMBRAS[nome];
            const estilo = { "--s": `var(${nome})`, "--fundo": info?.fundo ?? "var(--sf3)", "--tinta": info?.tinta ?? "var(--tx3)" } as CSSProperties;
            return (
              <Amostra key={nome} legenda={nome}>
                <span className={s.sombra} style={estilo}>{nome}</span>
                {info && <span className={s.uso}>{info.uso}</span>}
                <span className={s.valor}>{valorDe(nome)}</span>
              </Amostra>
            );
          })}
        </div>
      </Secao>
      <Secao titulo="Alturas da folha" descricao="A tela escolhe a altura; o componente Surface desenha papel, borda, granulação e sombra.">
        <div className={s.grade}>
          {ALTURAS.map(([altura, uso]) => (
            <Amostra key={altura} legenda={`elevation="${altura}"`}>
              <Surface elevation={altura} radius="lista" className={s.vidroConteudo}>
                <strong>{altura[0]?.toUpperCase()}{altura.slice(1)}</strong>
                <small>{uso}</small>
              </Surface>
            </Amostra>
          ))}
        </div>
      </Secao>
      <Secao titulo="Folha clicável" descricao="interactive ergue 1 px com --e2 no hover. Só quando a folha inteira é um alvo.">
        <div className={s.grade}>
          <Surface elevation="pousada" radius="lista" interactive tabIndex={0} className={s.vidroConteudo}>
            <strong>Passe o cursor</strong>
            <small>Ergue e ganha a sombra erguida.</small>
          </Surface>
        </div>
      </Secao>
    </Prancha>
  );
}

const meta = { title: "Identidade/Relevo", component: Relevo, tags: ["!autodocs"] } satisfies Meta<typeof Relevo>;
export default meta;
export const SombrasEAlturas: StoryObj<typeof meta> = { name: "Sombras e alturas" };
