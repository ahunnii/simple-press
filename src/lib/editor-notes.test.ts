import { describe, expect, it } from "vitest";

import { formatNoteScope, MAX_NOTE_ATTACHMENTS } from "./editor-notes";

describe("formatNoteScope", () => {
  it("returns 'Whole site' when there is no page or section", () => {
    expect(formatNoteScope({ pageLabel: null })).toBe("Whole site");
    expect(formatNoteScope({ pageLabel: null, sectionLabel: null })).toBe(
      "Whole site",
    );
  });

  it("returns the page label for a page-scoped note", () => {
    expect(formatNoteScope({ pageLabel: "Homepage" })).toBe("Homepage");
    expect(formatNoteScope({ pageLabel: "Homepage", sectionLabel: null })).toBe(
      "Homepage",
    );
  });

  it("joins page and section with a chevron", () => {
    expect(
      formatNoteScope({ pageLabel: "Homepage", sectionLabel: "Hero" }),
    ).toBe("Homepage › Hero");
  });

  it("falls back to the section label when the page label is missing", () => {
    expect(formatNoteScope({ pageLabel: null, sectionLabel: "Header" })).toBe(
      "Header",
    );
  });

  it("treats blank labels as absent", () => {
    expect(formatNoteScope({ pageLabel: "  ", sectionLabel: " " })).toBe(
      "Whole site",
    );
  });
});

describe("MAX_NOTE_ATTACHMENTS", () => {
  it("is 3", () => {
    expect(MAX_NOTE_ATTACHMENTS).toBe(3);
  });
});
