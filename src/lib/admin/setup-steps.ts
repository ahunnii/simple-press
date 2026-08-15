// ─────────────────────────────────────────────────────────────────────────────
// Store setup checklist — the five onboarding steps
// ─────────────────────────────────────────────────────────────────────────────
//
// Single source of truth for the onboarding checklist that /admin/welcome
// renders in full and the dashboard renders as a one-line "Finish setting up"
// card. Both used to compute this inline, including a verbatim copy of the
// `isStorefrontCustomized` predicate.
//
// Pure — takes already-fetched rows, does no querying of its own.

import type { ChecklistItem, ChecklistSummary } from "./checklist";

import { summarizeChecklist } from "./checklist";

export type SetupTaskKey =
  | "businessCreated"
  | "stripeConnected"
  | "domainConfigured"
  | "firstProductAdded"
  | "storefrontCustomized";

/**
 * Named `SetupTask`, not `SetupStep`: `admin/welcome/_components/setup-step.tsx`
 * already exports a React component called `SetupStep`.
 */
export type SetupTask = ChecklistItem & { key: SetupTaskKey };

export type SetupProgress = {
  completed: number;
  total: number;
  nextStep: { label: string; href: string } | null;
};

export type SetupStatus = ChecklistSummary & {
  isComplete: boolean;
  /**
   * `null` once every step is done — preserving the exact `setupProgress` prop
   * contract `DashboardContent` already expects (it renders the card only when
   * this is non-null).
   */
  progress: SetupProgress | null;
};

export type SiteContentForSetup = {
  logoUrl: string | null;
  customFields: unknown;
};

/**
 * Has the owner made the storefront theirs? True when a logo is set OR any
 * custom template field has been saved.
 *
 * Moved here verbatim from `admin/welcome/page.tsx` and `admin/dashboard/page.tsx`,
 * which each carried an identical copy.
 */
export function isStorefrontCustomized(
  siteContent: SiteContentForSetup | null | undefined,
): boolean {
  const customFields = siteContent?.customFields;

  return (
    Boolean(siteContent?.logoUrl) ||
    (customFields !== null &&
      customFields !== undefined &&
      typeof customFields === "object" &&
      !Array.isArray(customFields) &&
      Object.keys(customFields as Record<string, unknown>).length > 0)
  );
}

export type SetupStatusInput = {
  stripeAccountId: string | null;
  /**
   * Deliberately the raw `customDomain`, not `domainStatus` — this is what both
   * call sites checked before the extraction, so switching to
   * `domainStatus === "ACTIVE"` here would change the onboarding number. The
   * SEO scorecard uses the stricter check instead.
   */
  customDomain: string | null;
  productCount: number;
  siteContent: SiteContentForSetup | null | undefined;
};

export function computeSetupStatus(input: SetupStatusInput): SetupStatus {
  const tasks: SetupTask[] = [
    {
      key: "businessCreated",
      label: "Store created",
      href: "/admin/welcome",
      score: 1,
    },
    {
      key: "stripeConnected",
      label: "Connect payment processing",
      href: "/admin/welcome",
      score: input.stripeAccountId ? 1 : 0,
    },
    {
      key: "domainConfigured",
      label: "Connect a custom domain",
      href: "/admin/welcome",
      score: input.customDomain ? 1 : 0,
    },
    {
      key: "firstProductAdded",
      label: "Add your first product",
      href: "/admin/products/new",
      score: input.productCount > 0 ? 1 : 0,
    },
    {
      key: "storefrontCustomized",
      label: "Customize your storefront",
      href: "/editor",
      score: isStorefrontCustomized(input.siteContent) ? 1 : 0,
    },
  ];

  const summary = summarizeChecklist(tasks);
  const isComplete = summary.completed === summary.total;

  return {
    ...summary,
    isComplete,
    progress: isComplete
      ? null
      : {
          completed: summary.completed,
          total: summary.total,
          nextStep: summary.next
            ? { label: summary.next.label, href: summary.next.href }
            : null,
        },
  };
}
