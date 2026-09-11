import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField } from "./FormField.js";
import { Input } from "../Input/Input.js";
const meta:Meta<typeof FormField>={title:"Formulários/Composição de campo",component:FormField,args:{label:"Nome",children:<Input placeholder="Nome do contato" />}};
export default meta;
type Story=StoryObj<typeof FormField>;
export const LegendaAcima:Story={};
export const DuasColunas:Story={args:{layout:"horizontal",description:"Texto de apoio acompanha o campo."}};
export const SoPlaceholder:Story={args:{layout:"hidden-label"}};
