import { describe, expect, it } from "vitest";
import { isPublicAddress, publicAddressAgent } from "./public-address.js";

describe("endereços externos", () => {
  it("bloqueia IPv4, IPv6 e IPv4 mapeado inclusive hexadecimal", () => {
    for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "fc00::1", "fe80::1", "ff02::1", "garbage"]) expect(isPublicAddress(address), address).toBe(false);
    for (const address of ["93.184.216.34", "2606:4700:4700::1111"]) expect(isPublicAddress(address), address).toBe(true);
  });
  it("recusa destinos internos antes de criar uma conexão", async () => {
    for (const url of ["http://127.0.0.1", "http://[::ffff:7f00:1]", "http://localhost"]) await expect(publicAddressAgent(url, new AbortController().signal)).rejects.toThrow();
  });
});
