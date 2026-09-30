import { TEMPLATES } from "~/lib/constants";

// Runtime-QA business subdomain; gets every registered template, not just the
// ones manually opted in below.
export const DEMO_SUBDOMAIN = "demo";

const AVAILABLE_FREE_TEMPLATES = [
  {
    value: "modern",
    label: "Modern",
  },
  {
    value: "default",
    label: "Default",
  },
  {
    value: "elegant",
    label: "Elegant",
  },
] as const;

const COMMERCIAL_TEMPLATE_OWNERSHIP = {
  bamboo: {
    label: "Bamboo",
    subdomains: ["finallyresults"],
  },
  "happy-bamboo": {
    label: "Happy Bamboo",
    subdomains: ["zaires"],
  },
  pollen: {
    label: "Pollen",
    subdomains: ["dpc"],
  },
  "dark-trend": {
    label: "Dark Trend",
    subdomains: ["trendanomaly"],
  },
  noise: {
    label: "Noise",
    subdomains: ["visualnoise", "visual-noise"],
  },
  builders: {
    label: "Builders",
    subdomains: ["buildingcooperatively", "detroit-coop"],
  },
  // Exact replica of buildingcooperatively.com (short-lived demo of their
  // existing site; ideally they migrate to `builders`).
  coop: {
    label: "Coop",
    subdomains: ["buildingcooperatively"],
  },
  sledge: {
    label: "Sledge",
    subdomains: ["judysledge"],
  },
  vii: {
    label: "Skinbar VII",
    subdomains: ["skinbar-vii"],
  },
  // PinkArt LLC — Evelyn Pinkard, Detroit fiber artist.
  pink: {
    label: "PinkArt",
    subdomains: ["pinkart"],
  },
  // 1:1 recreation of handyrelocations.com (Detroit moving company).
  relocation: {
    label: "Handy Relocations",
    subdomains: ["handyrelocations"],
  },
  // 1:1 recreation of detroitcommunitywealth.org (Detroit Community Wealth
  // Fund nonprofit).
  wealth: {
    label: "Detroit Community Wealth Fund",
    subdomains: ["detroitcommunitywealth"],
  },
  // Olive Mode — Detroit women's boutique.
  olive: {
    label: "Olive Mode",
    subdomains: ["olivemode"],
  },
  // Dream Your Theme — event decor / rentals / draping (Selest).
  dream: {
    label: "Dream Your Theme",
    subdomains: ["dreamyourtheme"],
  },
  // Unique Monique Scented Candles — handmade candles / soaps / body care /
  // home care (Detroit).
  umsc: {
    label: "Unique Monique",
    subdomains: ["uniquemonique"],
  },
};

const TEMPLATE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    AVAILABLE_FREE_TEMPLATES.map((t) => [t.value, t.label]),
  ),
  ...Object.fromEntries(
    Object.entries(COMMERCIAL_TEMPLATE_OWNERSHIP).map(([value, info]) => [
      value,
      info.label,
    ]),
  ),
};

/**
 * Human-readable label for a template id (e.g. "modern" → "Modern",
 * "happy-bamboo" → "Happy Bamboo"). Falls back to title-casing the id for
 * unknown/placeholder templates.
 */
export const getTemplateLabel = (templateId: string): string => {
  const known = TEMPLATE_LABELS[templateId];
  if (known) return known;
  return templateId
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// List all subdomains associated with commercial templates
export const getCommercialTemplateSubdomains = (): string[] => {
  return Object.values(COMMERCIAL_TEMPLATE_OWNERSHIP).flatMap(
    (info) => info.subdomains,
  );
};

// Template ids that are free / generic and may be offered to any business
// (e.g. in onboarding and the public marketing showcase). Excludes every
// client-owned commercial template.
export const getFreeTemplateIds = (): string[] =>
  AVAILABLE_FREE_TEMPLATES.map((t) => t.value);

// Every registered template (including ones with no ownership entry, e.g.
// `animated-bamboo`), for the demo subdomain's unrestricted access.
const getAllTemplates = (): { value: string; label: string }[] =>
  TEMPLATES.map((t) => ({ value: t.id, label: t.name }));

// Whether a given business (identified by its subdomain) is allowed to use a
// template. Free templates are always allowed; commercial templates only for
// their owning subdomain; the demo subdomain gets every template. Mirrors
// getAvailableTemplates (all allowed in dev).
export const isTemplateAvailableForSubdomain = (
  templateId: string,
  subdomain: string,
): boolean =>
  getAvailableTemplates(subdomain).some((t) => t.value === templateId);

export const getAvailableTemplates = (
  subdomain: string,
): { value: string; label: string }[] => {
  // The demo (runtime-QA) business gets every registered template.
  if (subdomain === DEMO_SUBDOMAIN) {
    return getAllTemplates();
  }
  // In development, show all templates
  if (process.env.NODE_ENV === "development") {
    return [
      ...AVAILABLE_FREE_TEMPLATES,
      ...Object.entries(COMMERCIAL_TEMPLATE_OWNERSHIP).map(([value, info]) => ({
        value,
        label: info.label,
      })),
    ];
  }
  // In production, restrict commercial templates by subdomain
  return [
    ...AVAILABLE_FREE_TEMPLATES,
    ...Object.entries(COMMERCIAL_TEMPLATE_OWNERSHIP)
      .filter(([_, info]) => info.subdomains.includes(subdomain))
      .map(([value, info]) => ({
        value,
        label: info.label,
      })),
  ];
};
