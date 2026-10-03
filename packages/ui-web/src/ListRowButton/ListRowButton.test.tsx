import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Button } from "../Button/Button.js";
import { RowList } from "../ListRow/ListRow.js";
import { ListRowButton } from "./ListRowButton.js";

describe("ListRowButton", () => {
  it("a linha inteira é o botão; as ações são irmãs dele", async () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(<RowList label="Blocos"><ListRowButton title="Destaque" description="Título e chamada" onClick={onClick} actions={<Button size="sm" variant="ghost" onClick={onRemove}>Remover</Button>} /></RowList>);
    await userEvent.click(screen.getByRole("button", { name: /Destaque/ }));
    expect(onClick).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("marca a linha aberta e respeita disabled", () => {
    render(<RowList label="Etapas"><ListRowButton title="Gatilho" selected /><ListRowButton title="Espera" disabled /></RowList>);
    expect(screen.getByRole("button", { name: /Gatilho/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Espera/ })).toBeDisabled();
  });

  it("não tem violação de acessibilidade", async () => {
    const { container } = render(<RowList label="Etapas"><ListRowButton icon="bolt" dot="var(--v1)" title="Gatilho" description="Define quando o fluxo começa" /></RowList>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
