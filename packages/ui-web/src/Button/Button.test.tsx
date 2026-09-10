import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Button } from "./Button.js";

describe("Button", () => {
  it("renderiza o texto", () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("dispara onClick ao clicar", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("é ativável pelo teclado (Enter e Espaço)", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    const btn = screen.getByRole("button");
    btn.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("fica desabilitado quando loading, sem trocar o texto", () => {
    render(<Button loading>Salvar</Button>);
    const btn = screen.getByRole("button", { name: /Salvar/ });
    expect(btn).toBeDisabled();
  });

  it("não dispara onClick quando desabilitado", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("aceita as três variantes e os três tamanhos sem quebrar", () => {
    for (const variant of ["primary", "secondary", "ghost"] as const) {
      for (const size of ["sm", "md", "lg"] as const) {
        const { unmount } = render(
          <Button variant={variant} size={size}>
            x
          </Button>,
        );
        unmount();
      }
    }
  });

  it("não tem violação de acessibilidade", async () => {
    const { container } = render(<Button>Salvar</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
