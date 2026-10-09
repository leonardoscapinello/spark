import { describe, expect, it } from "vitest";
import { assertUploadedFile } from "./fileUpload.js";

describe("confirmação de upload", () => {
  const expected = { sizeBytes: 512, mimeType: "image/png" };
  it("aceita o objeto com tamanho e tipo solicitados", () => {
    expect(() => assertUploadedFile(expected, { sizeBytes: 512, contentType: "image/png" })).not.toThrow();
  });
  it.each([{ sizeBytes: 513, contentType: "image/png" }, { sizeBytes: 0, contentType: "image/png" }, { sizeBytes: 512, contentType: "text/html" }, { sizeBytes: 512, contentType: null }])("rejeita metadados divergentes: %j", actual => {
    expect(() => assertUploadedFile(expected, actual)).toThrow("não corresponde");
  });
});
