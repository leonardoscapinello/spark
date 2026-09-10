import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Input } from "./Input.js";

describe("Input", () => {
  it("aceita valor controlado e dispara onChange", async () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} aria-label="nome" />);
    await userEvent.type(screen.getByRole("textbox"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("respeita disabled", () => {
    render(<Input disabled aria-label="nome" />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("aceita os três tamanhos sem quebrar", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      const { unmount } = render(<Input size={size} aria-label="x" />);
      unmount();
    }
  });

  it("não tem violação de acessibilidade isolado", async () => {
    const { container } = render(<Input aria-label="nome" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
