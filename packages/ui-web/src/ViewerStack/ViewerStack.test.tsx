import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userId } from "@spark/core";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { ViewerStack } from "./ViewerStack.js";

describe("ViewerStack", () => {
  it("identifica pessoas por nome e limita o empilhamento", () => {
    const viewers = ["Ana", "Bruno", "Carla", "Daniel", "Elisa"].map((name) => ({ userId: userId.create(), name, avatarUrl: null }));
    render(<TooltipProvider><ViewerStack viewers={viewers} currentUserId={viewers[0]!.userId} status="connected" /></TooltipProvider>);
    expect(screen.getByText("Também aqui")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Ana/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bruno também está visualizando" })).toBeInTheDocument();
  });
  it("não finge que não há outras pessoas quando a conexão falha", () => {
    render(<ViewerStack viewers={[]} status="unavailable" />);
    expect(screen.getByRole("status")).toHaveTextContent("Presença indisponível");
  });
});
