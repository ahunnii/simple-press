import { describe, expect, it } from "vitest";

import {
  DREAM_WHAT_WE_DO_ROWS_KEY,
  resolveDreamWhatWeDoRows,
} from "./dream-homepage-what-we-do-rows";
import { DREAM_WHAT_WE_DO_DEFAULT_ROWS } from "./index";

/** What the three built-in rows resolve to: no photos, today's copy + alt text. */
const DEFAULT_ROWS = DREAM_WHAT_WE_DO_DEFAULT_ROWS.map((row) => ({
  heading: row.heading,
  body: row.body,
  linkLabel: row.linkLabel,
  linkUrl: "/services",
  image: "",
  alt: row.alt,
  sideImage: "",
  sideAlt: row.sideAlt,
}));

describe("resolveDreamWhatWeDoRows", () => {
  it("uses a saved list in order, with any number of rows", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      heading: `Row ${i + 1}`,
      body: `Body ${i + 1}`,
    }));
    const resolved = resolveDreamWhatWeDoRows({
      [DREAM_WHAT_WE_DO_ROWS_KEY]: rows,
    });
    expect(resolved.map((r) => r.heading)).toEqual([
      "Row 1",
      "Row 2",
      "Row 3",
      "Row 4",
      "Row 5",
    ]);
  });

  it("maps every sub-field and trims text", () => {
    expect(
      resolveDreamWhatWeDoRows({
        [DREAM_WHAT_WE_DO_ROWS_KEY]: [
          {
            heading: "  Draping ",
            body: " Fabric. ",
            linkLabel: " See it ",
            linkUrl: "/services",
            image: "/main.jpg",
            alt: " Main photo ",
            sideImage: "/side.jpg",
            sideAlt: " Side photo ",
          },
        ],
      }),
    ).toEqual([
      {
        heading: "Draping",
        body: "Fabric.",
        linkLabel: "See it",
        linkUrl: "/services",
        image: "/main.jpg",
        alt: "Main photo",
        sideImage: "/side.jpg",
        sideAlt: "Side photo",
      },
    ]);
  });

  it("falls back to the heading for the main photo description, and leaves a blank side description blank", () => {
    const [row] = resolveDreamWhatWeDoRows({
      [DREAM_WHAT_WE_DO_ROWS_KEY]: [
        { heading: "Rentals", image: "/a.jpg", sideImage: "/b.jpg", alt: " " },
      ],
    });
    expect(row?.alt).toBe("Rentals");
    expect(row?.sideAlt).toBe("");
  });

  it("normalises /placeholder.svg to an empty image", () => {
    const [row] = resolveDreamWhatWeDoRows({
      [DREAM_WHAT_WE_DO_ROWS_KEY]: [
        {
          heading: "Rentals",
          image: "/placeholder.svg",
          sideImage: "/placeholder.svg",
        },
      ],
    });
    expect(row?.image).toBe("");
    expect(row?.sideImage).toBe("");
  });

  it("keeps a row with only a heading, a paragraph, or a photo, and drops fully blank rows", () => {
    const resolved = resolveDreamWhatWeDoRows({
      [DREAM_WHAT_WE_DO_ROWS_KEY]: [
        { heading: "Only heading" },
        { body: "Only body" },
        { image: "/only.jpg" },
        {
          heading: " ",
          body: "",
          image: "/placeholder.svg",
          linkLabel: "Orphan",
        },
        {},
      ],
    });
    expect(resolved.map((r) => [r.heading, r.body, r.image])).toEqual([
      ["Only heading", "", ""],
      ["", "Only body", ""],
      ["", "", "/only.jpg"],
    ]);
  });

  it("scrubs an unsafe link", () => {
    const [row] = resolveDreamWhatWeDoRows({
      [DREAM_WHAT_WE_DO_ROWS_KEY]: [
        { heading: "Bad", linkLabel: "Go", linkUrl: "javascript:alert(1)" },
      ],
    });
    expect(row?.linkUrl).toBe("");
  });

  it("uses a saved list even when retired numbered keys exist", () => {
    const resolved = resolveDreamWhatWeDoRows({
      "dream.homepage.row-1-heading": "Legacy",
      [DREAM_WHAT_WE_DO_ROWS_KEY]: [{ heading: "Saved" }],
    });
    expect(resolved.map((r) => r.heading)).toEqual(["Saved"]);
  });

  it("ignores the retired numbered keys", () => {
    expect(
      resolveDreamWhatWeDoRows({
        "dream.homepage.row-1-heading": "Legacy",
        "dream.homepage.row-1-photo": "/legacy.jpg",
      }),
    ).toEqual(DEFAULT_ROWS);
  });

  it("falls back to the three built-in rows when nothing is saved", () => {
    expect(resolveDreamWhatWeDoRows(undefined)).toEqual(DEFAULT_ROWS);
    expect(resolveDreamWhatWeDoRows({})).toEqual(DEFAULT_ROWS);
    expect(
      resolveDreamWhatWeDoRows({ [DREAM_WHAT_WE_DO_ROWS_KEY]: [] }),
    ).toEqual(DEFAULT_ROWS);
    expect(DEFAULT_ROWS.map((r) => r.heading)).toEqual([
      "Event Decor",
      "Event Rentals",
      "Customized Draping",
    ]);
  });
});
