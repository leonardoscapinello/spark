import { describe, expect, it } from "vitest";
import { DEFAULT_SCORE_MODEL, ScoreModelSchema, evaluateScore } from "./index.js";
const at = new Date("2026-10-03T12:00:00Z");
describe("commercial score", () => {
  it("does not manufacture interest or probability", () => {
    expect(evaluateScore(DEFAULT_SCORE_MODEL, [], at)).toMatchObject({ value: 0, hasEvidence: false });
    expect(evaluateScore(DEFAULT_SCORE_MODEL, [{ signal: "deal.won", day: "2026-10-03", count: 1 }], at).value).toBe(0);
  });
  it("caps repeated signals and ignores future signals", () => {
    const days = [{ signal: "form.submitted", day: "2026-10-03", count: 900 }, { signal: "form.submitted", day: "2026-10-04", count: 1 }];
    expect(evaluateScore(DEFAULT_SCORE_MODEL, days, at).value).toBe(80);
  });
  it("decays by half life and expires old evidence", () => {
    expect(evaluateScore(DEFAULT_SCORE_MODEL, [{ signal: "form.submitted", day: "2026-09-19", count: 1 }], at).value).toBe(40);
    expect(evaluateScore(DEFAULT_SCORE_MODEL, [{ signal: "form.submitted", day: "2025-09-19", count: 1 }], at).value).toBe(0);
  });
  it("keeps negatives bounded at zero and all results within scale", () => {
    expect(evaluateScore(DEFAULT_SCORE_MODEL, [{ signal: "intent.declined", day: "2026-10-03", count: 100 }], at).value).toBe(0);
    const days = DEFAULT_SCORE_MODEL.rules.filter(r => r.points > 0).flatMap(r => Array.from({ length: 20 }, (_, i) => ({ signal: r.signal, day: `2026-09-${String(i + 10).padStart(2, "0")}`, count: 100 })));
    expect(evaluateScore(DEFAULT_SCORE_MODEL, days, at).value).toBeLessThanOrEqual(1000);
  });
  it("replays deterministically and validates model versions", () => {
    const days = [{ signal: "message.received", day: "2026-10-03", count: 1 }];
    expect(evaluateScore(DEFAULT_SCORE_MODEL, days, at)).toEqual(evaluateScore(DEFAULT_SCORE_MODEL, days, at));
    expect(ScoreModelSchema.safeParse({ ...DEFAULT_SCORE_MODEL, rules: [DEFAULT_SCORE_MODEL.rules[0], DEFAULT_SCORE_MODEL.rules[0]] }).success).toBe(false);
  });
});
