import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { SearchField } from "./SearchField.js";

function Harness() {
  const [value, setValue] = useState("");
  return <SearchField label="Buscar pessoas" value={value} onValueChange={setValue} />;
}

describe("busca", () => {
  it("é um campo de verdade: digita, limpa pelo × e pelo Esc", async () => {
    const { container } = render(<Harness />);
    const field = screen.getByRole("searchbox", { name: "Buscar pessoas" });
    await userEvent.type(field, "ana");
    expect(field).toHaveValue("ana");
    await userEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    await userEvent.type(field, "bia{Escape}");
    expect(field).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Limpar busca" })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
