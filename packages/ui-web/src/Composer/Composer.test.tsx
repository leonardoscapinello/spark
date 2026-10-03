import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer, ComposerPrompt } from "./Composer.js";
import { Textarea } from "../Textarea/Textarea.js";

const tabs = [
  { id: "note", label: "Nota", icon: "file" },
  { id: "call", label: "Ligação", icon: "phone" },
  { id: "meeting", label: "Reunião", icon: "team", disabled: true },
  { id: "task", label: "Tarefa", icon: "check" },
] as const;
function Example({ onSchedule = () => undefined }: { onSchedule?: () => void }) {
  const [value, setValue] = useState("note");
  const [draft, setDraft] = useState("");
  return <Composer tabs={tabs} value={value} onValueChange={setValue}>
    {value === "note" ? <Textarea aria-label="Nova nota" value={draft} onChange={event => setDraft(event.target.value)} /> : <ComposerPrompt onClick={onSchedule}>Agendar atividade</ComposerPrompt>}
  </Composer>;
}
describe("Compositor", () => {
  it("apresenta o agendamento como botão de diálogo, sem abrir ao trocar de aba", async () => {
    const user = userEvent.setup();
    const schedule = vi.fn();
    render(<Example onSchedule={schedule} />);
    await user.click(screen.getByRole("tab", { name: "Ligação" }));
    expect(schedule).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const action = screen.getByRole("button", { name: "Agendar atividade" });
    expect(action).toHaveAttribute("aria-haspopup", "dialog");
    await user.tab();
    expect(screen.getByRole("tabpanel", { name: "Ligação" })).toHaveFocus();
    await user.tab();
    expect(action).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(schedule).toHaveBeenCalledTimes(1);
  });
  it("navega por teclado, não ativa ações desabilitadas e preserva o rascunho", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.type(screen.getByRole("textbox", { name: "Nova nota" }), "Retomar na segunda");
    await user.click(screen.getByRole("tab", { name: "Nota" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Ligação" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Ligação" })).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Reunião" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel", { name: "Ligação" })).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Tarefa" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Home}");
    expect(screen.getByRole("textbox", { name: "Nova nota" })).toHaveValue("Retomar na segunda");
  });
});
