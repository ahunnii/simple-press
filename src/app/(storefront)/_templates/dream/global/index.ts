import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

import { DREAM_QUOTE_HREF } from "../shared/dream-quote-href";

/**
 * `dream`'s global (chrome + auth) field declarations — the single source for
 * both the editor registry (spread by the root `../index.ts`) and the chrome
 * resolver (`../lib/resolve-fields.ts`). Imports no page modules so the chrome
 * (header/footer/layout/maintenance) can read it without pulling in, or
 * cycling through, the whole template registry.
 *
 * Email, phone and hours come from Settings, the footer tagline and social
 * links from Content → Branding, and the announcement bar from Content →
 * Announcements — none of them are template fields (the old
 * `dream.global.announcement-*` / `footer-tagline` / `contact-*` keys were
 * retired 2026-09-26 and are only read as a silent legacy fallback).
 */

// ─── Global: Branding (header CTA + footer) ──────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "dream.global.header-cta-label",
    label: "Header button label",
    description:
      'Label for the outlined pill button in the header and mobile menu (e.g. "Estimate Quote").',
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.global.header-cta-url",
    label: "Header button link",
    description: "Where the header button links to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
  },
  {
    key: "dream.global.footer-signoff",
    label: "Footer sign-off",
    description:
      "Short line in the footer's brand column, before the script-styled words that follow it.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Your dreams become",
  },
  {
    key: "dream.global.footer-signoff-accent",
    label: "Footer highlighted words",
    description:
      'Script-styled words that follow the footer sign-off line (e.g. "a theme."). Leave blank to hide.',
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "a theme.",
  },
  {
    key: "dream.global.service-area",
    label: "Service area",
    description:
      "Short line in the footer describing where the business serves clients. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Serving the metro area and beyond.",
  },
];

// ─── Global: Authentication (sign-in / sign-up screens, Default fallback) ────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "dream.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown behind the sign-in and sign-up panel.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dream.global.logo-size-width",
    label: "Logo width (px)",
    description: "Width of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 24,
    max: 400,
    unit: "px",
  },
  {
    key: "dream.global.logo-size-height",
    label: "Logo height (px)",
    description: "Height of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 24,
    max: 400,
    unit: "px",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const dreamGlobalData: TemplateField[] = [
  ...globalBrandingData,
  ...globalAuthenticationData,
];

export const dreamGlobalFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.branding",
    title: "Header and footer",
    description:
      "Header button, footer sign-off, and service area — shown on every page. Email, phone, and hours come from Settings; the footer tagline and social links from Content → Branding; the announcement bar from Content → Announcements; nav links from Content → Navigation.",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Image and logo size on the sign-in and sign-up screens.",
    icon: "🔐",
    columns: 2,
  },
];
