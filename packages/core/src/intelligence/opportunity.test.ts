import { describe, it, expect } from "vitest";
import { estimateOpportunity, validateIntelligenceEvidence, type OpportunityFeatures } from "./opportunity.js";
const input: OpportunityFeatures = { pipeline: { won: 0, lost: 0 }, person: { won: 0, lost: 0 }, company: { won: 0, lost: 0 }, personScore: null, companyScore: null, ageDays: 0, typicalWonDays: null, overdueFollowUps: 0, completedFollowUps: 0 };
describe("opportunity intelligence", () => {
  it("identifies cold-start as uncalibrated, with no invented observations", () => {
    expect(estimateOpportunity(input)).toMatchObject({ basisPoints: 2500, sampleSize: 0, calibrated: false, factors: [] });
  });
  it("adapts the prior to real wins and losses", () => {
    expect(estimateOpportunity({ ...input, pipeline: { won: 80, lost: 20 } }).basisPoints).toBeGreaterThan(estimateOpportunity({ ...input, pipeline: { won: 20, lost: 80 } }).basisPoints);
  });
  it("uses scores, history and follow-ups without turning score into percent", () => {
    expect(estimateOpportunity({ ...input, personScore: 900 }).basisPoints).toBeGreaterThan(estimateOpportunity({ ...input, personScore: 100 }).basisPoints);
    expect(estimateOpportunity({ ...input, companyScore: 900, company: { won: 10, lost: 0 } }).basisPoints).toBeGreaterThan(2500);
    expect(estimateOpportunity({ ...input, overdueFollowUps: 10, ageDays: 90, typicalWonDays: 20 }).basisPoints).toBeLessThan(2500);
  });
  it("bounds estimates and rejects invalid inputs", () => {
    expect(estimateOpportunity({ ...input, pipeline: { won: 100000, lost: 0 }, personScore: 1000 }).basisPoints).toBeLessThanOrEqual(9900);
    expect(() => estimateOpportunity({ ...input, personScore: NaN })).toThrow();
  });
  it("provider changes do not change the core contract; invented sources are refused", () => {
    const evidence = { schemaVersion: 1, observations: [{ kind: "purchase_intent", value: "positive", confidence: 0.8, sourceIds: ["message-1"] }] };
    expect(validateIntelligenceEvidence(evidence, ["message-1"]).observations).toHaveLength(1);
    expect(() => validateIntelligenceEvidence(evidence, [])).toThrow();
  });
});
