import { describe, expect, it } from "vitest";

import {
  DREAM_HERO_SHELF_KEY,
  resolveDreamHeroShelf,
} from "./dream-homepage-shelf";
import { DREAM_HERO_SHELF_DEFAULT_ROWS } from "./index";

/** What the six built-in frames resolve to: no photo, today's alt + caption. */
const DEFAULT_PHOTOS = DREAM_HERO_SHELF_DEFAULT_ROWS.map((row) => ({
  src: "",
  alt: row.alt,
  caption: row.caption,
}));

describe("resolveDreamHeroShelf", () => {
  it("uses a saved list in order, with any number of rows", () => {
    expect(
      resolveDreamHeroShelf({
        [DREAM_HERO_SHELF_KEY]: [
          { image: "/a.jpg", caption: "One", alt: "First photo" },
          { image: "/b.jpg", caption: "Two", alt: "Second photo" },
          { image: "/c.jpg", caption: "Three", alt: "Third photo" },
          { image: "/d.jpg", caption: "Four", alt: "Fourth photo" },
          { image: "/e.jpg", caption: "Five", alt: "Fifth photo" },
          { image: "/f.jpg", caption: "Six", alt: "Sixth photo" },
          { image: "/g.jpg", caption: "Seven", alt: "Seventh photo" },
        ],
      }),
    ).toHaveLength(7);
  });

  it("uses a saved list even when retired numbered keys exist", () => {
    expect(
      resolveDreamHeroShelf({
        "dream.homepage.hero-shelf-photo-1": "/legacy.jpg",
        [DREAM_HERO_SHELF_KEY]: [
          { image: "/saved.jpg", caption: "Saved", alt: "A saved photo" },
        ],
      }),
    ).toEqual([{ src: "/saved.jpg", alt: "A saved photo", caption: "Saved" }]);
  });

  it("falls back to the label when the description is blank", () => {
    expect(
      resolveDreamHeroShelf({
        [DREAM_HERO_SHELF_KEY]: [
          { image: "/a.jpg", caption: "Balloon wall", alt: "  " },
          { image: "/b.jpg", caption: "Arbor" },
        ],
      }),
    ).toEqual([
      { src: "/a.jpg", alt: "Balloon wall", caption: "Balloon wall" },
      { src: "/b.jpg", alt: "Arbor", caption: "Arbor" },
    ]);
  });

  it("keeps a row with no photo when it has a label, and drops fully blank rows", () => {
    expect(
      resolveDreamHeroShelf({
        [DREAM_HERO_SHELF_KEY]: [
          { image: "", caption: "Coming soon", alt: "" },
          { image: "", caption: "", alt: "Orphan description" },
          { image: "/placeholder.svg", caption: "", alt: "" },
          { image: "/b.jpg", caption: "", alt: "" },
        ],
      }),
    ).toEqual([
      { src: "", alt: "Coming soon", caption: "Coming soon" },
      { src: "/b.jpg", alt: "", caption: "" },
    ]);
  });

  it("ignores the retired numbered keys", () => {
    expect(
      resolveDreamHeroShelf({
        "dream.homepage.hero-shelf-photo-1": "/legacy.jpg",
        "dream.homepage.hero-shelf-photo-1-caption": "Legacy",
      }),
    ).toEqual(DEFAULT_PHOTOS);
  });

  it("falls back to the six built-in frames when nothing is saved", () => {
    expect(resolveDreamHeroShelf(undefined)).toEqual(DEFAULT_PHOTOS);
    expect(resolveDreamHeroShelf({})).toEqual(DEFAULT_PHOTOS);
    expect(resolveDreamHeroShelf({ [DREAM_HERO_SHELF_KEY]: [] })).toEqual(
      DEFAULT_PHOTOS,
    );
    expect(DEFAULT_PHOTOS).toHaveLength(6);
    expect(DEFAULT_PHOTOS.map((p) => p.caption)).toEqual([
      "Outdoor draping",
      "Balloon wall",
      "Tablescape",
      "Throne chairs",
      "Floral backdrop",
      "Balloon table",
    ]);
  });
});
