import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { Amostra, Fileira, Prancha, Secao } from "./Prancha.js";
import { comPrefixo, nomesDeTokens, useTema, valorDe } from "./tokens.js";
import s from "./Identidade.module.css";

const USO: Record<string, string> = {
  "--r-pill": "Todo controle: botão, campo, chip, item de menu da barra.",
  "--r-check": "Caixa de seleção.",
  "--r-mark": "Marcas finas: traço de aba, barra de progresso.",
  "--r-lista": "Menu, popover, lista flutuante, área de texto.",
  "--r-bloco": "Aviso e notificação.",
  "--r-kpi": "Cartão de indicador.",
  "--r-xl": "Folha de conteúdo, cartão, modal, barra lateral.",
};

const ALTURA: Record<string, string> = {
  "--h-sm": "Botão pequeno",
  "--h-md": "Botão, item de menu, linha de barra lateral",
  "--h-field": "Campo",
  "--h-lg": "Botão grande, alvo mínimo de toque",
};

function px(nome: string) {
  return Number.parseFloat(valorDe(nome)) || 0;
}

function FormaEMedidas() {
  useTema();
  const nomes = nomesDeTokens();
  const raios = comPrefixo(nomes, "--r-").filter(nome => nome !== "--r-shape").sort((a, b) => px(a) - px(b));
  const alturas = comPrefixo(nomes, "--h-").sort((a, b) => px(a) - px(b));
  const espacos = comPrefixo(nomes, "--space-").sort((a, b) => px(a) - px(b));
  const respiros = comPrefixo(nomes, "--pad-").sort((a, b) => px(a) - px(b));
  const medidas = comPrefixo(nomes, "--ui-");
  return (
    <Prancha>
      <Secao titulo="Raios" descricao={`Controle é pílula; superfície é squircle (corner-shape: ${valorDe("--r-shape") || "squircle"}). A caixa cresce com o raio para a curva caber.`}>
        <div className={s.grade}>
          {raios.map(nome => {
            const raio = Math.min(px(nome), 64);
            const pilula = px(nome) > 200;
            const estilo = { "--r": `var(${nome})`, "--w": `${pilula ? 140 : Math.max(96, raio * 2 + 40)}px`, "--h": `${pilula ? 44 : Math.max(72, raio * 2 + 16)}px` } as CSSProperties;
            return (
              <Amostra key={nome} legenda={`${nome} · ${valorDe(nome)}`}>
                <span className={s.raio} style={estilo} />
                {USO[nome] && <span className={s.uso}>{USO[nome]}</span>}
              </Amostra>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Squircle e círculo" descricao="O mesmo raio com as duas formas de canto. A identidade usa squircle em toda superfície.">
        <Fileira rotulo="--r-xl">
          <Amostra legenda="corner-shape: round"><span className={s.raio} style={{ "--r": "var(--r-xl)", "--w": "160px", "--h": "120px", "--forma": "round" } as CSSProperties} /></Amostra>
          <Amostra legenda="corner-shape: squircle"><span className={s.raio} style={{ "--r": "var(--r-xl)", "--w": "160px", "--h": "120px" } as CSSProperties} /></Amostra>
        </Fileira>
      </Secao>

      <Secao titulo="Alturas" descricao="Quatro alturas para tudo que se clica. Toque grosso ganha alvo de 44 sem mudar o desenho.">
        {alturas.map(nome => (
          <Fileira key={nome} rotulo={`${nome} · ${valorDe(nome)}`}>
            <span className={s.altura} style={{ "--h": `var(${nome})` } as CSSProperties}>{ALTURA[nome] ?? nome}</span>
          </Fileira>
        ))}
      </Secao>

      <Secao titulo="Espaços" descricao="A régua de espaçamento. Telas usam só estes valores para gap, margem e respiro.">
        {espacos.map(nome => (
          <Fileira key={nome} rotulo={`${nome} · ${valorDe(nome)}`}>
            <span className={s.espaco} style={{ "--w": `var(${nome})` } as CSSProperties} />
          </Fileira>
        ))}
      </Secao>

      <Secao titulo="Respiro de controle" descricao="Padding lateral do botão por tamanho (sm, md, lg).">
        {respiros.map(nome => (
          <Fileira key={nome} rotulo={`${nome} · ${valorDe(nome)}`}>
            <span className={s.espaco} style={{ "--w": `var(${nome})` } as CSSProperties} />
          </Fileira>
        ))}
      </Secao>

      <Secao titulo="Medidas de estrutura" descricao="Larguras e medidas de layout (trilho, barra lateral, painéis, ícones). Não são aparência; são o esqueleto.">
        <div className={s.grade}>
          {medidas.map(nome => (
            <div key={nome} className={s.cartela}>
              <code className={s.nome}>{nome}</code>
              <span className={s.valor}>{valorDe(nome)}</span>
            </div>
          ))}
        </div>
      </Secao>
    </Prancha>
  );
}

const meta = { title: "Identidade/Forma e medidas", component: FormaEMedidas, tags: ["!autodocs"] } satisfies Meta<typeof FormaEMedidas>;
export default meta;
export const Medidas: StoryObj<typeof meta> = { name: "Raios, alturas e espaços" };
