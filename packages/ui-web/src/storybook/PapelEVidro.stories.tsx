import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { Glass, type GlassTier } from "../Glass/Glass.js";
import { Amostra, Prancha, Secao } from "./Prancha.js";
import { useTema } from "./tokens.js";
import s from "./Identidade.module.css";

const PAPEIS = ["--bg", "--sf", "--sf2", "--sf3"] as const;

const VIDROS: readonly [GlassTier, string][] = [
  ["subtle", "Barra flutuante discreta."],
  ["panel", "Menu, lista, popover e seletor: o mesmo vidro em todo dropdown."],
  ["modal", "Camada sobre o véu."],
  ["help", "Dica em carvão."],
];

function PapelEVidro() {
  useTema();
  return (
    <Prancha>
      <Secao titulo="Papel com granulação" descricao="Toda folha leva o grão (--grain). À esquerda, o papel como o app mostra; à direita, sem o grão, só para comparar.">
        <div className={s.grade}>
          {PAPEIS.flatMap(papel => [
            <Amostra key={`${papel}:grao`} legenda={`${papel} + --grain`}><span className={s.papel} data-grao="" style={{ "--c": `var(${papel})` } as CSSProperties}>com grão</span></Amostra>,
            <Amostra key={`${papel}:liso`} legenda={papel}><span className={s.papel} style={{ "--c": `var(${papel})` } as CSSProperties}>sem grão</span></Amostra>,
          ])}
        </div>
      </Secao>
      <Secao titulo="Vidro" descricao="Vidro vive só na navegação flutuante e só dentro do componente Glass (ADR-0025). Conteúdo é sempre papel sólido. As listras atrás mostram o desfoque.">
        <div className={s.listras}>
          {VIDROS.map(([tier, uso]) => (
            <Glass key={tier} tier={tier}>
              <div className={s.vidroConteudo}>
                <strong>tier="{tier}"</strong>
                <small>{uso}</small>
              </div>
            </Glass>
          ))}
        </div>
      </Secao>
    </Prancha>
  );
}

const meta = { title: "Identidade/Papel e vidro", component: PapelEVidro, tags: ["!autodocs"] } satisfies Meta<typeof PapelEVidro>;
export default meta;
export const PapelVidro: StoryObj<typeof meta> = { name: "Papel e vidro" };
