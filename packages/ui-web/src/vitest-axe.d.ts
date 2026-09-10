// @types/jest-axe só amplia o namespace do Jest — não o Assertion do Vitest.
// jest-axe funciona em runtime (expect.extend em test-setup.ts); isto só
// ensina o tsc sobre o matcher, que sem isto não existe no tipo.
import "vitest";

interface AxeMatchers<T = unknown> {
  toHaveNoViolations(): T;
}

declare module "vitest" {
  // corpo vazio é o padrão exigido de module augmentation do TS — intencional.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends AxeMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
