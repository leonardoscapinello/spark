import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type CSSProperties } from "react";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { PasswordInput } from "../PasswordInput/PasswordInput.js";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl.js";
import { Amostra, Fileira, Mesa, Prancha, Secao } from "./Prancha.js";
import { comPrefixo, curva, emMs, nomesDeTokens, useTema, valorDe } from "./tokens.js";
import s from "./Identidade.module.css";

const CURVA_USO: Record<string, string> = {
  "--ease": "Respiro. A curva de tudo: cor, sombra, forma, indicador.",
  "--ease-move": "Movimento de posição e redesenho de traço.",
  "--ease-spring": "Mola: pastilha do switch.",
  "--ease-pop": "Estalo: ponto do rádio, selo.",
  "--ease-out": "Saída rápida: o que fecha não pede atenção.",
  "--ease-land": "Pouso: o que chega e assenta.",
};

function Desenho({ nome }: { nome: string }) {
  const pontos = curva(valorDe(nome));
  if (!pontos) return null;
  const [x1, y1, x2, y2] = pontos;
  const y = (valor: number) => 100 - valor * 100;
  return (
    <svg className={s.curva} viewBox="0 0 100 100" fill="none" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M0 100 L100 0" strokeDasharray="2 4" />
      <path d={`M0 100 C${x1 * 100} ${y(y1)} ${x2 * 100} ${y(y2)} 100 0`} />
    </svg>
  );
}

function Trilho({ transicao, ida }: { transicao: string; ida: boolean }) {
  return (
    <span className={s.trilho} data-ida={ida || undefined}>
      <span className={s.bolinha} style={{ transition: transicao }} />
    </span>
  );
}

function Movimento() {
  useTema();
  const [ida, setIda] = useState(false);
  const [rodada, setRodada] = useState(0);
  const [segmento, setSegmento] = useState<"lista" | "quadro" | "agenda">("lista");
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<"parado" | "salvando" | "salvo">("parado");
  const nomes = nomesDeTokens();
  const curvas = comPrefixo(nomes, "--ease");
  const molas = comPrefixo(nomes, "--motion-spring-").filter(nome => !nome.endsWith("-duration"));
  const duracoes = comPrefixo(nomes, "--t-").sort((a, b) => emMs(valorDe(a)) - emMs(valorDe(b)));
  const animacoes = Array.from(document.styleSheets).flatMap(folha => {
    try {
      return Array.from(folha.cssRules);
    } catch {
      return [];
    }
  }).flatMap(regra => (regra instanceof CSSStyleRule && regra.selectorText === ":root" ? Array.from(regra.style).filter(nome => nome.startsWith("--anim-")) : []));
  const reproduzir = <Button variant="secondary" size="sm" icon={<Icon name="play" />} onClick={() => setIda(valor => !valor)}>Reproduzir</Button>;

  function salvar() {
    setEstado("salvando");
    window.setTimeout(() => setEstado("salvo"), 1400);
    window.setTimeout(() => setEstado("parado"), 3200);
  }

  return (
    <Prancha>
      <Secao titulo="Uma só física" descricao="Tudo que muda de cor, sombra, borda, forma, opacidade ou posição muda em 550 ms na curva Respiro. O toque responde em 100 ms no pointer-down. Camadas entram com estalo e saem rápido. Quem pede menos movimento recebe só a troca de opacidade.">
        <Fileira rotulo="Padrão">
          <code className={s.valor}>--t-default · {valorDe("--t-default")} · --ease · {valorDe("--ease")}</code>
        </Fileira>
      </Secao>

      <Secao titulo="Curvas" descricao="Cada curva com o desenho e a bolinha andando na duração padrão.">
        <Fileira rotulo="Comparar">{reproduzir}</Fileira>
        {curvas.map(nome => (
          <Fileira key={nome} rotulo={nome}>
            <Desenho nome={nome} />
            <Amostra legenda={valorDe(nome)}>
              <Trilho ida={ida} transicao={`transform var(--t-default) var(${nome})`} />
              {CURVA_USO[nome] && <span className={s.uso}>{CURVA_USO[nome]}</span>}
            </Amostra>
          </Fileira>
        ))}
        {molas.map(nome => (
          <Fileira key={nome} rotulo={nome}>
            <Amostra legenda={`${valorDe(`${nome}-duration`)} · mola`}>
              <Trilho ida={ida} transicao={`transform var(${nome}-duration) var(${nome})`} />
            </Amostra>
          </Fileira>
        ))}
      </Secao>

      <Secao titulo="Durações" descricao="Todas as durações do sistema, da mais curta à mais longa, na curva Respiro. Atrasos e intervalos (tip-delay, stagger, toast-life) aparecem na mesma régua.">
        <Fileira rotulo="Comparar">{reproduzir}</Fileira>
        {duracoes.map(nome => (
          <Fileira key={nome} rotulo={`${nome} · ${valorDe(nome)}`}>
            <Trilho ida={ida} transicao={`transform var(${nome}) var(--ease)`} />
          </Fileira>
        ))}
      </Secao>

      <Secao titulo="Entradas e saídas" descricao="Os keyframes da identidade, cada um na duração padrão. Componentes escolhem a duração própria (pop 380, rise 620, drawer 450…).">
        <Fileira rotulo="Repetir"><Button variant="secondary" size="sm" icon={<Icon name="refresh" />} onClick={() => setRodada(valor => valor + 1)}>Reproduzir todas</Button></Fileira>
        <div className={s.grade}>
          {animacoes.map(nome => (
            <Amostra key={`${nome}:${rodada}`} legenda={nome}>
              <span className={s.animacao} style={{ animation: `var(${nome}) var(--t-default) var(--ease) both` } as CSSProperties} />
            </Amostra>
          ))}
        </div>
      </Secao>

      <Secao titulo="Toque e resposta" descricao="A física aplicada pelos componentes. Experimente cada uma.">
        <Fileira rotulo="Pressionar">
          <Button>Carvão afunda</Button>
          <Button variant="secondary">Folha ergue</Button>
          <Button variant="ghost">Tinta encolhe</Button>
        </Fileira>
        <Fileira rotulo="Indicador desliza">
          <SegmentedControl label="Visualização" value={segmento} onValueChange={setSegmento} options={[{ value: "lista", label: "Lista" }, { value: "quadro", label: "Quadro" }, { value: "agenda", label: "Agenda" }]} />
        </Fileira>
        <Fileira rotulo="Rótulo morfa">
          <Button loading={estado === "salvando"} icon={estado === "salvo" ? <Icon name="check" /> : undefined} onClick={salvar}>{estado === "parado" ? "Salvar" : estado === "salvando" ? "Salvando…" : "Salvo"}</Button>
        </Fileira>
        <Fileira rotulo="Rótulo que não cabe">
          <div className={s.estreito}><Button variant="secondary">Encaminhar para a equipe de sucesso do cliente</Button></div>
        </Fileira>
        <Fileira rotulo="Abre espaço" topo>
          <div className={s.colapso}>
            <Button variant="secondary" size="sm" onClick={() => setAberto(valor => !valor)}>{aberto ? "Fechar mensagem" : "Abrir mensagem"}</Button>
            <div data-collapse="" data-open={String(aberto)}>
              <div><p>Nada surge do nada: a mensagem abre o próprio espaço de zero até a altura dela.</p></div>
            </div>
          </div>
        </Fileira>
        <Fileira rotulo="Traço redesenha">
          <span data-ai="" className={s.glifo}><Icon name="sparkle" /><span>passe o cursor</span></span>
          <span data-ai="" className={s.glifo}><Icon name="bell" /><span>passe o cursor</span></span>
        </Fileira>
        <Fileira rotulo="Tinta ao digitar" topo>
          <Mesa largura={320}>
            <Field><Label>Nome</Label><Input placeholder="Digite para ver a tinta" /></Field>
            <Field><Label>Senha</Label><PasswordInput placeholder="Cada caractere é um traço a carvão" /></Field>
          </Mesa>
        </Fileira>
      </Secao>
    </Prancha>
  );
}

const meta = { title: "Identidade/Movimento", component: Movimento, tags: ["!autodocs"] } satisfies Meta<typeof Movimento>;
export default meta;
export const Fisica: StoryObj<typeof meta> = { name: "Curvas, durações e física" };
