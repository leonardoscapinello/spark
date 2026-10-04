import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard, KanbanCard, KanbanTags } from "./Kanban.js";

describe("Etiquetas do Kanban", () => {
  it("expande e recolhe todo o quadro sem abrir nem arrastar um negócio", async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    const drag = vi.fn();
    function Board() {
      const [expanded, setExpanded] = useState(false);
      return <KanbanBoard label="Negócios">
        {["Cliente", "Prioridade"].map(name => <KanbanCard key={name} cardId={name} draggable onClick={open} onDragStart={drag}>
          <KanbanTags tags={[{ id: name, name, color: "blue" }]} expanded={expanded} onExpandedChange={setExpanded} />
        </KanbanCard>)}
      </KanbanBoard>;
    }
    render(<Board />);
    expect(screen.getByText("Cliente")).not.toBeVisible();
    expect(screen.getByText("Prioridade")).not.toBeVisible();
    const toggle = screen.getByRole("button", { name: "Expandir etiquetas do quadro: Cliente" });
    expect(fireEvent.dragStart(toggle)).toBe(false);
    expect(drag).not.toHaveBeenCalled();
    await user.click(toggle);
    expect(screen.getByText("Cliente")).toBeVisible();
    expect(screen.getByText("Prioridade")).toBeVisible();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Cliente")).not.toBeVisible();
    expect(screen.getByText("Prioridade")).not.toBeVisible();
    expect(open).not.toHaveBeenCalled();
  });

  it("não mostra controle em cartões sem etiquetas", () => {
    render(<KanbanTags tags={[]} expanded={false} onExpandedChange={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
