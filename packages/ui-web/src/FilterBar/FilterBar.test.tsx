import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { FilterBar, type FilterFieldDefinition, type FilterSet } from "./FilterBar.js";

const fields: FilterFieldDefinition[] = [
  { id: "leadStatus", label: "Etapa", type: "select", group: "Pessoa", options: [{ value: "new", label: "Novo lead" }, { value: "qualified", label: "Qualificado" }] },
  { id: "score", label: "Pontuação", type: "number", group: "Pessoa" },
  { id: "custom:plano", label: "Plano", type: "text", group: "Campos personalizados" },
];
const empty: FilterSet = { combinator: "and", groups: [] };
const one = (conditions: FilterSet["groups"][number]["conditions"]): FilterSet => ({ combinator: "and", groups: [{ combinator: "and", conditions }] });

it("abre pela pílula e adiciona uma condição já com o primeiro campo e o primeiro operador do tipo", async () => {
  const onChange = vi.fn();
  render(<FilterBar fields={fields} value={empty} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
  fireEvent.click(await screen.findByRole("button", { name: "Condição" }));
  expect(onChange).toHaveBeenCalledWith(one([{ field: "leadStatus", operator: "is", value: null }]));
});

it("conta as condições na pílula, e só ali — a barra não cresce", () => {
  render(<FilterBar fields={fields} value={one([{ field: "leadStatus", operator: "is", value: "qualified" }, { field: "score", operator: "gt", value: "50" }])} onChange={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Filtros: 2 condições" })).toHaveTextContent("Filtros · 2");
  expect(screen.queryByText("Qualificado")).toBeNull();
});

it("remove a condição certa quando há duas do mesmo campo", async () => {
  const onChange = vi.fn();
  render(<FilterBar fields={fields} value={one([{ field: "score", operator: "gt", value: "10" }, { field: "score", operator: "lt", value: "90" }])} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Filtros: 2 condições" }));
  fireEvent.click(await screen.findByRole("button", { name: "Remover condição 2" }));
  expect(onChange).toHaveBeenCalledWith(one([{ field: "score", operator: "gt", value: "10" }]));
});

it("operador sem valor não pede valor", async () => {
  render(<FilterBar fields={fields} value={one([{ field: "score", operator: "is_empty", value: null }])} onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Filtros: 1 condição" }));
  await screen.findByRole("group", { name: "Condição 1" });
  expect(screen.queryByLabelText("Valor de Pontuação")).toBeNull();
});

it("novo grupo entra vazio e o E/OU entre grupos aparece só a partir do segundo", async () => {
  const onChange = vi.fn();
  const set = one([{ field: "score", operator: "gt", value: "10" }]);
  const { rerender } = render(<FilterBar fields={fields} value={set} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Filtros: 1 condição" }));
  expect(screen.queryByRole("group", { name: "Como combinar os grupos" })).toBeNull();
  fireEvent.click(await screen.findByRole("button", { name: "Grupo" }));
  const next = { ...set, groups: [...set.groups, { combinator: "and", conditions: [] }] };
  expect(onChange).toHaveBeenCalledWith(next);
  rerender(<FilterBar fields={fields} value={next as FilterSet} onChange={onChange} />);
  expect(await screen.findByRole("group", { name: "Como combinar os grupos" })).toBeInTheDocument();
});

it("ignora campo que não existe mais sem derrubar o construtor", async () => {
  render(<FilterBar fields={fields} value={one([{ field: "sumido", operator: "is", value: "x" }])} onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Filtros: 1 condição" }));
  expect(await screen.findByRole("group", { name: "Condição 1" })).toBeInTheDocument();
});
