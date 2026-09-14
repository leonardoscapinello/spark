import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { StageProgress } from "./StageProgress.js";

const stages = [{ id: "a", label: "Novo" }, { id: "b", label: "Qualificado" }, { id: "c", label: "Proposta" }];

it("marca a etapa atual e trata as anteriores como vencidas", () => {
  render(<StageProgress stages={stages} currentId="b" />);
  expect(screen.getByText("Qualificado").closest("li")).toHaveAttribute("data-state", "current");
  expect(screen.getByText("Novo").closest("li")).toHaveAttribute("data-state", "done");
  expect(screen.getByText("Proposta").closest("li")).toHaveAttribute("data-state", "todo");
});

it("move o negócio pelo clique na etapa quando pode mover", () => {
  const onSelect = vi.fn();
  render(<StageProgress stages={stages} currentId="a" onSelect={onSelect} />);
  fireEvent.click(screen.getByRole("button", { name: "Proposta" }));
  expect(onSelect).toHaveBeenCalledWith("c");
});

it("sem onSelect não oferece botão — negócio fechado ou sem permissão", () => {
  render(<StageProgress stages={stages} currentId="a" />);
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});

it("ganho preenche a trilha inteira", () => {
  render(<StageProgress stages={stages} currentId="a" outcome="won" />);
  for (const stage of stages) expect(screen.getByText(stage.label).closest("li")).toHaveAttribute("data-state", "done");
});

it("mostra o tempo de cada etapa já vivida, e não das que faltam", () => {
  render(<StageProgress stages={stages} currentId="b" durations={{ a: "3 dias", b: "6 dias", c: "1 dia" }} />);
  expect(screen.getByText("3 dias").closest("li")).toHaveAttribute("data-state", "done");
  expect(screen.getByText("6 dias").closest("li")).toHaveAttribute("data-state", "current");
  expect(screen.queryByText("1 dia")).toBeNull();
});
