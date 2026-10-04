import { it, expect } from "vitest";
import { DealSchema } from "../schema/deal.js";
import { decodeDealFilters, dealMatchesFilterSet, type DealFilterSet } from "./dealFilter.js";
const id = "00000000-0000-7000-8000-000000000001";
const deal = DealSchema.parse({ id, orgId:id, pipelineId:id, stageId:id, contactId:null, companyId:null, ownerId:null, name:"Implantação", amount:150000, status:"open", expectedCloseDate:null, lossReason:null, createdAt:"2026-10-03T12:00:00Z", updatedAt:"2026-10-03T12:00:00Z", deletedAt:null, probabilityBasisPoints:6500, tags:["prioridade"] });
it("combines AND inside groups and OR between groups using reais and percentages", () => {
 const filters: DealFilterSet = { combinator:"or", groups:[{combinator:"and",conditions:[{field:"amount",operator:"gt",value:"1000"},{field:"probabilityBasisPoints",operator:"gt",value:"60"}]},{combinator:"and",conditions:[{field:"status",operator:"is",value:"won"}]}] };
 expect(dealMatchesFilterSet(deal,filters)).toBe(true);
 expect(dealMatchesFilterSet(deal,{...filters,combinator:"and"})).toBe(false);
});
it("keeps unfinished OR conditions neutral, respects tags and missing values", () => {
 expect(dealMatchesFilterSet(deal,{combinator:"and",groups:[{combinator:"or",conditions:[{field:"status",operator:"is",value:"won"},{field:"amount",operator:"gt",value:null}]}]})).toBe(false);
 expect(dealMatchesFilterSet(deal,{combinator:"and",groups:[{combinator:"and",conditions:[{field:"tags",operator:"in",value:["prioridade"]},{field:"ownerId",operator:"is_empty",value:null}]}]})).toBe(true);
});
it("validates shared URLs and keeps an empty query inert", () => {
 expect(decodeDealFilters("invalid").groups).toEqual([]);
 expect(decodeDealFilters('{"combinator":"xor","groups":[]}').groups).toEqual([]);
 expect(dealMatchesFilterSet(deal,decodeDealFilters(null))).toBe(true);
});
