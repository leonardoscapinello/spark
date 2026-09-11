import { lightTheme } from "@spark/tokens/native-theme";
import { Combobox } from "@base-ui/react/combobox";
import type { SelectOption } from "../Select/Select.js";
import { Icon } from "../Icon/Icon.js";
import s from "../shared/surfaces.module.css";
export type SearchSelectProps = Omit<Combobox.Root.Props<SelectOption>, "items" | "children" | "multiple"> & { options: readonly SelectOption[]; label: string; placeholder?: string; emptyText?: string };
export function SearchSelect({ options, label, placeholder = "Pesquisar...", emptyText = "Nenhum resultado encontrado", ...props }: SearchSelectProps) {
  return <Combobox.Root<SelectOption> items={options} itemToStringLabel={item => item.label} itemToStringValue={item => item.value} isItemEqualToValue={(a,b) => a.value === b.value} {...props}>
    <Combobox.Input className={s.trigger} aria-label={label} placeholder={placeholder} />
    <Combobox.Portal><Combobox.Positioner sideOffset={Number.parseFloat(lightTheme["space-1"])} className={s.positioner}><Combobox.Popup className={`${s.popup} ${s.selectPopup}`}><Combobox.Empty className={s.empty}>{emptyText}</Combobox.Empty><Combobox.List>{(item: SelectOption) => <Combobox.Item key={item.value} value={item} disabled={item.disabled ?? false} className={s.item}><span className={s.indicator}><Combobox.ItemIndicator><Icon name="check" /></Combobox.ItemIndicator></span>{item.label}</Combobox.Item>}</Combobox.List></Combobox.Popup></Combobox.Positioner></Combobox.Portal>
  </Combobox.Root>;
}
