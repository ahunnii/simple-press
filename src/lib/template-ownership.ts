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
