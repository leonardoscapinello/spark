import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button/Button.js";
import { DropdownButton, MenuItem, SplitButton } from "../Menu/Menu.js";
import { Select } from "../Select/Select.js";
import { SearchSelect } from "../SearchSelect/SearchSelect.js";
import { Modal, ModalTrigger, ModalContent } from "../Modal/Modal.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Switch } from "../Switch/Switch.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
const options = [{value:"sales",label:"Vendas"},{value:"support",label:"Atendimento"}];
describe("controles reutilizáveis", () => {
  it("executa a ação do menu pelo teclado e devolve foco ao gatilho", async () => {
    const action = vi.fn();
    render(<DropdownButton trigger={<Button>Opções</Button>}><MenuItem onClick={action}>Exportar</MenuItem></DropdownButton>);
    await userEvent.click(screen.getByRole("button", {name:"Opções"}));
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(action).toHaveBeenCalledOnce();
    await waitFor(()=>expect(screen.getByRole("button",{name:"Opções"})).toHaveFocus());
  });
  it("botão dividido separa ação principal de abertura do menu", async () => {
    const action = vi.fn();
    render(<SplitButton onClick={action} menu={<MenuItem>Agendar</MenuItem>}>Enviar</SplitButton>);
    await userEvent.click(screen.getByRole("button",{name:"Mais opções"}));
    expect(action).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button",{name:"Enviar"}));
    expect(action).toHaveBeenCalledOnce();
  });
  it("seleção entrega o ID da opção ao consumidor e ao formulário", async () => {
    const change = vi.fn();
    const {container} = render(<form><Select label="Equipe" name="team" options={options} defaultValue="sales" onValueChange={change} /></form>);
    await userEvent.click(screen.getByRole("combobox",{name:"Equipe"}));
    await userEvent.click(await screen.findByRole("option",{name:"Atendimento"}));
    expect(change.mock.calls[0]?.[0]).toBe("support");
    expect(new FormData(container.querySelector("form")!).get("team")).toBe("support");
  });
  it("busca local mostra estado vazio e permite selecionar resultado", async () => {
    const change = vi.fn();
    render(<SearchSelect label="Buscar equipe" options={options} onValueChange={change} />);
    const input = screen.getByRole("combobox",{name:"Buscar equipe"});
    await userEvent.type(input,"inexistente");
    expect(await screen.findByText("Nenhum resultado encontrado")).toBeVisible();
    await userEvent.clear(input);
    await userEvent.type(input,"Venda");
    await userEvent.click(await screen.findByRole("option",{name:"Vendas"}));
    expect(change.mock.calls.at(-1)?.[0]).toEqual(options[0]);
  });
  it("modal tem nome, move foco e retorna ao gatilho após Escape", async () => {
    render(<Modal><ModalTrigger render={<Button>Abrir</Button>} /><ModalContent title="Editar contato"><Field><Label>Notas</Label><Textarea /></Field></ModalContent></Modal>);
    await userEvent.click(screen.getByRole("button",{name:"Abrir"}));
    const dialog = await screen.findByRole("dialog",{name:"Editar contato"});
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button",{name:"Abrir"})).toHaveFocus();
  });
  it("checkbox e switch respeitam estado e callbacks", async () => {
    const change = vi.fn();
    const blockedChange = vi.fn();
    render(<><Checkbox onCheckedChange={change}>Selecionar</Checkbox><Switch disabled onCheckedChange={blockedChange}>Bloqueado</Switch></>);
    await userEvent.click(screen.getByRole("checkbox",{name:"Selecionar"}));
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(change.mock.calls[0]?.[0]).toBe(true);
    const blocked = screen.getByRole("switch",{name:"Bloqueado"});
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(blocked);
    expect(blockedChange).not.toHaveBeenCalled();
    expect(blocked).not.toBeChecked();
  });
});
