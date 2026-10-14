import { describe, expect, it } from "vitest";

import {
  configKey,
  isEmptySelection,
  normalizeSelection,
  stableHash16,
} from "./canonical";

describe("normalizeSelection", () => {
  it("sorts, dedupes, merges, cleans and drops empties", () => {
    expect(
      normalizeSelection({
        choices: [
          { groupId: "charms", valueIds: ["star", "heart", "star"] },
          { groupId: "chain", valueIds: ["gold"] },
          { groupId: "empty", valueIds: [] },
          { groupId: "charms", valueIds: ["moon"] },
        ],
        texts: [
          { groupId: "note", text: "   " },
          { groupId: "engraving", text: "  Amy\n" },
        ],
      }),
    ).toEqual({
      choices: [
        { groupId: "chain", valueIds: ["gold"] },
        { groupId: "charms", valueIds: ["heart", "moon", "star"] },
      ],
      texts: [{ groupId: "engraving", text: "Amy" }],
    });
  });

  it("accepts missing input", () => {
    expect(normalizeSelection(undefined)).toEqual({ choices: [], texts: [] });
    expect(normalizeSelection({})).toEqual({ choices: [], texts: [] });
    expect(isEmptySelection(null)).toBe(true);
  });
});

describe("configKey", () => {
  const a = {
    choices: [
      { groupId: "charms", valueIds: ["heart", "star"] },
      { groupId: "chain", valueIds: ["gold"] },
    ],
    texts: [{ groupId: "engraving", text: "Amy" }],
  };
  const b = {
    texts: [{ groupId: "engraving", text: " Amy " }],
    choices: [
      { groupId: "chain", valueIds: ["gold"] },
      { groupId: "charms", valueIds: ["star", "heart"] },
      { groupId: "unused", valueIds: [] },
    ],
  };

  it("ignores order, whitespace and empty entries", () => {
    expect(configKey(a)).toBe(configKey(b));
  });

  it("is a 16-char hex string, stable across runs", () => {
    expect(configKey(a)).toMatch(/^[0-9a-f]{16}$/);
    // Pinned: the browser and server must agree forever (cart lines persist).
    expect(configKey(a)).toBe("e785ab972879b405");
  });

  it("differs when the build differs", () => {
    expect(configKey(a)).not.toBe(
      configKey({ ...a, texts: [{ groupId: "engraving", text: "Amie" }] }),
    );
    expect(configKey(a)).not.toBe(
      configKey({ ...a, choices: [{ groupId: "chain", valueIds: ["gold"] }] }),
    );
    // Same value id under a different group is a different build.
    expect(
      configKey({ choices: [{ groupId: "x", valueIds: ["v"] }], texts: [] }),
    ).not.toBe(
      configKey({ choices: [{ groupId: "y", valueIds: ["v"] }], texts: [] }),
    );
  });

  it("is empty for an empty or missing selection", () => {
    expect(configKey(undefined)).toBe("");
    expect(
      configKey({
        choices: [{ groupId: "g", valueIds: [] }],
        texts: [{ groupId: "t", text: " " }],
      }),
    ).toBe("");
  });
});

describe("stableHash16", () => {
  it("is two 32-bit FNV-1a passes (seeds 0x811c9dc5, 0x050c5d1f)", () => {
    // Pinned: saved carts embed these (configKey, hashed checkout line keys).
    expect(stableHash16("abc")).toBe("1a47e90bb9de7311");
    expect(stableHash16("")).toBe("811c9dc5050c5d1f");
  });

  it("is 16 hex chars and sensitive to the input", () => {
    expect(stableHash16("glove-a")).toMatch(/^[0-9a-f]{16}$/);
    expect(stableHash16("glove-a")).not.toBe(stableHash16("glove-b"));
  });

  it("is what configKey hashes: the JSON of the normalized selection", () => {
    const selection = {
      choices: [{ groupId: "charms", valueIds: ["star"] }],
      texts: [],
    };
    expect(configKey(selection)).toBe(
      stableHash16(JSON.stringify(normalizeSelection(selection))),
    );
  });
});
