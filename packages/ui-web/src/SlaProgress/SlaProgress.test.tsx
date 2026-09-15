import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SlaProgress } from "./SlaProgress.js";
it("expõe consumo e estado do SLA", () => { render(<SlaProgress percent={82} label="SLA 82%" state="due_soon" />); expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "82"); });
