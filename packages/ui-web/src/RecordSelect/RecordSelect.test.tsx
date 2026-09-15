import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { InlineField } from "../InlineField/InlineField.js";
import type { SelectOption } from "../Select/Select.js";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { RecordSelect } from "./RecordSelect.js";

const options = [
  { value: "ana", label: "Ana Oliveira", description: "ana@example.com · 11987654321", avatar: "/ana.jpg" },
  { value: "jose", label: "José Silva", description: "jose@example.com", avatar: null },
  ...Array.from({ length: 20 }, (_, index) => ({ value: String(index), label: `Pessoa ${index}`, description: `pessoa${index}@example.com`, avatar: null })),
];

function InlineExample({ save }: { save: (value: SelectOption | null) => Promise<void> }) {
  const [value, setValue] = useState<SelectOption | null>(options[0]!);
  return <TooltipProvider>
    <InlineField label="Pessoa" value={value?.label ?? "Sem pessoa"}>
      {(close) => <RecordSelect label="Pessoa do negócio" options={options} value={value} onCancel={close} emptyOptionLabel="Sem pessoa vinculada" onValueChange={(next) => { setValue(next); close(save(next)); }} />}
    </InlineField>
    <button type="button">Fora</button>
  </TooltipProvider>;
}

it("usa o texto atual e seleciona pelo teclado sem o Enter disparar blur do InlineField", async () => {
  const user = userEvent.setup();
  const save = vi.fn(() => Promise.resolve());
  render(<InlineExample save={save} />);
  await user.click(screen.getByRole("button", { name: /Alterar Pessoa/ }));
  const input = screen.getByRole("combobox", { name: "Pessoa do negócio" });
  expect(input).toHaveValue("Ana Oliveira");
  expect(screen.getAllByRole("option")).toHaveLength(1);
  await user.clear(input);
  await user.type(input, "jose");
  expect(screen.getAllByRole("option")).toHaveLength(1);
  await user.keyboard("{Enter}");
  expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ value: "jose" }));
  expect(screen.getByRole("button", { name: /Alterar Pessoa.*José Silva/ })).toBeInTheDocument();
});

it("limita a lista, busca por identificação e recupera iniciais se a imagem falhar", async () => {
  const user = userEvent.setup();
  render(<RecordSelect label="Pessoa" value={null} options={options} onValueChange={vi.fn()} />);
  const input = screen.getByRole("combobox", { name: "Pessoa" });
  await user.click(input);
  expect(screen.getAllByRole("option")).toHaveLength(6);
  expect(screen.getByText(/Continue digitando/)).toBeInTheDocument();
  const photo = document.querySelector<HTMLImageElement>('img[src="/ana.jpg"]');
  expect(photo).not.toBeNull();
  fireEvent.error(photo!);
  expect(screen.getByText("AO")).toBeInTheDocument();
  await user.type(input, "11987654321");
  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(screen.getByRole("option", { name: /Ana Oliveira/ })).toBeInTheDocument();
});

it.each(["Escape", "Cancelar", "Fora"])("%s descarta a busca sem limpar o vínculo", async (action) => {
  const user = userEvent.setup();
  const save = vi.fn(() => Promise.resolve());
  render(<InlineExample save={save} />);
  await user.click(screen.getByRole("button", { name: /Alterar Pessoa/ }));
  const input = screen.getByRole("combobox", { name: "Pessoa do negócio" });
  await user.clear(input);
  await user.type(input, "inexistente");
  expect(screen.getByText("Nenhuma pessoa encontrada.")).toBeInTheDocument();
  if (action === "Escape") await user.keyboard("{Escape}");
  // Base UI hides surrounding elements from the accessibility tree while the
  // combobox is expanded; they remain clickable with the pointer.
  else await user.click(action === "Cancelar" ? screen.getByLabelText("Cancelar alteração em Pessoa") : screen.getByText("Fora", { selector: "button" }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /Alterar Pessoa.*Ana Oliveira/ })).toBeInTheDocument();
});

it("só remove o vínculo pela opção de estado vazio, inclusive dentro do portal", async () => {
  const user = userEvent.setup();
  const save = vi.fn(() => Promise.resolve());
  render(<InlineExample save={save} />);
  await user.click(screen.getByRole("button", { name: /Alterar Pessoa/ }));
  await user.click(screen.getByRole("button", { name: "Sem pessoa vinculada" }));
  expect(save).toHaveBeenCalledExactlyOnceWith(null);
  expect(screen.getByRole("button", { name: /Alterar Pessoa.*Sem pessoa/ })).toBeInTheDocument();
});

it("expõe carregamento e não permite selecionar um registro enquanto carrega", async () => {
  const user = userEvent.setup();
  render(<RecordSelect label="Empresa" kind="company" loading value={null} options={[]} onValueChange={vi.fn()} />);
  const input = screen.getByRole("combobox", { name: "Empresa" });
  await user.click(input);
  expect(input).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("option")).not.toBeInTheDocument();
  // Base UI acrescenta um word-joiner ao anúncio do live region; o conteúdo
  // visível continua sendo exatamente este, e o papel confirma a semântica.
  expect(screen.getByRole("status")).toHaveTextContent("Carregando…");
});
