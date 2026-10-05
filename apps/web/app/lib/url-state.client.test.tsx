import { act } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { useUrlEditor, useUrlState } from "./url-state.client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let setDeal: (value: string | null) => void = () => undefined;
function Probe() {
  const [deal, set] = useUrlState("deal", { history: "push" });
  setDeal = set;
  const location = useLocation();
  return <><output id="state">{deal ?? "nenhum"}</output><output id="url">{location.search}</output></>;
}

let container: HTMLDivElement;
async function mount(url: string) {
  container = document.createElement("div");
  document.body.append(container);
  const router = createMemoryRouter([{ path: "/deals", element: <Probe /> }], { initialEntries: [url] });
  await act(async () => { createRoot(container).render(<RouterProvider router={router} />); });
  return router;
}
const text = (id: string) => container.querySelector(`#${id}`)?.textContent;
afterEach(() => container.remove());

describe("estado na URL", () => {
  it("link colado abre o mesmo item e preserva os outros parâmetros", async () => {
    await mount("/deals?pipeline=p1&deal=d9");
    expect(text("state")).toBe("d9");
    expect(text("url")).toBe("?pipeline=p1&deal=d9");
  });

  it("abrir escreve na URL, trocar substitui, fechar limpa; Voltar e Avançar acompanham", async () => {
    const router = await mount("/deals?pipeline=p1");
    await act(async () => setDeal("d1"));
    expect(text("url")).toBe("?pipeline=p1&deal=d1");
    await act(async () => setDeal("d2"));
    expect(text("url")).toBe("?pipeline=p1&deal=d2");
    await act(async () => { await router.navigate(-1); });
    expect(text("state")).toBe("nenhum");
    expect(text("url")).toBe("?pipeline=p1");
    await act(async () => { await router.navigate(1); });
    expect(text("state")).toBe("d2");
    await act(async () => setDeal(null));
    expect(text("url")).toBe("?pipeline=p1");
  });
});

let editorApi: { openEdit: (item: { id: string }) => void; close: () => void; setItems: (items: { id: string }[]) => void } | undefined;
function EditorProbe() {
  const [items, setItems] = useState<{ id: string }[] | undefined>(undefined);
  const [editing, setEditing] = useState<string | null>(null);
  const editor = useUrlEditor(items, editing !== null, { create: () => setEditing("novo"), edit: item => setEditing(item.id), close: () => setEditing(null) });
  editorApi = { openEdit: editor.openEdit, close: editor.close, setItems };
  const location = useLocation();
  return <><output id="state">{editing ?? "fechado"}</output><output id="url">{location.search}</output></>;
}

describe("editor guiado pela URL", () => {
  it("link abre a edição quando os itens chegam; fechar e Voltar fecham", async () => {
    container = document.createElement("div");
    document.body.append(container);
    const router = createMemoryRouter([{ path: "/admin/teams", element: <EditorProbe /> }], { initialEntries: ["/admin/teams?editar=t2"] });
    await act(async () => { createRoot(container).render(<RouterProvider router={router} />); });
    expect(text("state")).toBe("fechado");
    await act(async () => editorApi!.setItems([{ id: "t1" }, { id: "t2" }]));
    expect(text("state")).toBe("t2");
    await act(async () => editorApi!.close());
    expect(text("state")).toBe("fechado");
    expect(text("url")).toBe("");
    await act(async () => editorApi!.openEdit({ id: "t1" }));
    expect(text("state")).toBe("t1");
    await act(async () => { await router.navigate(-1); });
    expect(text("state")).toBe("fechado");
  });
});
