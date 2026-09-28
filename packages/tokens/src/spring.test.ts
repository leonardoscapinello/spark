import { describe, expect, it } from "vitest";
import { projectMomentum, relativeVelocity, solveSpring, springLinear, springPhysics } from "./spring.js";

describe("springPhysics", () => {
  it("bounce 0 é amortecimento crítico (2·ω₀ = 4π/duration)", () => {
    const { stiffness, damping } = springPhysics({ duration: 0.5, bounce: 0 });
    expect(stiffness).toBeCloseTo((2 * Math.PI / 0.5) ** 2, 6);
    expect(damping).toBeCloseTo((4 * Math.PI) / 0.5, 6);
    expect(damping).toBeCloseTo(2 * Math.sqrt(stiffness), 6);
  });

  it("bounce positivo amortece menos; negativo amortece mais; os dois lados se encontram em zero", () => {
    const zero = springPhysics({ duration: 0.4, bounce: 0 }).damping;
    expect(springPhysics({ duration: 0.4, bounce: 0.3 }).damping).toBeLessThan(zero);
    expect(springPhysics({ duration: 0.4, bounce: -0.3 }).damping).toBeGreaterThan(zero);
    expect(springPhysics({ duration: 0.4, bounce: 1e-9 }).damping).toBeCloseTo(springPhysics({ duration: 0.4, bounce: -1e-9 }).damping, 5);
  });

  it("rejeita parâmetros fora do domínio", () => {
    expect(() => springPhysics({ duration: 0, bounce: 0 })).toThrow(RangeError);
    expect(() => springPhysics({ duration: 0.3, bounce: 1 })).toThrow(RangeError);
  });
});

describe("solveSpring", () => {
  it("sem bounce nunca passa do alvo e termina em 1", () => {
    const { at, settleTime } = solveSpring({ duration: 0.5, bounce: 0 });
    for (let t = 0; t <= 1.5; t += 0.01) expect(at(t)).toBeLessThanOrEqual(1 + 1e-9);
    expect(at(settleTime)).toBeCloseTo(1, 2);
    expect(settleTime).toBeGreaterThan(0.3);
    expect(settleTime).toBeLessThan(1.5);
  });

  it("com bounce passa do alvo pelo menos uma vez", () => {
    const { at } = solveSpring({ duration: 0.5, bounce: 0.3 });
    let max = 0;
    for (let t = 0; t <= 1.5; t += 0.005) max = Math.max(max, at(t));
    expect(max).toBeGreaterThan(1.02);
  });

  it("bounce negativo chega mais devagar que o crítico e também não passa do alvo", () => {
    const critical = solveSpring({ duration: 0.5, bounce: 0 });
    const slow = solveSpring({ duration: 0.5, bounce: -0.4 });
    expect(slow.at(0.25)).toBeLessThan(critical.at(0.25));
    for (let t = 0; t <= 2; t += 0.01) expect(slow.at(t)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("velocidade inicial positiva adianta o começo; negativa recua antes de ir", () => {
    const still = solveSpring({ duration: 0.5, bounce: 0 });
    const thrown = solveSpring({ duration: 0.5, bounce: 0 }, 6);
    const pulledBack = solveSpring({ duration: 0.5, bounce: 0 }, -6);
    expect(thrown.at(0.05)).toBeGreaterThan(still.at(0.05));
    expect(pulledBack.at(0.05)).toBeLessThan(0);
  });
});

describe("springLinear", () => {
  it("gera linear() válido, começando em 0 e terminando em 1, com duração em ms", () => {
    const { easing, durationMs } = springLinear({ duration: 0.45, bounce: 0 });
    expect(easing.startsWith("linear(0, ")).toBe(true);
    expect(easing.endsWith(", 1)")).toBe(true);
    expect(durationMs).toBeGreaterThan(300);
    expect(durationMs).toBeLessThan(1400);
    const stops = easing.slice("linear(".length, -1).split(", ");
    expect(stops.length).toBeGreaterThan(30);
    // Paradas intermediárias carregam a porcentagem de entrada, crescente.
    const percents = stops.slice(1, -1).map((s) => Number(s.split(" ")[1]!.replace("%", "")));
    for (let i = 1; i < percents.length; i += 1) expect(percents[i]!).toBeGreaterThan(percents[i - 1]!);
  });
});

describe("gesto → mola", () => {
  it("velocidade relativa divide px/s pela distância e ignora distância nula", () => {
    expect(relativeVelocity(200, 100)).toBe(2);
    expect(relativeVelocity(200, 0)).toBe(0);
    expect(relativeVelocity(Number.NaN, 100)).toBe(0);
  });

  it("projeção de momento cresce com a velocidade e freia mais com taxa menor", () => {
    expect(projectMomentum(1000)).toBeCloseTo(499, 0);
    expect(projectMomentum(1000, 0.99)).toBeLessThan(projectMomentum(1000, 0.998));
    expect(projectMomentum(-500)).toBeLessThan(0);
  });
});
