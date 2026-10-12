// ─────────────────────────────────────────────────────────────────────────────
// Required store policies — are the Terms of Service and Refund Policy live?
// ─────────────────────────────────────────────────────────────────────────────
//
// Shared by the dashboard's "missing policies" nudge and the `policiesLive`
// setup step, so both read the same two pages the same way. Mirrors the "no
// live policies" check on /admin/content/policies (`missingRequiredPolicies`
// in policies-manager.tsx), which runs client-side on its own data.
//
// Pure — callers fetch the rows with `REQUIRED_POLICY_PAGES_WHERE`.

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { isContentEmpty } from "~/lib/template-fields";

/** The two documents checkout references ("you agree to this store's Terms"). */
export const REQUIRED_POLICY_SLUGS = [
  "terms-of-service",
  "refund-policy",
] as const;

/**
 * Prisma `where` for the required policy pages (spread alongside
 * `businessId`). Deliberately NOT filtered on `published`, so the check below
 * can tell "never written" apart from "written, not published".
 */
export const REQUIRED_POLICY_PAGES_WHERE = {
  type: "policy",
  slug: { in: [...REQUIRED_POLICY_SLUGS] },
};

export const REQUIRED_POLICY_PAGES_SELECT = {
  slug: true,
  published: true,
  content: true,
} as const;

export type RequiredPolicyPage = {
  slug: string;
  published: boolean;
  content: unknown;
};

/**
 * True when BOTH required policy pages exist, are published, and have
 * non-empty content.
 */
export function areRequiredPoliciesLive(pages: RequiredPolicyPage[]): boolean {
  return REQUIRED_POLICY_SLUGS.every((slug) =>
    pages.some(
      (p) =>
        p.slug === slug &&
        p.published &&
        !isContentEmpty(p.content as TiptapJSON),
    ),
  );
}
