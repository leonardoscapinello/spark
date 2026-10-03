import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Chip } from "./Chip.js";

describe("etiqueta", () => {
  it("mostra o texto e remove pelo ×", async () => {
    const remove = vi.fn();
    const { container } = render(<Chip dot="var(--ok)" onRemove={remove} removeLabel="Remover etiqueta VIP">VIP</Chip>);
    expect(screen.getByText("VIP")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover etiqueta VIP" }));
    expect(remove).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });
});
