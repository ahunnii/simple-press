import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { tiptapToEmailHtml } from "~/lib/marketing/tiptap-to-email";

import {
  availableStarters,
  CAMPAIGN_STARTERS,
  getCampaignStarter,
} from "./starters";

const BASE_URL = "https://shop.example.com";

const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "heading",
  "text",
  "bulletList",
  "listItem",
  "horizontalRule",
  "spacer",
  "emailProducts",
]);

const ALLOWED_MARKS = new Set(["bold", "italic", "link"]);

function collect(node: JSONContent, types: Set<string>, marks: Set<string>) {
  types.add(node.type ?? "");
  for (const mark of node.marks ?? []) marks.add(mark.type ?? "");
  for (const child of node.content ?? []) collect(child, types, marks);
}

describe("CAMPAIGN_STARTERS", () => {
  it("has unique ids", () => {
    const ids = CAMPAIGN_STARTERS.map((starter) => starter.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only node and mark types the email renderer allows", () => {
    for (const starter of CAMPAIGN_STARTERS) {
      const types = new Set<string>();
      const marks = new Set<string>();
      collect(starter.doc, types, marks);
      for (const type of types) expect(ALLOWED_NODES.has(type)).toBe(true);
      for (const mark of marks) expect(ALLOWED_MARKS.has(mark)).toBe(true);
    }
  });

  it("sets needsProducts exactly when the doc has an emailProducts block", () => {
    for (const starter of CAMPAIGN_STARTERS) {
      const types = new Set<string>();
      collect(starter.doc, types, new Set());
      expect(starter.needsProducts).toBe(types.has("emailProducts"));
    }
  });

  for (const starter of CAMPAIGN_STARTERS) {
    it(`renders "${starter.id}" through the email renderer`, () => {
      const { warnings } = tiptapToEmailHtml(starter.doc, {
        baseUrl: BASE_URL,
      });
      if (starter.id === "new-arrival") {
        // The product grid is empty in a starter, so only that warning is expected.
        for (const warning of warnings) {
          expect(warning).toMatch(/product/i);
        }
      } else {
        expect(warnings).toEqual([]);
      }
    });
  }
});

describe("getCampaignStarter", () => {
  it("finds a starter by id", () => {
    expect(getCampaignStarter("sale")?.name).toBe("Sale");
  });

  it("returns undefined for an unknown id", () => {
    expect(getCampaignStarter("nope")).toBeUndefined();
  });
});

describe("availableStarters", () => {
  it("hides product starters when products are off", () => {
    const ids = availableStarters({ productsEnabled: false }).map((s) => s.id);
    expect(ids).not.toContain("new-arrival");
    expect(ids).toContain("blank");
    expect(ids).toContain("sale");
  });

  it("includes product starters when products are on", () => {
    const ids = availableStarters({ productsEnabled: true }).map((s) => s.id);
    expect(ids).toContain("new-arrival");
    expect(ids.length).toBe(CAMPAIGN_STARTERS.length);
  });
});
