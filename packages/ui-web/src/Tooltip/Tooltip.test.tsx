import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect } from "vitest";
import { Tooltip, TooltipProvider } from "./Tooltip.js";
import { Button } from "../Button/Button.js";
it("abre ajuda no hover, no foco e no clique",async()=>{
 render(<TooltipProvider><Tooltip content="Explicação"><Button aria-label="Ajuda">?</Button></Tooltip></TooltipProvider>);
 const trigger=screen.getByRole("button",{name:"Ajuda"});
 fireEvent.mouseEnter(trigger);expect(await screen.findByRole("tooltip")).toHaveTextContent("Explicação");
 fireEvent.focus(trigger);expect(trigger).toHaveAccessibleDescription("Explicação");
 fireEvent.click(trigger);fireEvent.mouseLeave(trigger);expect(screen.getByRole("tooltip")).toHaveTextContent("Explicação");
});
