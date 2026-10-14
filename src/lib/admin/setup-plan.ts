// ─────────────────────────────────────────────────────────────────────────────
// Setup plan — which onboarding steps a store sees, by business type
// ─────────────────────────────────────────────────────────────────────────────
//
// The platform admin picks a business type when creating a store. The type
// pre-fills (a) each setup step's level — required / optional / off — saved to
// `Business.setupSteps`, and (b) a set of feature-flag overrides written to
// `Business.featureFlags`. Both stay editable per store.
//
// `businessType === null` is a legacy store (created before types existed): it
// keeps the original 5-step checklist so live stores are never pushed back
// into setup by this change.
//
// Client-safe and pure — the create dialog, the hub card, and the owner
// checklist all read it. Completion rules live in `setup-steps.ts`.

export const BUSINESS_TYPE_IDS = [
  "products",
  "services",
  "informational",
  "donations",
] as const;

export type BusinessTypeId = (typeof BUSINESS_TYPE_IDS)[number];

export const SETUP_STEP_KEYS = [
  "domainConfigured",
  "stripeConnected",
  "firstProductAdded",
  "salesTax",
  "shippingPickup",
  "firstServiceAdded",
  "donationsSetup",
  "contactInfo",
  "policiesLive",
  "storefrontCustomized",
] as const;

export type SetupStepKey = (typeof SETUP_STEP_KEYS)[number];

export const SETUP_STEP_LEVELS = ["required", "optional", "off"] as const;

export type SetupStepLevel = (typeof SETUP_STEP_LEVELS)[number];

export type SetupSteps = Record<SetupStepKey, SetupStepLevel>;

export type SetupStepMeta = {
  key: SetupStepKey;
  /** Short label for the platform hub (dialog + card). */
  label: string;
  /**
   * Feature flag the step belongs to. When that flag is effectively off, the
   * step is hidden regardless of its level, so later flag changes can never
   * strand an owner on a step that no longer applies.
   */
  feature?: string;
  /** Owner can check this step off by hand ("Mark as done"). */
  confirmable?: boolean;
};

/** Catalog order = the order steps render in. */
export const SETUP_STEP_CATALOG: readonly SetupStepMeta[] = [
  { key: "domainConfigured", label: "Connect a custom domain" },
  { key: "stripeConnected", label: "Connect Stripe" },
  {
    key: "firstProductAdded",
    label: "Add a first product",
    feature: "products",
  },
  {
    key: "salesTax",
    label: "Set up sales tax",
    feature: "products",
    confirmable: true,
  },
  {
    key: "shippingPickup",
    label: "Set up shipping or pickup",
    feature: "products",
    confirmable: true,
  },
  {
    key: "firstServiceAdded",
    label: "Add a first service",
    feature: "services",
  },
  {
    key: "donationsSetup",
    label: "Set up donations",
    feature: "donations",
  },
  { key: "contactInfo", label: "Add contact info" },
  { key: "policiesLive", label: "Publish store policies" },
  { key: "storefrontCustomized", label: "Customize the storefront" },
];

export const CONFIRMABLE_SETUP_STEPS: readonly SetupStepKey[] =
  SETUP_STEP_CATALOG.filter((s) => s.confirmable).map((s) => s.key);

export function getSetupStepMeta(key: SetupStepKey): SetupStepMeta {
  // Every key is in the catalog — the `!` documents that invariant.
  return SETUP_STEP_CATALOG.find((s) => s.key === key)!;
}

export const BUSINESS_TYPES: Record<
  BusinessTypeId,
  { label: string; description: string }
> = {
  products: {
    label: "Sells products",
    description:
      "Online store: Stripe, products, sales tax, shipping or pickup.",
  },
  services: {
    label: "Services",
    description:
      "Service business: services list and contact info. Stripe optional.",
  },
  informational: {
    label: "Informational",
    description: "Brochure site: domain, contact info, and branding.",
  },
  donations: {
    label: "Donations / nonprofit",
    description: "Accepts donations through Stripe or Venmo/Cash App links.",
  },
};

const R = "required";
const O = "optional";
const X = "off";

export const SETUP_PRESETS: Record<BusinessTypeId, SetupSteps> = {
  products: {
    domainConfigured: R,
    stripeConnected: R,
    firstProductAdded: R,
    salesTax: R,
    shippingPickup: R,
    firstServiceAdded: X,
    donationsSetup: X,
    contactInfo: O,
    policiesLive: O,
    storefrontCustomized: O,
  },
  services: {
    domainConfigured: R,
    stripeConnected: O,
    firstProductAdded: X,
    salesTax: X,
    shippingPickup: X,
    firstServiceAdded: R,
    donationsSetup: X,
    contactInfo: R,
    policiesLive: O,
    storefrontCustomized: O,
  },
  informational: {
    domainConfigured: R,
    stripeConnected: X,
    firstProductAdded: X,
    salesTax: X,
    shippingPickup: X,
    firstServiceAdded: X,
    donationsSetup: X,
    contactInfo: R,
    policiesLive: X,
    storefrontCustomized: O,
  },
  donations: {
    domainConfigured: R,
    stripeConnected: O,
    firstProductAdded: X,
    salesTax: X,
    shippingPickup: X,
    firstServiceAdded: X,
    donationsSetup: R,
    contactInfo: O,
    policiesLive: O,
    storefrontCustomized: O,
  },
};

/**
 * The checklist every store had before business types existed: Stripe, domain
 * and a first product gate setup; customizing is a nudge. (The legacy
 * `isSetupGateComplete` rule, plus the old "Customize" row.)
 */
export const LEGACY_SETUP_STEPS: SetupSteps = {
  domainConfigured: R,
  stripeConnected: R,
  firstProductAdded: R,
  salesTax: X,
  shippingPickup: X,
  firstServiceAdded: X,
  donationsSetup: X,
  contactInfo: X,
  policiesLive: X,
  storefrontCustomized: O,
};

/**
 * Feature-flag overrides each type writes to `Business.featureFlags`, layered
 * over registry defaults (at creation, and from the hub's "apply this type's
 * feature defaults"). Every type sets ALL THREE type-defining flags
 * explicitly, so re-typing a store also undoes the previous type's flags —
 * a partial preset (e.g. products = {}) would leave a services store's
 * `products: false` in place. Turning `products` off cascades orders / cart /
 * checkout / payments off through the registry's `dependsOn`.
 */
export const FEATURE_PRESETS: Record<
  BusinessTypeId,
  Record<string, boolean>
> = {
  products: { products: true, services: false, donations: false },
  services: { products: false, services: true, donations: false },
  informational: { products: false, services: false, donations: false },
  donations: { products: false, services: false, donations: true },
};

/**
 * The flags surfaced in the create dialog's "Features" list — the ones a
 * business type plausibly changes. Everything else stays on the business
 * page's full feature editor.
 */
export const TYPE_RELEVANT_FEATURES = [
  "products",
  "services",
  "donations",
  "events",
  "invoices",
  "forms",
] as const;

export function isBusinessTypeId(value: unknown): value is BusinessTypeId {
  return (
    typeof value === "string" &&
    (BUSINESS_TYPE_IDS as readonly string[]).includes(value)
  );
}

/**
 * Normalize a stored `setupSteps` Json value. Unknown keys are dropped and
 * missing / invalid keys fall back to `fallback`, so a partial or stale map
 * can never produce an undefined level.
 */
export function parseSetupSteps(
  stored: unknown,
  fallback: SetupSteps,
): SetupSteps {
  const raw =
    typeof stored === "object" && stored !== null && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  const out = { ...fallback };
  for (const key of SETUP_STEP_KEYS) {
    const level = raw[key];
    if (
      typeof level === "string" &&
      (SETUP_STEP_LEVELS as readonly string[]).includes(level)
    ) {
      out[key] = level as SetupStepLevel;
    }
  }
  return out;
}

export type ResolvedSetupPlan = {
  /** `null` = legacy store. */
  businessType: BusinessTypeId | null;
  steps: SetupSteps;
};

/**
 * A store's effective plan. Legacy (`businessType` null or unrecognized) →
 * `LEGACY_SETUP_STEPS`. A typed store uses its saved `setupSteps`, falling back
 * to the type's preset for any key the saved map lacks.
 */
export function resolveSetupPlan(business: {
  businessType: string | null;
  setupSteps: unknown;
}): ResolvedSetupPlan {
  if (!isBusinessTypeId(business.businessType)) {
    return { businessType: null, steps: LEGACY_SETUP_STEPS };
  }
  return {
    businessType: business.businessType,
    steps: parseSetupSteps(
      business.setupSteps,
      SETUP_PRESETS[business.businessType],
    ),
  };
}

/** Normalize `Business.setupConfirmations` to `{ [step]: ISO date }`. */
export function parseSetupConfirmations(
  stored: unknown,
): Partial<Record<SetupStepKey, string>> {
  const raw =
    typeof stored === "object" && stored !== null && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  const out: Partial<Record<SetupStepKey, string>> = {};
  for (const key of CONFIRMABLE_SETUP_STEPS) {
    const value = raw[key];
    if (typeof value === "string" && value) out[key] = value;
  }
  return out;
}
