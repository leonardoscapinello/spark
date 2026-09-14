import { it, expect } from "vitest";
import { applyColumnOrder, moveColumn } from "./columnOrder.js";

it("move a coluna para a posição da coluna alvo",()=>{
 expect(moveColumn(["a","b","c"],"c","a")).toEqual(["c","a","b"]);
 expect(moveColumn(["a","b","c"],"a","c")).toEqual(["b","c","a"]);
});

it("ignora movimento sem efeito ou com id desconhecido",()=>{
 expect(moveColumn(["a","b"],"a","a")).toEqual(["a","b"]);
 expect(moveColumn(["a","b"],"z","a")).toEqual(["a","b"]);
});

it("aplica a ordem e mantém no fim a coluna que a ordem não conhece",()=>{
 const columns=[{id:"a"},{id:"b"},{id:"c"}];
 expect(applyColumnOrder(columns,["c","a"]).map(c=>c.id)).toEqual(["c","a","b"]);
 expect(applyColumnOrder(columns,["c","sumida","a"]).map(c=>c.id)).toEqual(["c","a","b"]);
 expect(applyColumnOrder(columns,undefined)).toBe(columns);
});
