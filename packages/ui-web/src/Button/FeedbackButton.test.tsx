import { render,screen,fireEvent } from "@testing-library/react";
import { it,expect,vi } from "vitest";
import { FeedbackButton } from "./FeedbackButton.js";
it("bloqueia reenvio durante a operação e permite tentar novamente após erro",()=>{
 const onClick=vi.fn();
 const {rerender}=render(<FeedbackButton state="pending" onClick={onClick}/>);
 fireEvent.click(screen.getByRole("button",{name:"Salvando…"}));
 expect(onClick).not.toHaveBeenCalled();
 expect(screen.getByRole("button")).toHaveAttribute("aria-busy","true");
 rerender(<FeedbackButton state="error" onClick={onClick}/>);
 expect(screen.getByRole("status")).toHaveTextContent("Não foi possível salvar");
 fireEvent.click(screen.getByRole("button",{name:"Tentar novamente"}));
 expect(onClick).toHaveBeenCalledOnce();
 rerender(<FeedbackButton state="success" onClick={onClick}/>);
 expect(screen.getByRole("status")).toHaveTextContent("Salvo");
});
