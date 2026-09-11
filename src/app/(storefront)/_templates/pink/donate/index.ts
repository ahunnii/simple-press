import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Field / group / section module for the `pink` template's Donate page —
 * the pilot styled override for the Donations/Tips feature (every other
 * template still inherits `DefaultDonatePage` via the registry fallback).
 *
 * Mirrors `default/donate/index.ts` (hero → `donate.header`, thank-you,
 * other-ways — same `hideable`/`links` shape, see `default/sections.ts`)
 * plus one addition — `donate.form-heading` — following the pink convention
 * of giving the interactive-form section its own heading field (see
 * `contact.form-heading` in `../contact/index.ts`).
 */

// ── donate.header ────────────────────────────────────────────────────────────

const donateHeaderData: TemplateField[] = [
  {
    key: "pink.donate.header-heading",
    label: "Header Heading",
    description:
      "Main heading for the Donate page. Leave blank to use the page title derived from the donation label (Donate / Leave a Tip / Support Us) set in Donation settings.",
    type: "text",
    page: "donate",
    group: "donate.header",
    gridColumn: "col-span-full",
    placeholder: "Donate",
  },
  {
    key: "pink.donate.header-intro",
    label: "Header Intro",
    description: "Short paragraph below the heading.",
    type: "textarea",
    page: "donate",
    group: "donate.header",
    gridColumn: "col-span-full",
    defaultValue: "Every contribution helps us keep doing what we love.",
    placeholder: "Every contribution helps us keep doing what we love.",
  },
];

// ── donate.thank-you ─────────────────────────────────────────────────────────

const donateThankYouData: TemplateField[] = [
  {
    key: "pink.donate.thank-you-heading",
    label: "Thank-You Heading",
    description: "Heading shown after a successful donation (?status=success).",
    type: "text",
    page: "donate",
    group: "donate.thank-you",
    defaultValue: "Thank you for your support!",
    placeholder: "Thank you for your support!",
  },
  {
    key: "pink.donate.thank-you-body",
    label: "Thank-You Body",
    description: "Supporting copy shown below the thank-you heading.",
    type: "textarea",
    page: "donate",
    group: "donate.thank-you",
    gridColumn: "col-span-full",
    defaultValue: "Your gift has been received and means the world to us.",
    placeholder: "Your gift has been received and means the world to us.",
  },
];

// ── donate.form ──────────────────────────────────────────────────────────────

const donateFormData: TemplateField[] = [
  {
    key: "pink.donate.form-heading",
    label: "Form Heading",
    description: "Heading above the amount picker / checkout form.",
    type: "text",
    page: "donate",
    group: "donate.form",
    gridColumn: "col-span-full",
    defaultValue: "Choose an amount",
    placeholder: "Choose an amount",
  },
];

// ── donate.other-ways ────────────────────────────────────────────────────────

const donateOtherWaysData: TemplateField[] = [
  {
    key: "pink.donate.other-ways-heading",
    label: "Other Ways to Give Heading",
    description: "Heading for the Venmo/Cash App section.",
    type: "text",
    page: "donate",
    group: "donate.other-ways",
    defaultValue: "Other ways to give",
    placeholder: "Other ways to give",
  },
];

// ── Aggregated export ────────────────────────────────────────────────────────

export const pinkDonateData: TemplateField[] = [
  ...donateHeaderData,
  ...donateThankYouData,
  ...donateFormData,
  ...donateOtherWaysData,
];

export const pinkDonateFieldGroups: TemplateFieldGroup[] = [
  {
    id: "donate.header",
    title: "Donate — Header",
    description: "Page heading and intro.",
    icon: "💝",
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
    id: "donate.form",
    title: "Donate — Form",
    description: "Heading above the amount picker / checkout form.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "donate.other-ways",
    title: "Donate — Other Ways to Give",
    description: "Heading for the Venmo/Cash App section.",
    icon: "🤝",
    columns: 2,
  },
];

export const pinkDonateSections: TemplateSection[] = [
  {
    id: "donate.header",
    page: "donate",
    title: "Header",
    description: "Page heading and intro.",
    groupIds: ["donate.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "donate.thank-you",
    page: "donate",
    title: "Thank You",
    description: "Copy shown after a successful donation.",
    groupIds: ["donate.thank-you"],
    order: 1,
    hideable: false,
  },
  {
    id: "donate.form",
    page: "donate",
    title: "Form",
    description:
      "Heading above the amount picker / Stripe Checkout form — shown once Stripe payments are connected and charges-enabled.",
    groupIds: ["donate.form"],
    order: 2,
    hideable: false,
  },
  {
    id: "donate.other-ways",
    page: "donate",
    title: "Other Ways to Give",
    description: "Heading for the Venmo/Cash App section",
    groupIds: ["donate.other-ways"],
    order: 3,
    hideable: true,
    links: [SECTION_LINKS.donations],
  },
];
