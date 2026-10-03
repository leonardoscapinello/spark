import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type CSSProperties } from "react";
import { Field } from "../Field/Field.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { glyphs } from "../Icon/glyphs.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { Amostra, Fileira, Mesa, Prancha, Secao } from "./Prancha.js";
import s from "./Identidade.module.css";

const NOMES = Object.keys(glyphs).sort((a, b) => a.localeCompare(b)) as IconName[];
const TAMANHOS = [["--ui-iconSm", "Botão pequeno"], ["--ui-icon", "Padrão"], ["--ui-iconLg", "Botão grande"], ["24px", "Disco e destaque"]] as const;

function Icones() {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const visiveis = termo ? NOMES.filter(nome => nome.toLowerCase().includes(termo)) : NOMES;
  return (
    <Prancha>
      <Secao titulo="Traço" descricao="viewBox 24, traço 1,5, pontas e junções redondas. O tamanho vem de quem envolve (--icon). Cada traço tem pathLength 100, para ser redesenhado no hover.">
        <Fileira rotulo="Tamanhos">
          {TAMANHOS.map(([tamanho, uso]) => (
            <Amostra key={tamanho} legenda={`${tamanho} · ${uso}`}>
              <span className={s.tamanhoIcone} style={{ "--tamanho": tamanho.startsWith("--") ? `var(${tamanho})` : tamanho } as CSSProperties}><Icon name="inbox" /></span>
            </Amostra>
          ))}
        </Fileira>
      </Secao>
      <Secao titulo={`Todos os ícones · ${NOMES.length}`} descricao="Nomes antigos (close, left, right, up, chevron, bolt, team, exit) continuam como apelidos. Passe o cursor para ver o traço redesenhar.">
        <Mesa largura={360}>
          <Field><Label>Buscar ícone</Label><Input type="search" startAdornment={<Icon name="search" />} placeholder="Nome do ícone" value={busca} onChange={evento => setBusca(evento.target.value)} /></Field>
        </Mesa>
        <div className={s.glifos}>
          {visiveis.map(nome => (
            <span key={nome} className={s.glifo} data-ai="" title={`<Icon name="${nome}" />`}>
              <Icon name={nome} />
              <span>{nome}</span>
            </span>
          ))}
        </div>
      </Secao>
    </Prancha>
  );
}

const meta = { title: "Identidade/Ícones", component: Icones, tags: ["!autodocs"] } satisfies Meta<typeof Icones>;
export default meta;
export const Biblioteca: StoryObj<typeof meta> = { name: "Biblioteca de ícones" };
