import type { Decorator, Preview } from "@storybook/react-vite";
import "@spark/tokens/css";
import "../src/identidade.css";
import "./preview.css";

type Tema = "claro" | "escuro" | "sistema";

/* O tema vale para o documento inteiro, como no app: menus, modais e dicas
 * vão para o portal e também precisam trocar de papel. */
const comTema: Decorator = (Story, context) => {
  const tema = (context.globals["tema"] ?? "claro") as Tema;
  const raiz = document.documentElement;
  if (tema === "sistema") delete raiz.dataset["theme"];
  else raiz.dataset["theme"] = tema === "escuro" ? "dark" : "light";
  return <Story />;
};

const preview: Preview = {
  tags: ["autodocs"],
  decorators: [comTema],
  globalTypes: {
    tema: {
      description: "Tema da identidade",
      toolbar: {
        title: "Tema",
        icon: "mirror",
        dynamicTitle: true,
        items: [
          { value: "claro", title: "Claro", icon: "sun" },
          { value: "escuro", title: "Escuro", icon: "moon" },
          { value: "sistema", title: "Do sistema", icon: "browser" },
        ],
      },
    },
  },
  initialGlobals: { tema: "claro" },
  parameters: {
    layout: "padded",
    a11y: {
      // ADR-0020 — todo componente entra com teste de acessibilidade;
      // isto reprova a build do Storybook em violação, não só avisa.
      test: "error",
    },
    backgrounds: { disable: true },
    viewport: {
      options: {
        celular: { name: "Celular · 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
        tablet: { name: "Tablet · 768", styles: { width: "768px", height: "1024px" }, type: "tablet" },
        notebook: { name: "Notebook · 1280", styles: { width: "1280px", height: "800px" }, type: "desktop" },
        desktop: { name: "Desktop · 1440", styles: { width: "1440px", height: "900px" }, type: "desktop" },
      },
    },
    controls: { expanded: true, sort: "requiredFirst" },
    options: {
      storySort: {
        method: "alphabetical",
        order: [
          "Identidade",
          ["Comece aqui", "Cores", "Tipografia", "Forma e medidas", "Relevo", "Papel e vidro", "Movimento", "Ícones"],
          "Ações",
          "Campos",
          "Escolhas",
          "Navegação",
          "Camadas",
          "Dados",
          "Retorno",
          "Superfícies",
          "Estrutura",
          "Padrões",
          "*",
        ],
      },
    },
  },
};

export default preview;
