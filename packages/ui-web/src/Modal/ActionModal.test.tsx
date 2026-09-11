import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActionModal } from "./ActionModal.js";
describe("ActionModal",()=>{
  it("mantém aberta após falha e fecha somente após confirmação bem-sucedida",async()=>{
    const action=vi.fn().mockRejectedValueOnce(new Error("Falha")).mockResolvedValueOnce(undefined);const change=vi.fn();
    render(<ActionModal open onOpenChange={change} title="Confirmar operação" onConfirm={action}>Revise os dados</ActionModal>);
    fireEvent.click(screen.getByRole("button",{name:"Confirmar"}));
    expect(await screen.findByRole("alert")).toBeInTheDocument();expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Confirmar"}));
    await waitFor(()=>expect(change).toHaveBeenCalledWith(false));
  });
});
