import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ConversationList, ConversationListHeader, ConversationRow } from "./ConversationList.js";

function Example({ onSelect = () => undefined }: { onSelect?: (id: string) => void }) {
  return <>
    <ConversationListHeader title="Abertas" count={2} />
    <ConversationList label="Conversas abertas">
      <ConversationRow name="Carla Menezes" title="Dúvida sobre o plano" time="2 min" channels={[{ icon: "whatsapp", label: "WhatsApp Vendas" }]} owner="Ana" sla={{ tone: "success", label: "No prazo" }} unread selected onSelect={() => onSelect("1")} />
      <ConversationRow name="Rafael Lima" title="Segunda via do boleto" time="14 min" onSelect={() => onSelect("2")} />
    </ConversationList>
  </>;
}

describe("Lista de conversas", () => {
  it("marca a conversa aberta, anuncia a não lida e anda com as setas", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);
    const first = screen.getByRole("button", { name: /Carla Menezes/ });
    expect(first).toHaveAttribute("aria-current", "true");
    expect(first).toHaveTextContent("Não lida.");
    expect(screen.getByRole("list", { name: "Conversas abertas" })).toBeInTheDocument();
    first.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /Rafael Lima/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("2");
  });

  it("mostra a frase de vazio no lugar das linhas", () => {
    render(<ConversationList label="Conversas" empty="Nenhuma conversa nesta caixa." />);
    expect(screen.getByRole("status")).toHaveTextContent("Nenhuma conversa nesta caixa.");
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(<Example />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
