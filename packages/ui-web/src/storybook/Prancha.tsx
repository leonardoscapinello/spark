import type { CSSProperties, ReactNode } from "react";
import s from "./Prancha.module.css";

/* Peças de apresentação das histórias. Não são exportadas pelo pacote:
 * servem só para o Storybook mostrar cada componente como uma folha de
 * componentes — todas as variantes, todos os estados, lado a lado. */

export function Prancha({ children }: { children: ReactNode }) {
  return <div className={s.prancha}>{children}</div>;
}

export function Secao({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <section className={s.secao} aria-label={titulo}>
      <header className={s.cabecalho}>
        <h2 className={s.titulo}>{titulo}</h2>
        {descricao && <p className={s.descricao}>{descricao}</p>}
      </header>
      {children}
    </section>
  );
}

/** Uma linha rotulada: o nome do estado à esquerda, as peças à direita. */
export function Fileira({ rotulo, children, topo = false, coluna = false }: { rotulo: string; children: ReactNode; topo?: boolean; coluna?: boolean }) {
  return (
    <div className={s.fileira} data-alinhar={topo ? "topo" : undefined}>
      <span className={s.rotulo}>{rotulo}</span>
      <div className={s.itens} data-coluna={coluna || undefined}>{children}</div>
    </div>
  );
}

/** Matriz linha × coluna — variante × tamanho, variante × estado. */
export function Matriz({ colunas, linhas }: { colunas: readonly string[]; linhas: readonly { rotulo: string; celulas: readonly ReactNode[] }[] }) {
  return (
    <div className={s.matriz} style={{ "--colunas": colunas.length } as CSSProperties} role="presentation">
      <span />
      {colunas.map(coluna => <span key={coluna} className={s.cabecaColuna}>{coluna}</span>)}
      {linhas.map(linha => [
        <span key={`${linha.rotulo}:rotulo`} className={s.rotulo}>{linha.rotulo}</span>,
        ...linha.celulas.map((celula, indice) => <div key={`${linha.rotulo}:${colunas[indice] ?? indice}`}>{celula}</div>),
      ])}
    </div>
  );
}

/** Uma peça com legenda embaixo (nome do token, valor, variante). */
export function Amostra({ legenda, children }: { legenda: ReactNode; children: ReactNode }) {
  return (
    <div className={s.amostra}>
      {children}
      <span className={s.legenda}>{legenda}</span>
    </div>
  );
}

/** Coluna de largura controlada, para campos e formulários. */
export function Mesa({ children, largura }: { children: ReactNode; largura?: number }) {
  return <div className={s.mesa} style={largura ? ({ "--largura": `${largura}px` } as CSSProperties) : undefined}>{children}</div>;
}

/** Folha erguida onde camadas (menu, dica, popover) abrem durante a história. */
export function Palco({ children, altura }: { children: ReactNode; altura?: number }) {
  return <div className={s.palco} style={altura ? ({ "--altura": `${altura}px` } as CSSProperties) : undefined}>{children}</div>;
}
