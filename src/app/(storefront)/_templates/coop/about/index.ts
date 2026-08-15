import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field/group/section module for the `coop` template's About page —
 * transcribed verbatim from `building-clone/src/app/new-page-2/page.tsx`
 * (data-cid n35–n77). There is no separate "hero"/"title" block in the
 * source — the page is one uninterrupted content flow of Agdasima-styled
 * paragraphs plus a single tall portrait photo with a caption. Rendered
 * ground truth: `building-clone/out/new-page-2.html`.
 *
 * Single field group/section (`about.main`) — matches design.md's per-page
 * section concept ("Single content section on --coop-surface").
 */

const aboutMainData: TemplateField[] = [
  {
    key: "coop.about.intro-paragraph-1",
    label: "Intro Paragraph 1",
    description:
      "First paragraph of the page, rendered as the page's H1 (styled as a small Agdasima label, matching the source).",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Detroit, Hamtramck, and Highland Park are primarily composed of homes nearing a century in age. There is huge unmet demand for those that can service these old homes that we are doing a small part to help fill. For the past several years we have operated as a business by restoring these homes and the historic materials in them. We believe that by both offering our expertise and by training others our business will always have viability because there will be demand for our work which offers us a proper foundation to a successful community enterprise.",
  },
  {
    key: "coop.about.intro-paragraph-2",
    label: "Intro Paragraph 2",
    description: "Second paragraph, directly below the first.",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue:
      "We are a company that respects the history ofDetroit homes and the lives of the people that have lived in them. We appreciate and strive to preserve the craftsmanship of what Detroiters have built through the centuries. These homes are the homes of our neighbors and if your house looks good our neighborhoods look good.",
  },
  {
    key: "coop.about.statement",
    label: "Centered Statement",
    description:
      "Short centered statement above the portrait photo. Leading space preserved from the source.",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue:
      " Having multiple owners adds more institutional knowledge, accountability, and prolonged stewardship.",
  },
  {
    key: "coop.about.portrait-image",
    label: "Portrait Photo",
    description:
      "Tall portrait photo of the working members, shown below the centered statement.",
    type: "image",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "/templates/coop/images/9d43af51d9a2.jpg",
  },
  {
    key: "coop.about.portrait-caption",
    label: "Portrait Caption",
    description: "Caption shown below the portrait photo.",
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "Our working members include Alex, Gabby, Jalin, and Jason",
  },
  {
    key: "coop.about.founding-text",
    label: "Founding Text",
    description:
      "Paragraph about the cooperative's founding, below the portrait.",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Building Cooperatively was conceived through a core group of students in a 2018 Living Trades Academy program Taught by the Historical Preservation Network.",
  },
  {
    key: "coop.about.cooperative-text",
    label: "Cooperative Structure Text",
    description: "Short closing line, directly below the founding text.",
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "We are a membership based Worker-Owner Co-op",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const coopAboutData: TemplateField[] = [...aboutMainData];

export const coopAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.main",
    title: "About Content",
    description:
      "The page's two intro paragraphs, centered statement, portrait photo + caption, and founding/structure text — one uninterrupted content flow, no separate hero.",
    icon: "📖",
    columns: 2,
  },
];

export const coopAboutSections: TemplateSection[] = [
  {
    id: "about.main",
    page: "about",
    title: "About Content",
    description:
      "Two intro paragraphs, a centered statement, the portrait photo with caption, and the founding/structure text",
    groupIds: ["about.main"],
    order: 0,
    hideable: false,
  },
];
