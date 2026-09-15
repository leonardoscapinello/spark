import { describe, expect, it } from "vitest";
import { userId } from "../identity/id.js";
import { uniqueDealViewers } from "./dealPresence.js";

describe("presença no negócio", () => {
  it("deduplica abas por pessoa e mantém uma ordem estável", () => {
    const ana = { userId: userId.from("00000000-0000-7000-8000-000000000001"), name: "Ana", avatarUrl: null };
    const bia = { userId: userId.from("00000000-0000-7000-8000-000000000002"), name: "Bia", avatarUrl: null };
    expect(uniqueDealViewers([bia, ana, ana])).toEqual([ana, bia]);
  });
});
