import { describe, expect, it } from "vitest";

import {
  customizationLines,
  ORDER_OPTIONS_HINT_MAX_LENGTH,
  orderItemOptionLines,
  orderOptionsHint,
  readCustomizationSnapshot,
} from "./display";
import { priceConfiguration } from "./evaluate";
import { gloveDefinition } from "./test-fixtures";

function snapshot() {
  const result = priceConfiguration(
    gloveDefinition(),
    {
      choices: [
        { groupId: "chain", valueIds: ["silver"] },
        { groupId: "charms", valueIds: ["star", "heart"] },
      ],
      texts: [{ groupId: "engraving", text: "Amy" }],
    },
    { basePrice: 4000 },
  );
  if (!result.ok) throw new Error("fixture should price");
  return result.snapshot;
}

describe("customizationLines", () => {
  it("renders one line per group with included marks and group prices", () => {
    expect(customizationLines(snapshot())).toEqual([
      { label: "Chain", value: "Silver", price: 1500 },
      { label: "Charms", value: "Heart (included), Star", price: 800 },
      { label: "Engraving", value: "“Amy”", price: 500 },
    ]);
  });

  it("skips empty groups", () => {
    expect(
      customizationLines({
        v: 1,
        basePrice: 0,
        addOnTotal: 0,
        summary: "",
        groups: [
          { groupId: "a", name: "A", kind: "choice", selections: [] },
          { groupId: "b", name: "B", kind: "text", text: "" },
        ],
        components: [],
      }),
    ).toEqual([]);
  });
});

describe("readCustomizationSnapshot", () => {
  it("round-trips a stored snapshot through JSON", () => {
    const stored = JSON.parse(JSON.stringify(snapshot())) as unknown;
    expect(readCustomizationSnapshot(stored)).toEqual(snapshot());
  });

  it("rejects null, unknown versions and malformed blobs", () => {
    expect(readCustomizationSnapshot(null)).toBeNull();
    expect(readCustomizationSnapshot({ ...snapshot(), v: 2 })).toBeNull();
    expect(
      readCustomizationSnapshot({ ...snapshot(), groups: "nope" }),
    ).toBeNull();
    expect(
      readCustomizationSnapshot({
        ...snapshot(),
        groups: [{ name: "x", kind: "choice", selections: [{}] }],
      }),
    ).toBeNull();
  });
});

describe("orderItemOptionLines", () => {
  it("is empty for plain lines and junk", () => {
    expect(orderItemOptionLines(null)).toEqual([]);
    expect(orderItemOptionLines(undefined)).toEqual([]);
    expect(orderItemOptionLines({ v: 9 })).toEqual([]);
  });

  it("renders a stored snapshot's lines", () => {
    expect(orderItemOptionLines(snapshot())).toEqual(
      customizationLines(snapshot()),
    );
  });

  it("falls back to the summary for a summary-only snapshot", () => {
    expect(
      orderItemOptionLines({
        v: 1,
        basePrice: 100,
        addOnTotal: 0,
        summary: "Chain: Gold",
        groups: [],
        components: [],
      }),
    ).toEqual([{ label: "Options", value: "Chain: Gold", price: 0 }]);
  });
});

describe("orderOptionsHint", () => {
  it("is null when no line carries a readable build", () => {
    expect(orderOptionsHint([])).toBeNull();
    expect(orderOptionsHint([null, undefined, { v: 9 }])).toBeNull();
  });

  it("counts customized lines and joins their summaries", () => {
    const short = {
      v: 1,
      basePrice: 100,
      addOnTotal: 0,
      summary: "Chain: Gold",
      groups: [],
      components: [],
    };
    expect(orderOptionsHint([null, short, short])).toEqual({
      count: 2,
      summary: "Chain: Gold; Chain: Gold",
    });
  });

  it("truncates a long summary with an ellipsis", () => {
    const hint = orderOptionsHint([snapshot(), snapshot()]);
    expect(hint?.count).toBe(2);
    expect(Array.from(hint!.summary)).toHaveLength(
      ORDER_OPTIONS_HINT_MAX_LENGTH,
    );
    expect(hint!.summary.endsWith("…")).toBe(true);
    expect(hint!.summary.startsWith(snapshot().summary)).toBe(true);
  });
});
