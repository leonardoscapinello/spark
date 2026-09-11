import type { Meta, StoryObj } from "@storybook/react-vite";
import { Notification } from "./Notification.js";
const meta:Meta<typeof Notification>={title:"Feedback/Notificações",component:Notification,args:{title:"Nova conversa",description:"Uma conversa foi atribuída a você.",unread:true}};
export default meta;
type Story=StoryObj<typeof Notification>;
export const Informacao:Story={};
export const Atencao:Story={args:{tone:"warning"}};
export const Erro:Story={args:{tone:"error"}};
