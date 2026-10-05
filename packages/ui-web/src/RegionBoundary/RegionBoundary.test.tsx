import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { RegionBoundary } from "./RegionBoundary.js";

function Quebra(): never { throw new Error("falhou aqui"); }

it("contém o erro na área e mostra a mensagem", () => {
  const silence = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(<><RegionBoundary label="Detalhes"><Quebra /></RegionBoundary><p>vizinho</p></>);
  expect(screen.getByRole("alert")).toHaveTextContent("falhou aqui");
  expect(screen.getByText("vizinho")).toBeInTheDocument();
  silence.mockRestore();
});
