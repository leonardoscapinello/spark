import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedValue } from "./AnimatedValue.js";

describe("AnimatedValue", () => {
  it("preserva o valor encoberto e apresenta apenas o último total ao liberar", () => {
    const { rerender } = render(<AnimatedValue value="R$ 100" />);
    rerender(<AnimatedValue value="R$ 200" paused />);
    rerender(<AnimatedValue value="R$ 300" paused />);
    expect(screen.getByText("R$ 100")).toBeInTheDocument();
    expect(screen.queryByText("R$ 300")).not.toBeInTheDocument();
    rerender(<AnimatedValue value="R$ 300" />);
    expect(screen.getByText("R$ 300")).toBeInTheDocument();
    expect(screen.queryByText("R$ 100")).not.toBeInTheDocument();
  });
});
