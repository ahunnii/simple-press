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
  sledge: {
    label: "Sledge",
    subdomains: ["judysledge"],
  },
  vii: {
    label: "Skinbar VII",
    subdomains: ["skinbarvii"],
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
