import { describe, expect, it } from "vitest";

import {
  classifyLaneSection,
  resolveDreamLaneSections,
} from "./dream-lane-sections";
import {
  DREAM_LANE_SECTIONS_DEFAULT_ROWS,
  DREAM_LANE_SECTIONS_KEY,
} from "./dream-lane-sections-defaults";
import { dreamLaneFields, resolveDreamLaneFields } from "./fields";

describe("classifyLaneSection", () => {
  it("is split when a row has text and a photo", () => {
    expect(
      classifyLaneSection({ heading: "Hi", body: "", image: "/a.jpg" }),
    ).toBe("split");
    expect(
      classifyLaneSection({ heading: "", body: "Hello", image: "/a.jpg" }),
    ).toBe("split");
  });

  it("counts the platform placeholder as a photo", () => {
    expect(
      classifyLaneSection({
        heading: "Hi",
        body: "",
        image: "/placeholder.svg",
      }),
    ).toBe("split");
    expect(classifyLaneSection({ image: "/placeholder.svg" })).toBe("photo");
  });

  it("is photo when only a photo is filled in", () => {
    expect(
      classifyLaneSection({ heading: " ", body: "", image: "/a.jpg" }),
    ).toBe("photo");
  });

  it("is text when only a heading or body is filled in", () => {
    expect(classifyLaneSection({ heading: "Hi", image: "" })).toBe("text");
    expect(classifyLaneSection({ body: "Hello" })).toBe("text");
  });

  it("is null when neither is filled in", () => {
    expect(classifyLaneSection({})).toBeNull();
    expect(
      classifyLaneSection({ heading: "  ", body: "\n", image: "  " }),
    ).toBeNull();
    expect(classifyLaneSection({ heading: 3, image: null })).toBeNull();
  });
});

describe("resolveDreamLaneSections", () => {
  it("falls back to the three built-in rows when unsaved or empty", () => {
    for (const custom of [undefined, {}, { [DREAM_LANE_SECTIONS_KEY]: [] }]) {
      const sections = resolveDreamLaneSections(custom);
      expect(sections.map((s) => s.heading)).toEqual([
        "How it starts",
        "What's included",
        "On the day",
      ]);
      expect(sections.every((s) => s.kind === "split")).toBe(true);
    }
  });

  it("uses the saved rows and skips empty ones", () => {
    const sections = resolveDreamLaneSections({
      [DREAM_LANE_SECTIONS_KEY]: [
        { _id: "a", heading: "One", body: "", image: "/x.jpg", crop: "true" },
        { _id: "b", heading: "", body: "", image: "", alt: "" },
        { _id: "c", image: "/y.jpg", alt: "Y" },
        { _id: "d", body: "Just words" },
      ],
    });
    expect(sections.map((s) => [s.id, s.kind])).toEqual([
      ["a", "split"],
      ["c", "photo"],
      ["d", "text"],
    ]);
    expect(sections[0]?.crop).toBe(true);
    expect(sections[1]?.crop).toBe(false);
  });
});

describe("dream-lane fields", () => {
  const byKey = new Map(dreamLaneFields.map((f) => [f.key, f]));

  it("declares sections as a 0–8 list whose defaultRows spell every sub-field", () => {
    const field = byKey.get(DREAM_LANE_SECTIONS_KEY);
    if (!field || field.type !== "list") throw new Error("missing list");
    expect(field.minItems).toBe(0);
    expect(field.maxItems).toBe(8);
    expect(field.itemLabel).toBe("section");
    expect(field.summaryKey).toBe("heading");
    expect(field.defaultsWhenEmpty).toBe(true);
    const subKeys = field.itemSchema.map((s) => s.key);
    expect(subKeys).toEqual(["heading", "body", "image", "alt", "crop"]);
    expect(field.defaultRows).toBe(DREAM_LANE_SECTIONS_DEFAULT_ROWS);
    for (const row of field.defaultRows ?? []) {
      expect(Object.keys(row).sort()).toEqual([...subKeys].sort());
      expect(row.image).toBe("/placeholder.svg");
      expect(row.crop).toBe("false");
    }
  });

  it("defaults the cover and sections switches on and the gallery heading", () => {
    const f = resolveDreamLaneFields({}, [
      "dream-lane.show-cover",
      "dream-lane.sections-visible",
      "dream-lane.gallery",
      "dream-lane.gallery-heading",
      "dream-lane.gallery-lede",
    ]);
    expect(f["dream-lane.show-cover"]).toBe("true");
    expect(f["dream-lane.sections-visible"]).toBe("true");
    expect(f["dream-lane.gallery"]).toBe("");
    expect(f["dream-lane.gallery-heading"]).toBe("See it styled");
    expect(f["dream-lane.gallery-lede"]).toBe("");
  });

  it("no longer declares the retired numbered block fields", () => {
    expect(
      dreamLaneFields.filter((f) => f.key.startsWith("dream-lane.block-")),
    ).toEqual([]);
  });
});
