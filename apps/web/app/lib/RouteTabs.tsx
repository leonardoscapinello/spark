import { Tabs, type TabsProps } from "@spark/ui-web";
import { useUrlState } from "./url-state.client";

/**
 * Abas cuja escolha mora na URL (`?aba=`): o link copiado abre na mesma aba.
 * A primeira aba é o padrão e não aparece na URL. Ficha embutida em outra
 * tela usa outra chave, para não disputar a aba da página de fora.
 */
export function RouteTabs({ urlKey = "aba", ...props }: Omit<TabsProps, "value" | "defaultValue" | "onValueChange"> & { urlKey?: string }) {
  const [tab, setTab] = useUrlState(urlKey);
  const first = props.items.find(item => !item.disabled)?.value;
  const value = tab && props.items.some(item => item.value === tab && !item.disabled) ? tab : first;
  return <Tabs {...props} {...(value ? { value } : {})} onValueChange={next => setTab(next === first ? null : next)} />;
}
