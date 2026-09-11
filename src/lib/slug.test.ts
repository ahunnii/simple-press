import { describe, expect, it } from "vitest";

import {
  generateEventSlug,
  generateCollectionSlug,
  generateGallerySlug,
} from "./slug";

describe("generateEventSlug", () => {
  it("lowercases event names", () => {
    expect(generateEventSlug("Summer Gala")).toBe("summer-gala");
  });

  it("collapses runs of non-alphanumerics to single hyphens", () => {
    expect(generateEventSlug("Fall Fest — 2026!!!")).toBe("fall-fest-2026");
  });

  it("trims leading hyphens", () => {
    expect(generateEventSlug("!!!party!!!")).toBe("party");
  });

  it("preserves digits in the slug", () => {
    expect(generateEventSlug("Concert 2")).toBe("concert-2");
  });

  it("falls back to 'event' for empty string", () => {
    expect(generateEventSlug("")).toBe("event");
  });

  it("falls back to 'event' for only non-alphanumeric characters", () => {
    expect(generateEventSlug("!!!")).toBe("event");
  });

  it("falls back to 'event' for special symbols with no alphanumerics", () => {
    expect(generateEventSlug("™©®")).toBe("event");
  });

  it("handles multiple spaces as single hyphen", () => {
    expect(generateEventSlug("New   Year   Party")).toBe("new-year-party");
  });

  it("handles mixed special characters and text", () => {
    expect(generateEventSlug("Tech & Code (2026)")).toBe("tech-code-2026");
  });
});

describe("generateCollectionSlug", () => {
  it("lowercases and slugifies collection names", () => {
    expect(generateCollectionSlug("Art Gallery")).toBe("art-gallery");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateCollectionSlug("---Gallery---")).toBe("gallery");
  });

  it("returns empty string for non-slugifiable input", () => {
    expect(generateCollectionSlug("!!!")).toBe("");
  });
});

describe("generateGallerySlug", () => {
  it("lowercases and slugifies gallery names", () => {
    expect(generateGallerySlug("Photo Collection")).toBe("photo-collection");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateGallerySlug("---Photos---")).toBe("photos");
  });

  it("returns empty string for non-slugifiable input", () => {
    expect(generateGallerySlug("!!!")).toBe("");
  });
});
