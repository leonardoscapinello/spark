// Tokens DTCG → CSS vars, tema RN, Figma (ADR-0020, ADR-0025).
// Esqueleto — Bloco 1 da Fase 0. Conteúdo real chega nos blocos seguintes.

export const PACKAGE_NAME = "@spark/tokens" as const;

export { DEFAULT_THEME_VALUES, type ThemeFontFamily } from "./theme.js";

// Molas perceptuais (duration + bounce) — a mesma matemática que o build usa
// para emitir --motion-spring-* como linear(), disponível em runtime para
// molas com velocidade inicial (soltar um arrasto).
export { springPhysics, solveSpring, springLinear, relativeVelocity, projectMomentum, type SpringSpec, type SpringPhysics, type SpringSolution, type SpringLinear } from "./spring.js";
