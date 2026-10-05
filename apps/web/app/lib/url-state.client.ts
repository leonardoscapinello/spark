import { useEffect, useRef, useState } from "react";
import { useSearchParams, type ShouldRevalidateFunctionArgs } from "react-router";

/**
 * Estado que mora no endereço. Tudo que a pessoa "abre" — conversa, negócio
 * na visão rápida, aba, item em edição — vai para a URL, para que o link
 * copiado abra exatamente a mesma coisa em outra máquina.
 *
 * O estado local é a fonte imediata (a tela muda no mesmo quadro, e o morph
 * de withViewTransition fotografa a mudança certa); a URL é o espelho.
 * Voltar/Avançar e link colado mudam a URL de fora, e o estado acompanha.
 *
 * `history: "push"` cria entrada no histórico ao abrir (o Voltar fecha o que
 * foi aberto) — para modal e visão rápida. `"replace"` troca no lugar — para
 * navegar entre irmãos, como uma conversa e outra.
 */
export function useUrlState(key: string, { history = "replace" }: { history?: "push" | "replace" } = {}): [string | null, (value: string | null) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlValue = searchParams.get(key);
  const [value, setValue] = useState<string | null>(urlValue);
  const mirrored = useRef<string | null>(urlValue);

  // A URL mudou por fora (Voltar, Avançar, link): o estado segue.
  if (urlValue !== mirrored.current) {
    mirrored.current = urlValue;
    if (urlValue !== value) setValue(urlValue);
  }

  useEffect(() => {
    if (value === mirrored.current) return;
    const opening = mirrored.current === null && value !== null;
    mirrored.current = value;
    setSearchParams(current => {
      const params = new URLSearchParams(current);
      if (value === null || value === "") params.delete(key); else params.set(key, value);
      return params;
    }, { replace: !(history === "push" && opening), preventScrollReset: true });
  }, [value, key, history, setSearchParams]);

  return [value, setValue];
}

/**
 * Mudou só a busca da URL (conversa, aba, item aberto)? Não recarrega a rota:
 * os dados vêm das coleções locais, e repetir sessão e pré-carga a cada
 * clique deixaria a troca lenta. Envio de formulário e troca de página
 * seguem a regra padrão.
 */
export function revalidateOnPathOnly({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs): boolean {
  if (formMethod || currentUrl.pathname !== nextUrl.pathname) return defaultShouldRevalidate;
  return false;
}

/**
 * Editor em modal guiado pela URL: `?editar=<id>` abre a modal preenchida com
 * o item, `?editar=novo` abre o cadastro em branco, e o Voltar fecha. A tela
 * chama `openEdit`/`openCreate`/`close`; a URL decide, e o mesmo link abre a
 * mesma edição em outra máquina assim que os itens carregam.
 */
export function useUrlEditor<T extends { id: string }>(items: readonly T[] | undefined, isOpen: boolean, actions: { create: () => void; edit: (item: T) => void; close: () => void }) {
  const [param, setParam] = useUrlState("editar", { history: "push" });
  const latest = useRef(actions);
  latest.current = actions;
  useEffect(() => {
    if (!param) { if (isOpen) latest.current.close(); return; }
    if (isOpen) return;
    if (param === "novo") { latest.current.create(); return; }
    const item = items?.find(candidate => candidate.id === param);
    if (item) latest.current.edit(item);
  }, [param, isOpen, items]);
  return { openCreate: () => setParam("novo"), openEdit: (item: T) => setParam(item.id), close: () => setParam(null) };
}
