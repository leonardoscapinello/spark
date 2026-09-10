import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// Sem test.globals no config (deliberado — nada de globals implícitos),
// então o auto-cleanup do Testing Library nunca é registrado sozinho.
// Sem isto, o DOM de um teste vaza pro próximo dentro do mesmo arquivo.
afterEach(() => cleanup());
