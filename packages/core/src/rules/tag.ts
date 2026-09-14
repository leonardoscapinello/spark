/**
 * Marcação: nome e forma normalizada (ADR-0035).
 *
 * O catálogo de marcações da organização é único por `slug`, e é ele que
 * impede «VIP», «vip» e « VIP » de virarem três marcações diferentes. A regra
 * mora aqui porque o cliente precisa dela para a escrita otimista e o servidor
 * precisa dela para gravar — as duas têm de concordar (ADR-0019).
 */

/**
 * A forma comparável de um nome de marcação: sem espaço nas pontas, sem espaço
 * repetido no meio, em minúsculas e sem acento.
 *
 * Tirar o acento é deliberado: quem digita «Indicacao» está falando da mesma
 * marcação que «Indicação», e duas linhas para isso só produzem relatório
 * partido ao meio.
 */
export function tagSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** O nome como fica guardado: só o espaço excedente sai, o resto é do usuário. */
export function tagDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * A lista que entra numa entidade, limpa: sem vazio, sem repetição pelo slug,
 * na ordem em que a pessoa escreveu. O primeiro a aparecer vence — é o que
 * mantém a grafia escolhida em vez da última digitada.
 */
export function normalizeTagNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of names) {
    const name = tagDisplayName(raw);
    const slug = tagSlug(name);
    if (slug === "" || seen.has(slug)) continue;
    seen.add(slug);
    kept.push(name);
  }
  return kept;
}
