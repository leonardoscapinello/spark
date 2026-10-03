import type { StorybookConfig } from "@storybook/react-vite";

/* Um só Storybook para o sistema inteiro (ADR-0044/0045): tokens, física e
 * todos os componentes de packages/ui-web. Cada componente tem a própria
 * página de documentação, gerada das histórias e das props. */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
