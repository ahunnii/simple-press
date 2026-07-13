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
  // existing site; ideally they migrate to `builders`). "demo" is included so
  // runtime QA can switch the demo business to this template.
  coop: {
    label: "Coop",
    subdomains: ["buildingcooperatively", "demo"],
  },
  sledge: {
    label: "Sledge",
    subdomains: ["judysledge"],
  },
  vii: {
    label: "Skinbar VII",
    subdomains: ["skinbar-vii", "demo"],
  },
  // Throwaway sp-new-template skill test template — safe to delete.
  testkit: {
    label: "Testkit",
    subdomains: ["testkit"],
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

// Whether a given business (identified by its subdomain) is allowed to use a
// template. Free templates are always allowed; commercial templates only for
// their owning subdomain. Mirrors getAvailableTemplates (all allowed in dev).
export const isTemplateAvailableForSubdomain = (
  templateId: string,
  subdomain: string,
): boolean =>
  getAvailableTemplates(subdomain).some((t) => t.value === templateId);

export const getAvailableTemplates = (subdomain: string) => {
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
