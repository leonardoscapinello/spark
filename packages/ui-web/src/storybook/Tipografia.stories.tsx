import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { Amostra, Prancha, Secao } from "./Prancha.js";
import { comPrefixo, nomesDeTokens, useTema, valorDe } from "./tokens.js";
import s from "./Identidade.module.css";

const FAMILIAS = [
  ["--font", "Texto", "Corpo, controles e rótulos."],
  ["--font-display", "Títulos", "Títulos de página, de folha e de modal."],
  ["--mono", "Números e código", "Valores alinhados em tabela, atalhos, identificadores."],
] as const;

const NUMEROS = /numero|display/;

function Tipografia() {
  useTema();
  const nomes = nomesDeTokens();
  const existe = (nome: string) => nomes.includes(nome);
  const tamanhos = comPrefixo(nomes, "--fs-").sort((a, b) => Number.parseFloat(valorDe(b)) - Number.parseFloat(valorDe(a)));
  const pesos = comPrefixo(nomes, "--fw-").filter(nome => /^--fw-\d+$/.test(nome));
  const papeis = comPrefixo(nomes, "--fw-").filter(nome => !/^--fw-\d+$/.test(nome));
  return (
    <Prancha>
      <Secao titulo="Famílias" descricao="Geist e Geist Mono são o padrão. A organização pode escolher outra família de texto; os tokens trocam juntos.">
        <div className={s.grade}>
          {FAMILIAS.map(([nome, titulo, uso]) => (
            <div key={nome} className={s.familia} style={{ "--f": `var(${nome})` } as CSSProperties}>
              <span className={s.familiaAa}>Aa 0123</span>
              <span className={s.familiaFrase}>{titulo}</span>
              <span className={s.uso}>{uso}</span>
              <code className={s.valor}>{nome}: {valorDe(nome)}</code>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Escala" descricao="Cada tamanho com a própria altura de linha, espaçamento e peso, quando o token existe. Números usam a família mono.">
        <div>
          {tamanhos.map(nome => {
            const papel = nome.slice("--fs-".length);
            const estilo = {
              "--f": NUMEROS.test(papel) ? "var(--mono)" : papel.startsWith("h") || papel === "modal" || papel === "card" ? "var(--font-display)" : "var(--font)",
              fontSize: `var(${nome})`,
              lineHeight: existe(`--lh-${papel}`) ? `var(--lh-${papel})` : "normal",
              letterSpacing: existe(`--ls-${papel}`) ? `var(--ls-${papel})` : "normal",
              fontWeight: existe(`--fw-${papel}`) ? `var(--fw-${papel})` : "var(--fw-400)",
            } as CSSProperties;
            return (
              <div key={nome} className={s.escala}>
                <span className={s.escalaTexto} style={estilo}>{NUMEROS.test(papel) ? "R$ 1.250,00" : "Acompanhe as pessoas e o histórico"}</span>
                <span className={s.valor}>
                  {nome} · {valorDe(nome)}
                  {existe(`--lh-${papel}`) && ` / ${valorDe(`--lh-${papel}`)}`}
                  {existe(`--ls-${papel}`) && ` · ${valorDe(`--ls-${papel}`)}`}
                  {existe(`--fw-${papel}`) && ` · peso ${valorDe(`--fw-${papel}`)}`}
                </span>
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Pesos">
        <div className={s.grade}>
          {pesos.map(nome => (
            <Amostra key={nome} legenda={`${nome} · ${valorDe(nome)}`}>
              <span className={s.familiaFrase} style={{ fontWeight: `var(${nome})`, color: "var(--tx)" }}>Negócio fechado</span>
            </Amostra>
          ))}
        </div>
      </Secao>

      <Secao titulo="Pesos por papel" descricao="Os componentes pedem o papel, não o número: título, controle, número e corpo.">
        <div className={s.grade}>
          {papeis.map(nome => (
            <Amostra key={nome} legenda={`${nome} → ${valorDe(nome)}`}>
              <span className={s.familiaFrase} style={{ fontWeight: `var(${nome})`, color: "var(--tx)" }}>{nome.slice(5)}</span>
            </Amostra>
          ))}
        </div>
      </Secao>
    </Prancha>
  );
}

const meta = { title: "Identidade/Tipografia", component: Tipografia, tags: ["!autodocs"] } satisfies Meta<typeof Tipografia>;
export default meta;
export const Escala: StoryObj<typeof meta> = { name: "Famílias, escala e pesos" };
