import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { QuickNavigation, type QuickNavigationItem } from "./QuickNavigation.js";

const items: QuickNavigationItem[] = [
  { id: "contacts", label: "Contatos", group: "Leads", icon: "user" },
  { id: "companies", label: "Empresas", group: "Leads", icon: "building" },
  { id: "deals", label: "Negócios", group: "CRM", icon: "briefcase" },
  { id: "activities", label: "Atividades", group: "CRM", icon: "calendar" },
  { id: "users", label: "Usuários", group: "Configurações", icon: "team" },
];

const meta: Meta<typeof QuickNavigation> = { title: "Navegação/Busca rápida", component: QuickNavigation };
export default meta;
type Story = StoryObj<typeof QuickNavigation>;

export const Areas: Story = { render: () => {
  function Example() {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState("");
    return <><Button onClick={() => setOpen(true)}>Buscar área</Button><p>Selecionada: {selected || "nenhuma"}</p><QuickNavigation open={open} onOpenChange={setOpen} items={items} onSelect={setSelected} /></>;
  }
  return <Example />;
} };
