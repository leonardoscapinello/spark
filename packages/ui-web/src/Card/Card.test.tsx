import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetricCard } from "./Card.js";
describe("indicadores de dashboard",()=>{
  it("não apresenta valor antigo durante carregamento ou erro e permite recuperar",async()=>{
    const retry=vi.fn();
    const {rerender}=render(<MetricCard title="Conversas" value="340" state="loading" />);
    expect(screen.queryByText("340")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<MetricCard title="Conversas" value="340" state="error" onRetry={retry} />);
    expect(screen.queryByText("340")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button",{name:"Tentar novamente"}));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<MetricCard title="Conversas" value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
