import type { Meta, StoryObj } from "@storybook/react-vite";
import { DashboardGrid } from "./Dashboard.js";
import { MetricCard } from "../Card/Card.js";
const meta: Meta<typeof DashboardGrid> = {title:"Dashboard/Grid",component:DashboardGrid};
export default meta;
type Story = StoryObj<typeof DashboardGrid>;
export const Indicadores: Story = {render:()=> <DashboardGrid metrics><MetricCard title="Recebidas" value="340" /><MetricCard title="Resolvidas" value="304" /></DashboardGrid>};
