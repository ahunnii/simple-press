import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Field / group / section module for the `wealth` template's Donate page —
 * DCWF's "Support DCWF" page rebuilt on the platform's donations flow (the
 * live Squarespace site used a Donorbox iframe, replaced entirely here).
 *
 * FUNCTIONALITY mirrors `pink/donate/index.ts` exactly: same four
 * `donate.<group>` ids (`header`, `form`, `thank-you`, `other-ways`), same
 * `SECTION_LINKS.donations` link on `other-ways`, same hideable shape. The
 * CONTENT shape is wealth's own per design.md's "Donate (Support DCWF)"
 * section concepts:
 *   - `donate.header` splits pink's single intro paragraph into a mono
 *     eyebrow + two verbatim body paragraphs (the real DCWF copy), because
 *     the live page's 2-col hero has room for both and design.md calls for
 *     them verbatim.
 *   - `donate.form` keeps pink's `form-heading` field verbatim.
 *   - `donate.impact` is a wealth-only fifth group (design.md's addition,
 *     no pink equivalent) — italic H2 + body + optional image.
 *
 * 2026-10-12 redesign (pass 2): the header becomes a split hero (optional
 * `hero-image`, else a full-width forest panel). `header-body-2` and
 * `form-heading` now sit beside the donation form in the "Give" block.
 */

// ── donate.header ────────────────────────────────────────────────────────────

const donateHeaderData: TemplateField[] = [
  {
    key: "wealth.donate.hero-image",
    label: "Hero Photo",
    description:
      "Optional photo beside the page heading (forest-tinted). Leave blank for a full-width green heading panel.",
    type: "image",
    page: "donate",
    group: "donate.header",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "wealth.donate.hero-image-alt",
    label: "Hero Photo Alt Text",
    description:
      "Describe the hero photo for screen readers. Leave blank if the photo is purely decorative.",
    type: "text",
    page: "donate",
    group: "donate.header",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "Neighbors gathered at a cooperative's grand opening",
  },
  {
    key: "wealth.donate.header-heading",
    label: "Header Heading",
    description:
      "Page h1 in the hero. Leave blank to use the page title derived from the donation label (Donate / Leave a Tip / Support Us) set in Donation settings.",
    type: "text",
    page: "donate",
    group: "donate.header",
    gridColumn: "col-span-full",
    defaultValue: "Support worker-ownership in and around metro Detroit.",
    placeholder: "Support worker-ownership in and around metro Detroit.",
  },
  {
    key: "wealth.donate.header-eyebrow",
    label: "Header Eyebrow",
    description: "Mono overline above the page heading.",
    type: "text",
    page: "donate",
    group: "donate.header",
    gridColumn: "col-span-full",
    defaultValue: "Donate to Detroit Community Wealth Fund.",
    placeholder: "Donate to Detroit Community Wealth Fund.",
  },
  {
    key: "wealth.donate.header-body-1",
    label: "Header Body — Paragraph 1",
    description: "Intro paragraph under the heading, in the hero.",
    type: "textarea",
    page: "donate",
    group: "donate.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Donating to Detroit Community Wealth Fund helps us support and finance cooperative enterprises. Your donation goes directly towards educational workshops, trainings, public programming, co-op game nights, and providing technical assistance and loan development to cooperatives.",
    placeholder:
      "Donating to Detroit Community Wealth Fund helps us support and finance cooperative enterprises.",
  },
  {
    key: "wealth.donate.header-body-2",
    label: "Header Body — Paragraph 2",
    description:
      "Second paragraph, shown beside the donation form (above the form heading).",
    type: "textarea",
    page: "donate",
    group: "donate.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Detroit Community Wealth Fund is a 501c3 non-profit. We rely on donors, grants, and professional contracts to support our work. Please consider making a one time, or a monthly donation today.",
    placeholder:
      "Detroit Community Wealth Fund is a 501c3 non-profit. We rely on donors, grants, and professional contracts to support our work.",
  },
];

// ── donate.form ──────────────────────────────────────────────────────────────

const donateFormData: TemplateField[] = [
  {
    key: "wealth.donate.form-heading",
    label: "Form Heading",
    description:
      "Italic heading beside the amount picker / checkout form (it appears under the second paragraph). Only shown while the donation form is.",
    type: "text",
    page: "donate",
    group: "donate.form",
    gridColumn: "col-span-full",
    defaultValue: "Choose an amount",
    placeholder: "Choose an amount",
  },
];

// ── donate.thank-you ─────────────────────────────────────────────────────────

const donateThankYouData: TemplateField[] = [
  {
    key: "wealth.donate.thank-you-heading",
    label: "Thank-You Heading",
    description: "Heading shown after a successful donation (?status=success).",
    type: "text",
    page: "donate",
    group: "donate.thank-you",
    defaultValue: "Thank you for supporting worker-ownership.",
    placeholder: "Thank you for supporting worker-ownership.",
  },
  {
    key: "wealth.donate.thank-you-body",
    label: "Thank-You Body",
    description: "Supporting copy shown below the thank-you heading.",
    type: "textarea",
    page: "donate",
    group: "donate.thank-you",
    gridColumn: "col-span-full",
    defaultValue:
      "Your gift helps fund educational workshops, public programming, and technical assistance and loan development for Detroit's cooperative enterprises.",
    placeholder:
      "Your gift helps fund educational workshops, public programming, and technical assistance and loan development for Detroit's cooperative enterprises.",
  },
];

// ── donate.other-ways ────────────────────────────────────────────────────────

const donateOtherWaysData: TemplateField[] = [
  {
    key: "wealth.donate.other-ways-heading",
    label: "Other Ways to Give Heading",
    description:
      "Heading above the Venmo / Cash App cards. The section only appears when a handle is set in Donation settings.",
    type: "text",
    page: "donate",
    group: "donate.other-ways",
    defaultValue: "Other ways to give",
    placeholder: "Other ways to give",
  },
];

// ── donate.impact (wealth addition — no pink equivalent) ─────────────────────

const donateImpactData: TemplateField[] = [
  {
    key: "wealth.donate.impact-heading",
    label: "Impact Heading",
    description: "Italic heading on the impact card.",
    type: "text",
    page: "donate",
    group: "donate.impact",
    gridColumn: "col-span-full",
    defaultValue: "What your gift makes possible",
    placeholder: "What your gift makes possible",
  },
  {
    key: "wealth.donate.impact-body",
    label: "Impact Body",
    description: "Paragraph describing what donations fund.",
    type: "textarea",
    page: "donate",
    group: "donate.impact",
    gridColumn: "col-span-full",
    defaultValue:
      "Free technical assistance, educational programming and resources for emerging and existing democratically owned businesses in Detroit — supporting Black business ownership, community wealth building, and community economic control.",
    placeholder:
      "Free technical assistance, educational programming and resources for emerging and existing democratically owned businesses in Detroit.",
  },
  {
    key: "wealth.donate.impact-image",
    label: "Impact Image",
    description:
      "Optional photo behind the impact card (forest-tinted). Leave blank to hide the photo only — the heading and body still render.",
    type: "image",
    page: "donate",
    group: "donate.impact",
    gridColumn: "col-span-1",
    defaultValue: "/templates/wealth/images/event-band.jpg",
  },
  {
    key: "wealth.donate.impact-image-alt",
    label: "Impact Image Alt Text",
    description: "Accessible description of the impact image.",
    type: "text",
    page: "donate",
    group: "donate.impact",
    gridColumn: "col-span-1",
    defaultValue:
      "Community members gathered at a Detroit Community Wealth Fund event",
    placeholder:
      "Community members gathered at a Detroit Community Wealth Fund event",
  },
];

// ── Aggregated export ────────────────────────────────────────────────────────

export const wealthDonateData: TemplateField[] = [
  ...donateHeaderData,
  ...donateFormData,
  ...donateThankYouData,
  ...donateOtherWaysData,
  ...donateImpactData,
];

export const wealthDonateFieldGroups: TemplateFieldGroup[] = [
  {
    id: "donate.header",
    title: "Donate — Header",
    description:
      "Hero: optional photo, eyebrow, page heading, intro paragraph, plus the second paragraph beside the form.",
    icon: "💝",
    columns: 2,
  },
  {
    id: "donate.form",
    title: "Donate — Form",
    description: "Heading beside the amount picker / checkout form.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "donate.thank-you",
    title: "Donate — Thank You",
    description: "Copy shown after a successful donation.",
    icon: "🙏",
    columns: 2,
  },
  {
    id: "donate.other-ways",
    title: "Donate — Other Ways to Give",
    description: "Heading for the Venmo/Cash App section.",
    icon: "🤝",
    columns: 2,
  },
  {
    id: "donate.impact",
    title: "Donate — Impact",
    description:
      "What your gift makes possible: heading, body, optional photo.",
    icon: "🌱",
    columns: 2,
  },
];

export const wealthDonateSections: TemplateSection[] = [
  {
    id: "donate.header",
    page: "donate",
    title: "Header",
    description:
      "Hero (optional photo, eyebrow, heading, intro) and the second paragraph beside the form.",
    groupIds: ["donate.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "donate.form",
    page: "donate",
    title: "Form",
    description:
      "Heading beside the amount picker / Stripe Checkout form — shown once Stripe payments are connected and charges-enabled.",
    groupIds: ["donate.form"],
    order: 2,
    hideable: false,
  },
  {
    id: "donate.impact",
    page: "donate",
    title: "Impact",
    description:
      "What your gift makes possible — heading, body, optional photo.",
    groupIds: ["donate.impact"],
    order: 3,
    hideable: true,
  },
  {
    id: "donate.thank-you",
    page: "donate",
    title: "Thank You",
    description:
      "Green panel under the hero, shown after a successful donation.",
    groupIds: ["donate.thank-you"],
    order: 1,
    hideable: false,
  },
  {
    id: "donate.other-ways",
    page: "donate",
    title: "Other Ways to Give",
    description:
      "Venmo / Cash App cards — shown when a handle is set in Donation settings.",
    groupIds: ["donate.other-ways"],
    order: 4,
    hideable: true,
    links: [SECTION_LINKS.donations],
  },
];
