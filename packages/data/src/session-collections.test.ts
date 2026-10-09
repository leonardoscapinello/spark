import { describe, expect, it } from "vitest";
import { createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import { clearSessionCollections, registerSessionCollection } from "./session-collections.js";

describe("session collection boundary", () => {
  it("clears actual collection rows before the next session", async () => {
    const collection = registerSessionCollection(createCollection(localOnlyCollectionOptions<{ id: string }>({ getKey: row => row.id })));
    await collection.preload();
    await collection.insert({ id: "previous-person" }).isPersisted.promise;
    expect(collection.size).toBe(1);
    await clearSessionCollections();
    expect(collection.size).toBe(0);
  });
});
