import type { Meta, StoryObj } from "@storybook/react-vite";
import { OverlayExamples } from "../Catalog/OverlayExamples.js";
import { Toaster } from "../Notification/Toast.js";
const meta:Meta<typeof OverlayExamples>={title:"Composições/Overlays e CRM",component:OverlayExamples};
export default meta;
export const Interacoes:StoryObj<typeof OverlayExamples>={render:()=> <><Toaster /><OverlayExamples /></>};
