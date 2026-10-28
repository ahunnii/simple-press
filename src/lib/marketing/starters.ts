import type { JSONContent } from "@tiptap/core";

/**
 * Starter layouts for new campaigns. Pure data: each starter is a tiptap
 * document the owner edits in place. Placeholders sit in square brackets so
 * it is obvious what to replace. Only node types the email renderer
 * allowlists are used.
 */
export type CampaignStarterId =
  | "blank"
  | "sale"
  | "new-arrival"
  | "event"
  | "newsletter";

export type CampaignStarter = {
  id: CampaignStarterId;
  name: string;
  description: string;
  subject: string;
  previewText: string;
  /** True when the doc contains an emailProducts block. */
  needsProducts: boolean;
  doc: { type: "doc"; content: JSONContent[] };
};

const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content,
});

const centered = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  attrs: { textAlign: "center" },
  content,
});

const text = (value: string, marks?: JSONContent["marks"]): JSONContent => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});

const bold = (value: string): JSONContent => text(value, [{ type: "bold" }]);

const heading = (
  level: 1 | 2 | 3,
  value: string,
  textAlign?: "center",
): JSONContent => ({
  type: "heading",
  attrs: textAlign ? { level, textAlign } : { level },
  content: [text(value)],
});

const spacer = (size: "sm" | "md" | "lg"): JSONContent => ({
  type: "spacer",
  attrs: { size },
});

const rule: JSONContent = { type: "horizontalRule" };

const solidLink = (label: string, href: string): JSONContent =>
  text(label, [{ type: "link", attrs: { href, variant: "solid" } }]);

const listItem = (value: string): JSONContent => ({
  type: "listItem",
  content: [paragraph(text(value))],
});

export const CAMPAIGN_STARTERS: readonly CampaignStarter[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from an empty page.",
    subject: "",
    previewText: "",
    needsProducts: false,
    doc: { type: "doc", content: [{ type: "paragraph" }] },
  },
  {
    id: "sale",
    name: "Sale",
    description: "Announce a discount with a button to shop.",
    subject: "[Your sale headline]",
    previewText: "[A short line that makes them want to open it.]",
    needsProducts: false,
    doc: {
      type: "doc",
      content: [
        heading(1, "[Your sale headline]", "center"),
        centered(text("[How much off, on what, and until when.]")),
        spacer("sm"),
        centered(solidLink("Shop the sale", "/shop")),
        spacer("md"),
        paragraph(
          text(
            "[Anything else they should know — codes, exclusions, shipping.]",
          ),
        ),
      ],
    },
  },
  {
    id: "new-arrival",
    name: "New arrival",
    description: "Show what's new with a product grid.",
    subject: "[Your new arrival headline]",
    previewText: "[What just landed, in a few words.]",
    needsProducts: true,
    doc: {
      type: "doc",
      content: [
        heading(1, "[Meet our newest …]"),
        paragraph(
          text("[A sentence or two about what's new and why you love it.]"),
        ),
        {
          type: "emailProducts",
          attrs: { items: [], buttonLabel: "Shop now" },
        },
        spacer("sm"),
        paragraph(text("[Sign off — thanks for being here.]")),
      ],
    },
  },
  {
    id: "event",
    name: "Event",
    description: "Share the date, place and an RSVP button.",
    subject: "[Event name] — [date]",
    previewText: "[The date and place, at a glance.]",
    needsProducts: false,
    doc: {
      type: "doc",
      content: [
        heading(1, "[Event name]"),
        paragraph(bold("When:"), text(" [Day, date, time]")),
        paragraph(bold("Where:"), text(" [Place or link]")),
        paragraph(text("[What to expect and who it's for.]")),
        centered(solidLink("RSVP", "/contact")),
      ],
    },
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description: "A monthly update with a few short stories.",
    subject: "[This month at your store]",
    previewText: "[The highlights of this month.]",
    needsProducts: false,
    doc: {
      type: "doc",
      content: [
        heading(1, "[This month at …]"),
        paragraph(text("[A short hello and what you'll find in this issue.]")),
        heading(2, "[First story]"),
        paragraph(text("[Two or three sentences on the first story.]")),
        rule,
        heading(2, "[Second story]"),
        paragraph(text("[Two or three sentences on the second story.]")),
        rule,
        heading(2, "[Quick notes]"),
        {
          type: "bulletList",
          content: [listItem("[Note]"), listItem("[Note]"), listItem("[Note]")],
        },
        paragraph(text("[Sign off — thanks for reading.]")),
      ],
    },
  },
];

export function getCampaignStarter(id: string): CampaignStarter | undefined {
  return CAMPAIGN_STARTERS.find((starter) => starter.id === id);
}

/** Starters the owner can pick now; product layouts need products switched on. */
export function availableStarters(opts: {
  productsEnabled: boolean;
}): CampaignStarter[] {
  return CAMPAIGN_STARTERS.filter(
    (starter) => !starter.needsProducts || opts.productsEnabled,
  );
}
