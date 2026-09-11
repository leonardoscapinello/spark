import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Glass } from "./Glass.js";

describe("Glass", () => {
  it("renders its children", () => {
    render(<Glass>content</Glass>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders as a div by default", () => {
    render(<Glass data-testid="g">x</Glass>);
    expect(screen.getByTestId("g").tagName).toBe("DIV");
  });

  it("accepts a custom element via `as`", () => {
    render(
      <Glass as="nav" data-testid="g">
        x
      </Glass>,
    );
    expect(screen.getByTestId("g").tagName).toBe("NAV");
  });

  it("defaults to the panel tier", () => {
    render(<Glass data-testid="g">x</Glass>);
    expect(screen.getByTestId("g").className).toContain("panel");
  });

  it("switches tier via the `tier` prop", () => {
    render(
      <Glass tier="modal" data-testid="g">
        x
      </Glass>,
    );
    expect(screen.getByTestId("g").className).toContain("modal");
  });

  it("merges a custom className with its own", () => {
    render(
      <Glass className="extra" data-testid="g">
        x
      </Glass>,
    );
    expect(screen.getByTestId("g").className).toContain("extra");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Glass>navigation content</Glass>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
