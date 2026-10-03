import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { AuthCard } from "./AuthCard.js";

describe("cartão de acesso", () => {
  it("mostra título e conteúdo; enquanto espera, só o ensō e a frase", async () => {
    const { container, rerender } = render(<AuthCard title="Entre na sua conta" description="Informe seu e-mail."><p>formulário</p></AuthCard>);
    expect(screen.getByRole("heading", { name: "Entre na sua conta" })).toBeInTheDocument();
    expect(screen.getByText("formulário")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    rerender(<AuthCard title="Entre na sua conta" pending="Entrando…"><p>formulário</p></AuthCard>);
    expect(screen.getByRole("status")).toHaveTextContent("Entrando…");
    expect(screen.queryByText("formulário")).not.toBeInTheDocument();
  });
});
