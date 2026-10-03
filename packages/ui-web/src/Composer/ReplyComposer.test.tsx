import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ReplyComposer, type ReplyComposerMode } from "./ReplyComposer.js";

function Example({ onSubmit, replyDisabled = false }: { onSubmit: (mode: ReplyComposerMode, text: string) => void; replyDisabled?: boolean }) {
  const [mode, setMode] = useState<ReplyComposerMode>(replyDisabled ? "note" : "reply");
  const [text, setText] = useState("");
  return <ReplyComposer mode={mode} onModeChange={setMode} replyDisabled={replyDisabled} value={text} onValueChange={setText} onSubmit={() => onSubmit(mode, text)} placeholder="Responder pelo WhatsApp Vendas…" />;
}

describe("Campo de resposta", () => {
  it("só envia com texto, por botão ou por ⌘ Enter, e troca para nota", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Example onSubmit={onSubmit} />);
    const send = screen.getByRole("button", { name: "Enviar" });
    expect(send).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Responder pelo WhatsApp Vendas…" }), "Olá, Carla");
    expect(screen.getByText("10/20.000")).toBeInTheDocument();
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSubmit).toHaveBeenCalledWith("reply", "Olá, Carla");
    await user.click(screen.getByRole("button", { name: "Nota" }));
    expect(screen.getByText("Somente equipe")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Adicionar nota" }));
    expect(onSubmit).toHaveBeenLastCalledWith("note", "Olá, Carla");
  });

  it("sem canal que responda, Responder fica desabilitado", async () => {
    const { container } = render(<Example onSubmit={() => undefined} replyDisabled />);
    expect(screen.getByRole("button", { name: "Responder" })).toBeDisabled();
    expect(await axe(container)).toHaveNoViolations();
  });
});
