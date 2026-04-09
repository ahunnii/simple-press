export function parseCardAdditionalFields(raw: unknown): {
  comingSoon?: boolean;
  productTagline?: string;
} {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  return {
    comingSoon:
      typeof obj.comingSoon === "boolean" ? obj.comingSoon : undefined,
    productTagline:
      typeof obj.productTagline === "string" ? obj.productTagline : undefined,
  };
}
