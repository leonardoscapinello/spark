import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormField, type FormFieldLayout } from "./FormField.js";
import { Input } from "../Input/Input.js";
describe("FormField",()=>{
 it.each<FormFieldLayout>(["vertical","horizontal","hidden-label"])("mantém nome acessível e ajuda no layout %s",layout=>{
  render(<FormField label="Nome" layout={layout} description="Como deseja ser chamado"><Input placeholder="Digite aqui" /></FormField>);
  expect(screen.getByRole("textbox",{name:"Nome"})).toHaveAccessibleDescription("Como deseja ser chamado");
 });
});
