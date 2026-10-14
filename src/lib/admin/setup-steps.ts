// ─────────────────────────────────────────────────────────────────────────────
// Store setup checklist — completion rules for each setup step
// ─────────────────────────────────────────────────────────────────────────────
//
// Single source of truth for the onboarding checklist that /admin/welcome
// renders in full, the dashboard renders as a one-line "Finish setting up"
// card, and `/admin` + the sidebar nudge use as the setup gate. Which steps a
// store sees (and at what level) comes from its plan in `setup-plan.ts`; this
// module decides whether each visible step is done.
//
// Pure — takes already-fetched facts, does no querying of its own. The
// server-side loader is `setup-status.server.ts`.

import type { ChecklistItem, ChecklistSummary } from "./checklist";
import type {
  BusinessTypeId,
  ResolvedSetupPlan,
  SetupStepKey,
} from "./setup-plan";

import { summarizeChecklist } from "./checklist";
import { SETUP_STEP_CATALOG } from "./setup-plan";

export type SetupTaskKey = "businessCreated" | SetupStepKey;

/** A visible step's level — "off" steps are never visible. */
export type SetupTaskLevel = "required" | "optional";

/**
 * Named `SetupTask`, not `SetupStep`: `admin/welcome/_components/setup-step.tsx`
 * already exports a React component called `SetupStep`.
 */
export type SetupTask = ChecklistItem & {
  key: SetupTaskKey;
  level: SetupTaskLevel;
  /** The owner can check this step off by hand ("Mark as done"). */
  confirmable: boolean;
  /** The owner HAS checked it off (always false for non-confirmable steps). */
  confirmed: boolean;
};

export type SetupProgress = {
  completed: number;
  total: number;
  nextStep: { label: string; href: string } | null;
};

export type SetupStatus = Omit<ChecklistSummary, "items" | "next"> & {
  items: SetupTask[];
  next: SetupTask | null;
  /** `null` = legacy store (the original 5-step checklist). */
  businessType: BusinessTypeId | null;
  /** Every visible step is done — required AND optional. */
  isComplete: boolean;
  /**
   * Every visible REQUIRED step is done. This is the setup gate: it decides
   * whether `/admin` opens the dashboard or the Setup Guide, and hides the
   * sidebar's "Almost there!" nudge.
   */
  requiredComplete: boolean;
  /** Visible required steps still to do. */
  requiredRemaining: number;
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

/** Everything the completion rules read, already fetched. */
export type SetupFacts = {
  stripeAccountId: string | null;
  /**
   * Deliberately the raw `customDomain`, not `domainStatus` — this is what the
   * checklist has always checked, so switching to `domainStatus === "ACTIVE"`
   * here would change the onboarding number. The SEO scorecard uses the
   * stricter check instead.
   */
  customDomain: string | null;
  productCount: number;
  serviceCount: number;
  stripeAutoTaxEnabled: boolean;
  /** Schema default is "free" — anything else means the owner set shipping up. */
  shippingType: string;
  offersInStorePickup: boolean;
  venmoHandle: string | null;
  cashAppHandle: string | null;
  phoneNumber: string | null;
  supportEmail: string | null;
  addressStreet: string | null;
  /** Terms of Service + Refund Policy published and non-empty (`policies-live.ts`). */
  policiesLive: boolean;
  siteContent: SiteContentForSetup | null | undefined;
};

/**
 * Has the owner made the storefront theirs? True when a logo is set OR any
 * custom template field has been saved.
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

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

/** Owner-facing label + link for each step. */
const STEP_COPY: Record<SetupTaskKey, { label: string; href: string }> = {
  businessCreated: { label: "Store created", href: "/admin/welcome" },
  domainConfigured: {
    label: "Connect a custom domain",
    href: "/admin/welcome",
  },
  stripeConnected: {
    label: "Connect payment processing",
    href: "/admin/welcome",
  },
  firstProductAdded: {
    label: "Add your first product",
    href: "/admin/products/new",
  },
  salesTax: {
    label: "Set up sales tax",
    href: "/admin/settings/integrations",
  },
  shippingPickup: {
    label: "Set up shipping or pickup",
    href: "/admin/settings/shipping",
  },
  firstServiceAdded: {
    label: "Add your first service",
    href: "/admin/services/new",
  },
  donationsSetup: {
    label: "Set up donations",
    href: "/admin/settings/donations",
  },
  contactInfo: {
    label: "Add your contact info",
    href: "/admin/settings/general",
  },
  policiesLive: {
    label: "Publish your store policies",
    href: "/admin/content/policies",
  },
  storefrontCustomized: {
    label: "Customize your storefront",
    href: "/editor",
  },
};

/** Is the step done on the facts alone (ignoring a manual confirmation)? */
function isStepDone(key: SetupStepKey, facts: SetupFacts): boolean {
  switch (key) {
    case "domainConfigured":
      return Boolean(facts.customDomain);
    case "stripeConnected":
      return Boolean(facts.stripeAccountId);
    case "firstProductAdded":
      return facts.productCount > 0;
    case "salesTax":
      return facts.stripeAutoTaxEnabled;
    case "shippingPickup":
      return facts.shippingType !== "free" || facts.offersInStorePickup;
    case "firstServiceAdded":
      return facts.serviceCount > 0;
    case "donationsSetup":
      return (
        Boolean(facts.stripeAccountId) ||
        hasText(facts.venmoHandle) ||
        hasText(facts.cashAppHandle)
      );
    case "contactInfo":
      return (
        hasText(facts.phoneNumber) ||
        hasText(facts.supportEmail) ||
        hasText(facts.addressStreet)
      );
    case "policiesLive":
      return facts.policiesLive;
    case "storefrontCustomized":
      return isStorefrontCustomized(facts.siteContent);
  }
}

/**
 * Required steps are suggested first by `summarizeChecklist`'s `next`. Not used
 * for the progress percent (see `computeSetupStatus`).
 */
const LEVEL_WEIGHT: Record<SetupTaskLevel, number> = {
  required: 2,
  optional: 1,
};

export type SetupStatusInput = {
  plan: ResolvedSetupPlan;
  /** Effective flag check (`resolveFlags(...).isEnabled`). */
  isFeatureEnabled: (key: string) => boolean;
  facts: SetupFacts;
  /** `parseSetupConfirmations(business.setupConfirmations)`. */
  confirmations: Partial<Record<SetupStepKey, string>>;
};

export function computeSetupStatus(input: SetupStatusInput): SetupStatus {
  const { plan, isFeatureEnabled, facts, confirmations } = input;

  // Always done, always first — every checklist opens with a tick.
  const tasks: SetupTask[] = [
    {
      key: "businessCreated",
      ...STEP_COPY.businessCreated,
      score: 1,
      weight: LEVEL_WEIGHT.optional,
      level: "optional",
      confirmable: false,
      confirmed: false,
    },
  ];

  for (const meta of SETUP_STEP_CATALOG) {
    const level = plan.steps[meta.key];
    if (level === "off") continue;
    // A step whose feature is off is hidden whatever its level, so a later
    // flag change can never strand the owner on a step that doesn't apply.
    if (meta.feature && !isFeatureEnabled(meta.feature)) continue;

    const confirmable = meta.confirmable === true;
    const confirmed = confirmable && Boolean(confirmations[meta.key]);

    tasks.push({
      key: meta.key,
      ...STEP_COPY[meta.key],
      score: confirmed || isStepDone(meta.key, facts) ? 1 : 0,
      weight: LEVEL_WEIGHT[level],
      level,
      confirmable,
      confirmed,
    });
  }

  const summary = summarizeChecklist(tasks);
  const isComplete = summary.completed === summary.total;
  // Unweighted, so the bar always agrees with "N of M steps" beside it. The
  // weights only steer which step `next` suggests.
  const percent =
    summary.total === 0
      ? 100
      : Math.round((summary.completed / summary.total) * 100);
  const requiredRemaining = tasks.filter(
    (t) => t.level === "required" && t.score !== 1,
  ).length;
  // `summary.next` is one of `tasks` — look it back up to keep the wider type.
  const next = summary.next
    ? (tasks.find((t) => t.key === summary.next?.key) ?? null)
    : null;

  return {
    ...summary,
    percent,
    items: tasks,
    next,
    businessType: plan.businessType,
    isComplete,
    requiredComplete: requiredRemaining === 0,
    requiredRemaining,
    progress: isComplete
      ? null
      : {
          completed: summary.completed,
          total: summary.total,
          nextStep: next ? { label: next.label, href: next.href } : null,
        },
  };
}
