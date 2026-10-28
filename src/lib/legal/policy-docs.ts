import type { PolicyBundle } from "~/lib/legal/material-updates";

/**
 * Which public policy pages sit behind each acceptance bundle, for the places
 * that have to NAME them: the admin "policy update" banner, the notice email
 * and the platform-hub send panel.
 *
 * Mirrors the bundle definitions in `~/lib/legal/policy-versions`:
 * `merchant` = Seller & Merchant Agreement + Acceptable Use Policy,
 * `platform` = Terms of Service + Privacy Policy. A `MaterialPolicyUpdate`
 * records bundles, not individual pages, so the notice names every page in an
 * affected bundle and links the owner to each; the update's `summary` says what
 * actually changed. Pure and client-safe.
 */
export type PolicyDoc = {
  /** Path segment under `/platform/policies/`. */
  slug: string;
  label: string;
};

export const POLICY_DOCS: Record<PolicyBundle, readonly PolicyDoc[]> = {
  merchant: [
    { slug: "seller-merchant", label: "Seller & Merchant Agreement" },
    { slug: "acceptable-use", label: "Acceptable Use Policy" },
  ],
  platform: [
    { slug: "terms-of-service", label: "Terms of Service" },
    { slug: "privacy-policy", label: "Privacy Policy" },
  ],
};

/** Every policy page touched by `documents`, in registry order, de-duplicated. */
export function policyDocsFor(
  documents: readonly PolicyBundle[],
): readonly PolicyDoc[] {
  const seen = new Set<string>();
  const docs: PolicyDoc[] = [];
  for (const bundle of documents) {
    for (const doc of POLICY_DOCS[bundle]) {
      if (seen.has(doc.slug)) continue;
      seen.add(doc.slug);
      docs.push(doc);
    }
  }
  return docs;
}

/** `["A", "B", "C"]` → `"A, B, and C"`; two → `"A and B"`. */
export function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/** e.g. `"Seller & Merchant Agreement and Acceptable Use Policy"`. */
export function describePolicyDocs(documents: readonly PolicyBundle[]): string {
  return joinLabels(policyDocsFor(documents).map((doc) => doc.label));
}

/**
 * Absolute origin of the platform site (where the policies live). `https` except
 * for a `localhost` dev domain. Pass `NEXT_PUBLIC_PLATFORM_DOMAIN`.
 */
export function platformOrigin(platformDomain: string): string {
  const domain = platformDomain.trim();
  if (!domain) return "";
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(domain);
  return `${local ? "http" : "https"}://${domain}`;
}

/** Absolute URL of one policy page, or a site-relative path when no domain is known. */
export function policyUrl(platformDomain: string, slug: string): string {
  return `${platformOrigin(platformDomain)}/platform/policies/${slug}`;
}
