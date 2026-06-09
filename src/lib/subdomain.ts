import { isSubdomainReserved, slugify } from "~/lib/utils";

/**
 * Client-only: resolves the first available subdomain for a business name
 * (same rules as /api/signup/check-subdomain).
 */
export async function findFirstAvailableSubdomain(
  businessName: string,
): Promise<string> {
  let base = slugify(businessName);
  if (!base) base = "store";
  if (base.length < 3) {
    base = (base + "xxx").slice(0, 3);
  }

  for (let i = 0; i < 200; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (candidate.length < 3) continue;

    if (isSubdomainReserved(candidate)) continue;

    const response = await fetch(
      `/api/signup/check-subdomain?subdomain=${encodeURIComponent(candidate)}`,
    );
    const data = (await response.json()) as { available?: boolean };

    if (data.available === true) {
      return candidate;
    }
  }

  throw new Error("Could not find an available subdomain");
}
