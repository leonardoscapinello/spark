import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { InlineEdit } from "./InlineEdit.js";
describe("InlineEdit",()=>{
  it("descarta rascunho com Escape e devolve foco sem salvar",()=>{
    const save=vi.fn();render(<InlineEdit label="Nome" value="Maria" onSave={save} />);
    fireEvent.click(screen.getByRole("button",{name:"Editar Nome: Maria"}));
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Outro"}});
    fireEvent.keyDown(screen.getByRole("textbox"),{key:"Escape"});
    expect(save).not.toHaveBeenCalled();expect(screen.getByRole("button",{name:"Editar Nome: Maria"})).toHaveFocus();
  });
  it("preserva o rascunho após falha e permite tentar novamente",async()=>{
    const save=vi.fn().mockRejectedValueOnce(new Error("Falha")).mockResolvedValueOnce(undefined);
    render(<InlineEdit label="Nome" value="Maria" onSave={save} />);
    fireEvent.click(screen.getByRole("button",{name:"Editar Nome: Maria"}));
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Ana"}});
    fireEvent.click(screen.getByRole("button",{name:"Salvar"}));
    expect(await screen.findByRole("alert")).toBeInTheDocument();expect(screen.getByRole("textbox")).toHaveValue("Ana");
    fireEvent.click(screen.getByRole("button",{name:"Salvar"}));
    await waitFor(()=>expect(screen.queryByRole("textbox")).not.toBeInTheDocument());expect(save).toHaveBeenLastCalledWith("Ana");
  });
});
