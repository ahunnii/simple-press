import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

/**
 * Services index (`/services`) fields for noise — parity finding PF13
 * (package TP5, docs/templates/noise/parity-plan-2026-09-28.md).
 *
 * Group ids follow the `"<page>.<group>"` convention (never prefixed with
 * the template id) so field group, `sections.ts` entry and the rendered
 * `data-sp-group` triple-match.
 *
 * The page reads them through `resolveServicesFields` (this module's own
 * field map), so defaults and "blank hides" behave the same whether or not
 * the root `index.ts` has spread `noiseServicesData` in yet — the spread is
 * what gives the fields a panel in noise's editor.
 *
 * The page component is NOT re-exported here (circular-import guard): the
 * registry imports `NoiseServicesIndexPage` from its own file.
 */

/** Defaults, shared with the page's blank-value fallbacks. */
export const SERVICES_COPY = {
  heroOverline: "By appointment",
  heroHeading: "Services",
  heroIntro:
    "Time with us, one on one. Pick a service to see what it covers and book a slot.",
  cardLinkLabel: "See details",
  emptyHeading: "Nothing on the books yet.",
  emptyBody:
    "Services are being set up. Check back soon, or get in touch in the meantime.",
  ctaOverline: "Not sure what to book?",
  ctaHeading: "Tell us what you need.",
  ctaBody: "Send a note and we'll point you to the right appointment.",
  ctaButtonLabel: "Get in touch",
  ctaButtonLink: "/contact",
} as const;

// ─── services.hero ──────────────────────────────────────────────────────────
// Not hideable — it carries the page's only h1.

const servicesHeroData: TemplateField[] = [
  {
    key: "noise.services.hero-overline",
    label: "Small label",
    description:
      "Small label above the heading on the services page. Leave blank to hide.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: SERVICES_COPY.heroOverline,
    placeholder: "e.g. Book a visit",
  },
  {
    key: "noise.services.hero-heading",
    label: "Heading",
    description: "Page title at the top of the services page.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: SERVICES_COPY.heroHeading,
    placeholder: "e.g. Fittings",
  },
  {
    key: "noise.services.hero-intro",
    label: "Intro text",
    description:
      "One short paragraph under the page title. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: SERVICES_COPY.heroIntro,
    placeholder: "One or two sentences about what you offer",
  },
];

// ─── services.list ──────────────────────────────────────────────────────────
// Not hideable — the page's main content (the services come from Admin).

const servicesListData: TemplateField[] = [
  {
    key: "noise.services.card-link-label",
    label: "Card link text",
    description:
      "Small link at the bottom of every service card. Leave blank to hide.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: SERVICES_COPY.cardLinkLabel,
    placeholder: "e.g. Learn more",
  },
  {
    key: "noise.services.empty-heading",
    label: "Empty state heading",
    description: "Shown in place of the cards while no services are published.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: SERVICES_COPY.emptyHeading,
    placeholder: "e.g. Appointments open soon",
  },
  {
    key: "noise.services.empty-body",
    label: "Empty state message",
    description: "Line under the empty-state heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-full",
    defaultValue: SERVICES_COPY.emptyBody,
    placeholder: "One short sentence",
  },
];

// ─── services.cta ───────────────────────────────────────────────────────────
// Hideable closing band.

const servicesCtaData: TemplateField[] = [
  {
    key: "noise.services.cta-overline",
    label: "Small label",
    description:
      "Small label above the closing heading at the bottom of the page. Leave blank to hide.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: SERVICES_COPY.ctaOverline,
    placeholder: "e.g. Questions first?",
  },
  {
    key: "noise.services.cta-heading",
    label: "Heading",
    description: "Heading of the closing band at the bottom of the page.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: SERVICES_COPY.ctaHeading,
    placeholder: "e.g. Ask us anything",
  },
  {
    key: "noise.services.cta-body",
    label: "Body text",
    description: "One line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: SERVICES_COPY.ctaBody,
    placeholder: "One short sentence",
  },
  {
    key: "noise.services.cta-button-label",
    label: "Button label",
    description: "Text on the closing band's button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: SERVICES_COPY.ctaButtonLabel,
    placeholder: "e.g. Send a note",
  },
  {
    key: "noise.services.cta-button-link",
    label: "Button link",
    description:
      "Where the closing band's button goes, e.g. /contact. Leave blank to hide the button.",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: SERVICES_COPY.ctaButtonLink,
    placeholder: "/contact",
  },
];

// ─── Aggregated exports ─────────────────────────────────────────────────────

export const noiseServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesListData,
  ...servicesCtaData,
];

export const noiseServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Page header",
    description: "Small label, title and intro text at the top of the page.",
    icon: "✂️",
    columns: 2,
  },
  {
    id: "services.list",
    title: "Services",
    description:
      "Card link text and the empty state shown while no services are published.",
    icon: "🗓️",
    columns: 2,
  },
  {
    id: "services.cta",
    title: "Closing banner",
    description:
      "Small label, heading, line and button in the band at the bottom of the page.",
    icon: "💬",
    columns: 2,
  },
];

export const noiseServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Page header",
    description: "Small label, title and intro text",
    groupIds: ["services.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.list",
    page: "services",
    title: "Services",
    description: "A card for every published service, or the empty state",
    groupIds: ["services.list"],
    order: 1,
    hideable: false,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing banner",
    description: "Closing band beneath the services",
    groupIds: ["services.cta"],
    order: 2,
    hideable: true,
  },
];

const _servicesFieldMap = new Map(noiseServicesData.map((f) => [f.key, f]));

/** `resolveFields` over the services index fields only (see header). */
export function resolveServicesFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _servicesFieldMap);
}
