import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { TagPicker } from "./TagPicker.js";

const options = [
  { value: "cliente", label: "Cliente", color: "blue" },
  { value: "demo", label: "Demonstração", color: "amber" },
  { value: "renovacao", label: "Renovação", color: "green" },
];

it("limita a linha e permite buscar e remover uma etiqueta que está no contador", async () => {
  function Example() {
    const [value, setValue] = useState(options.map(option => option.value));
    return <TagPicker appearance="inline" label="Etiquetas" options={options} value={value} onValueChange={setValue} />;
  }
  const user = userEvent.setup();
  render(<Example />);
  expect(screen.queryByText("Renovação")).not.toBeInTheDocument();
  const trigger = screen.getByRole("combobox", { name: "Editar etiquetas" });
  expect(trigger).toHaveTextContent("+1");
  await user.click(trigger);
  await user.type(await screen.findByRole("combobox", { name: "Buscar etiquetas" }), "Renovação");
  const option = screen.getByRole("option", { name: "Renovação" });
  expect(option).toHaveAttribute("aria-selected", "true");
  await user.click(option);
  expect(option).toHaveAttribute("aria-selected", "false");
  await user.keyboard("{Escape}");
  expect(trigger).not.toHaveTextContent("+1");
  expect(screen.getByRole("button", { name: "Remover etiqueta Cliente" })).toBeInTheDocument();
});

it("permite consultar etiquetas ocultas em modo de leitura, sem poder alterá-las", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(<TagPicker appearance="inline" label="Etiquetas" options={options} value={options.map(option => option.value)} disabled onValueChange={change} />);
  expect(screen.queryByRole("button", { name: /Remover etiqueta/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("combobox", { name: "Ver todas as etiquetas" }));
  const option = await screen.findByRole("option", { name: "Renovação" });
  expect(option).toHaveAttribute("aria-disabled", "true");
  await user.click(option);
  expect(change).not.toHaveBeenCalled();
});
