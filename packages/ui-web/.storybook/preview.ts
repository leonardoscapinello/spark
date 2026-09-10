import type { Preview } from "@storybook/react-vite";
import "@spark/tokens/css";

const preview: Preview = {
  parameters: {
    a11y: {
      // ADR-0020 — todo componente entra com teste de acessibilidade;
      // isto reprova a build do Storybook em violação, não só avisa.
      test: "error",
    },
    backgrounds: {
      default: "ground",
      values: [{ name: "ground", value: "var(--color-ground)" }],
    },
  },
};

export default preview;
