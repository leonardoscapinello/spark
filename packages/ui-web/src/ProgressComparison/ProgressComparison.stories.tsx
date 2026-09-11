import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressComparison } from "./ProgressComparison.js";
const meta:Meta<typeof ProgressComparison>={title:"Dashboard/Progresso comparativo",component:ProgressComparison,args:{label:"Períodos",items:[{id:"a",label:"Meta",value:100,color:3},{id:"b",label:"Anterior",value:76,color:2},{id:"c",label:"Atual",value:62,color:1}]}};
export default meta;
type Story=StoryObj<typeof ProgressComparison>;
export const Agrupadas:Story={};
export const Sobrepostas:Story={args:{variant:"overlay"}};
