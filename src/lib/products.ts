export function parseCardAdditionalFields(raw: unknown): {
  comingSoon?: boolean;
  productTagline?: string;
  additionalInformation?: unknown;
  productFeatures?: Array<{ icon: string; text: string }>;
} {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  return {
    comingSoon:
      typeof obj.comingSoon === "boolean" ? obj.comingSoon : undefined,
    productTagline:
      typeof obj.productTagline === "string" ? obj.productTagline : undefined,

    productFeatures:
      typeof obj.productFeatures === "object" &&
      Array.isArray(obj.productFeatures)
        ? obj.productFeatures
        : undefined,

    additionalInformation:
      typeof obj.additionalInformation === "object"
        ? obj.additionalInformation
        : undefined,
  };
}
