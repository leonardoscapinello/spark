import type { Meta, StoryObj } from "@storybook/react-vite";
import { UserAvatar } from "./UserAvatar.js";

const meta = { title: "Identidade/UserAvatar", component: UserAvatar } satisfies Meta<typeof UserAvatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ComFotoDoPerfil: Story = {
  args: { user: { name: "Ana Souza", avatarUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23dbe7ff'/%3E%3Ccircle cx='40' cy='31' r='14' fill='%235b6b89'/%3E%3Cpath d='M14 76c2-18 12-27 26-27s24 9 26 27' fill='%235b6b89'/%3E%3C/svg%3E" } },
};

export const SemFotoUsaIniciais: Story = { args: { user: { name: "Ana Souza", avatarUrl: null } } };
