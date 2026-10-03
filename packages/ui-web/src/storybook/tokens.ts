import { useSyncExternalStore } from "react";

/* Lê os tokens que estão de fato carregados na página, direto das folhas de
 * estilo. As páginas da Identidade usam isto para mostrar o sistema como ele
 * é agora: token novo aparece sozinho, valor mudado aparece mudado. */

function coletar(regras: CSSRuleList, nomes: Set<string>) {
  for (const regra of Array.from(regras)) {
    if (regra instanceof CSSStyleRule) {
      if (!/:root|\[data-theme/.test(regra.selectorText)) continue;
      for (const propriedade of Array.from(regra.style)) if (propriedade.startsWith("--")) nomes.add(propriedade);
    } else if ("cssRules" in regra) {
      coletar((regra as CSSGroupingRule).cssRules, nomes);
    }
  }
}

/** Todos os nomes de variável declarados em :root e nos temas. */
export function nomesDeTokens(): string[] {
  const nomes = new Set<string>();
  for (const folha of Array.from(document.styleSheets)) {
    let regras: CSSRuleList;
    try {
      regras = folha.cssRules;
    } catch {
      continue;
    }
    coletar(regras, nomes);
  }
  return [...nomes].filter(nome => !nome.startsWith("--anim-")).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}

/** Valor calculado agora, no tema ativo. */
export function valorDe(nome: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

export function comPrefixo(nomes: readonly string[], prefixo: string): string[] {
  return nomes.filter(nome => nome.startsWith(prefixo));
}

export function ehCor(valor: string): boolean {
  return valor !== "" && CSS.supports("color", valor);
}

/** Converte "550ms" ou ".55s" em milissegundos. */
export function emMs(valor: string): number {
  const numero = Number.parseFloat(valor);
  if (Number.isNaN(numero)) return 0;
  return valor.trim().endsWith("ms") ? numero : numero * 1000;
}

/** Lê "cubic-bezier(a, b, c, d)" em quatro números. */
export function curva(valor: string): [number, number, number, number] | null {
  const partes = /cubic-bezier\(([^)]+)\)/.exec(valor)?.[1]?.split(",").map(parte => Number.parseFloat(parte));
  if (!partes || partes.length !== 4 || partes.some(Number.isNaN)) return null;
  return partes as [number, number, number, number];
}


function assinarTema(aviso: () => void) {
  const observador = new MutationObserver(aviso);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
  const midia = matchMedia("(prefers-color-scheme: dark)");
  midia.addEventListener("change", aviso);
  return () => {
    observador.disconnect();
    midia.removeEventListener("change", aviso);
  };
}

function temaAgora() {
  return `${document.documentElement.dataset["theme"] ?? "sistema"}:${matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro"}`;
}

/** Re-renderiza quando o tema muda, para os valores lidos acompanharem. */
export function useTema(): string {
  return useSyncExternalStore(assinarTema, temaAgora, () => "servidor");
}

/** Cor calculada de um token em rgb, resolvendo color-mix e var(). */
export function rgbDe(nome: string): [number, number, number, number] | null {
  const sonda = document.createElement("span");
  sonda.style.color = `var(${nome})`;
  sonda.style.display = "none";
  document.body.append(sonda);
  const cor = getComputedStyle(sonda).color;
  sonda.remove();
  const numeros = cor.match(/[\d.]+/g)?.map(Number);
  if (!numeros || numeros.length < 3) return null;
  const [r = 0, g = 0, b = 0, a = 1] = numeros;
  const escala = cor.startsWith("color(srgb") ? 255 : 1;
  return [r * escala, g * escala, b * escala, a];
}

function luminancia([r, g, b]: readonly number[]): number {
  const canal = (valor: number) => {
    const c = valor / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r ?? 0) + 0.7152 * canal(g ?? 0) + 0.0722 * canal(b ?? 0);
}

/** Contraste WCAG entre o texto e o fundo (cores opacas). */
export function contraste(texto: string, fundo: string): number | null {
  const a = rgbDe(texto);
  const b = rgbDe(fundo);
  if (!a || !b) return null;
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (escuro + 0.05);
}
