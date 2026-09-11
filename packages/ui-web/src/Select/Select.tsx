import { lightTheme } from "@spark/tokens/native-theme";
import { Select as BaseSelect } from "@base-ui/react/select";
import { OptionContent } from "./OptionContent.js";
import { Icon } from "../Icon/Icon.js";
import s from "../shared/surfaces.module.css";
export interface SelectOption { value: string; label: string; disabled?: boolean; description?: string; avatar?: string | null }
export type SelectProps<Multiple extends boolean = false> = Omit<BaseSelect.Root.Props<string, Multiple>, "items" | "children"> & { options: readonly SelectOption[]; label: string; placeholder?: string };
export function Select<Multiple extends boolean = false>({ options, label, placeholder = "Selecionar", ...props }: SelectProps<Multiple>) {
  return <BaseSelect.Root<string, Multiple> items={options} {...props}>
    <BaseSelect.Trigger className={s.trigger} aria-label={label}><BaseSelect.Value className={s.selectValue} placeholder={placeholder}>{(value: string | string[] | null)=>{const option=options.find(item=>item.value===value);return option?<OptionContent option={option} compact/>:Array.isArray(value)?options.filter(item=>value.includes(item.value)).map(item=>item.label).join(", "):placeholder;}}</BaseSelect.Value><BaseSelect.Icon className={s.triggerIcon}><Icon name="chevron" /></BaseSelect.Icon></BaseSelect.Trigger>
    <BaseSelect.Portal><BaseSelect.Positioner alignItemWithTrigger={false} sideOffset={Number.parseFloat(lightTheme["space-1"])} className={s.positioner}><BaseSelect.Popup className={`${s.popup} ${s.selectPopup}`}><BaseSelect.List>
      {options.map(o => <BaseSelect.Item key={o.value} value={o.value} disabled={o.disabled ?? false} className={s.item}><span className={s.indicator}><BaseSelect.ItemIndicator><Icon name="check" /></BaseSelect.ItemIndicator></span><BaseSelect.ItemText><OptionContent option={o}/></BaseSelect.ItemText></BaseSelect.Item>)}
    </BaseSelect.List></BaseSelect.Popup></BaseSelect.Positioner></BaseSelect.Portal>
  </BaseSelect.Root>;
}
