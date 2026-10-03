import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ChatThread, MessageBubble, MessageReceipt, messageStatusLabel } from "./Chat.js";

describe("Conversa", () => {
  it("fala a situação da mensagem em português", () => {
    expect(messageStatusLabel("delivered")).toBe("Entregue");
    expect(messageStatusLabel("received")).toBe("Recebida");
    render(<><MessageReceipt status="read" /><MessageReceipt status="failed" /></>);
    expect(screen.getByRole("img", { name: "Lida" })).toBeInTheDocument();
    expect(screen.getByText("Falhou")).toBeInTheDocument();
  });

  it("marca cada mensagem com a caixa por onde passou e a nota como interna", async () => {
    const { container } = render(<ChatThread label="Conversa com Carla">
      <MessageBubble direction="inbound" author="Carla" time="09:41" dateTime="2026-10-02T09:41:00Z" channel={{ icon: "whatsapp", label: "WhatsApp Vendas" }}>Oi!</MessageBubble>
      <MessageBubble direction="internal" author="Ana" time="09:43" dateTime="2026-10-02T09:43:00Z">Contexto da equipe</MessageBubble>
    </ChatThread>);
    expect(screen.getByRole("log", { name: "Conversa com Carla" })).toHaveTextContent("WhatsApp Vendas");
    expect(screen.getByText("Nota interna")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
