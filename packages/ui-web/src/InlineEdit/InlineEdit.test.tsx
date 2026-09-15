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
  it("salva ao sair do título e cancela sem gravar",async()=>{
    const save=vi.fn().mockResolvedValue(undefined);
    render(<><InlineEdit label="Título do negócio" value="Proposta" onSave={save} saveOnBlur appearance="title" /><button type="button">Fora</button></>);
    fireEvent.click(await screen.findByRole("button",{name:"Editar Título do negócio: Proposta"}));
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Renovação"}});
    fireEvent.blur(screen.getByRole("textbox"),{relatedTarget:screen.getByRole("button",{name:"Fora"})});
    await waitFor(()=>expect(save).toHaveBeenCalledWith("Renovação"));

    fireEvent.click(await screen.findByRole("button",{name:"Editar Título do negócio: Proposta"}));
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Descartar"}});
    fireEvent.click(screen.getByRole("button",{name:"Cancelar"}));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
