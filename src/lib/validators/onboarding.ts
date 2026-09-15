import { z } from "zod";

import { getFreeTemplateIds } from "~/lib/template-ownership";

// Only the generic templates the wizard actually offers (see
// template-selection-step.tsx). An arbitrary string here would let a
// request/draft pin a store to a client-owned commercial template — this is
// the same list `src/app/api/onboarding/draft/route.ts` (Wave A) already
// enforces; `/api/onboarding` gets it for free by sharing this module.
export const FREE_TEMPLATE_IDS = getFreeTemplateIds() as [string, ...string[]];

/**
 * The onboarding wizard's "Brand Color" field pairs a native `<input
 * type="color">` (always emits a lowercase 6-digit hex, e.g. "#3b82f6") with a
 * free-text `<input type="text">` bound to the SAME state
 * (store-customization-step.tsx) — so despite the common case being hex, the
 * value that actually reaches the server can be arbitrary text: a named color
 * ("steelblue"), a CSS color function ("rgb(59, 130, 246)", "oklch(0.84 0.04
 * 72)"), or something adversarial. `SiteContent.primaryColor` is rendered
 * back out as a CSS value (inline styles / custom properties) across every
 * template's cart & checkout pages, so a plain hex-only schema would reject
 * legitimate values the wizard can genuinely send. Instead: allow anything
 * that contains none of the characters that matter for breaking out of a CSS
 * value or attribute (`;{}<>(`), and for the one case that legitimately needs
 * a `(` — a CSS color function — require the ENTIRE value to match a strict
 * allowlisted-function pattern whose argument charset itself excludes those
 * same dangerous characters.
 */
const CSS_COLOR_DANGEROUS_CHARS = /[;{}<>()]/;
const CSS_COLOR_FUNCTION_PATTERN =
  /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([a-z0-9.%,+\-/\s]*\)$/i;

function isSafeCssColorValue(value: string): boolean {
  if (!CSS_COLOR_DANGEROUS_CHARS.test(value)) return true;
  return CSS_COLOR_FUNCTION_PATTERN.test(value);
}

export const primaryColorSchema = z
  .string()
  .trim()
  .max(32)
  .refine(isSafeCssColorValue, {
    message:
      "Enter a valid color (hex, a named color, or rgb()/hsl()/oklch()).",
  });

// Unwrapped so both the draft schema (`.optional()`) and the request schema
// (`.nullish()` — the main route's body type allows `| null`) can apply their
// own modifier without double-wrapping the same schema.
const invitationCodeSchema = z.string().max(200);
const aftokenSchema = z.string().max(500);

/**
 * Per-field schemas shared by both onboarding endpoints. Caps mirror the
 * columns/wizard inputs these values eventually feed (subdomain 63 and
 * customDomain 253 are the DNS label/name maxima `/api/onboarding`
 * re-validates against) — identical to the draft route's schema so a draft
 * saved under one set of limits is never rejected by the other route's
 * assumptions.
 */
export const onboardingFields = {
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(120),
  businessName: z.string().trim().min(1).max(120),
  subdomain: z.string().trim().min(1).max(63),
  customDomain: z.string().trim().max(253).optional(),
  templateId: z.enum(FREE_TEMPLATE_IDS),
  heroTitle: z.string().max(200).optional(),
  heroSubtitle: z.string().max(500).optional(),
  aboutText: z.string().max(5000).optional(),
  primaryColor: primaryColorSchema.optional(),
  invitationCode: invitationCodeSchema.optional(),
  aftoken: aftokenSchema.optional(),
};

/**
 * Draft body accepted by `POST /api/onboarding/draft` — saved BEFORE signup
 * (no session exists yet), so every field is length-capped and `templateId`
 * is enum-restricted; an uncapped/unchecked blob here would be an
 * unauthenticated write of arbitrary size/content into `Verification.value`.
 */
export const onboardingDraftSchema = z.object({
  ...onboardingFields,
  acceptedTerms: z.literal(true),
});

/**
 * Body accepted by `POST /api/onboarding`. Models the route's previous raw
 * cast faithfully:
 *  - `resumeFromDraft: true` is the ONLY other shape the real callers ever
 *    send (see `signup-continue-client.tsx`) — when present, every other
 *    field is optional because the route replaces `formData` wholesale with
 *    the already-validated draft. A plain `z.object` + `superRefine` is used
 *    instead of `z.discriminatedUnion` because the non-resume branch has NO
 *    `resumeFromDraft` key at all (undefined, not a literal `false`), which
 *    `discriminatedUnion` can't key off of.
 *  - `password` and `acceptedTerms` are deliberately left OUT of the
 *    superRefine's required-field list: the route's own existing checks
 *    already produce specific, wizard-rendered messages for those
 *    ("Missing required fields" / the terms-acceptance message) — promoting
 *    their absence to a schema failure here would collapse those into a
 *    generic "Invalid request" and change what the wizard displays.
 *    `acceptedTerms` also stays untyped (`z.unknown()`, not
 *    `z.literal(true)`) for the same reason: the route's own
 *    `acceptedTerms !== true` check must remain the thing that fires.
 *  - `invitationCode`/`aftoken` are `.nullish()` (the previous cast typed
 *    them `string | null`); every other optional field only ever saw
 *    `string | undefined`.
 */
export const onboardingRequestSchema = z
  .object({
    resumeFromDraft: z.literal(true).optional(),
    email: onboardingFields.email.optional(),
    password: z.string().max(256).optional(),
    name: onboardingFields.name.optional(),
    businessName: onboardingFields.businessName.optional(),
    subdomain: onboardingFields.subdomain.optional(),
    customDomain: onboardingFields.customDomain,
    templateId: onboardingFields.templateId.optional(),
    heroTitle: onboardingFields.heroTitle,
    heroSubtitle: onboardingFields.heroSubtitle,
    aboutText: onboardingFields.aboutText,
    primaryColor: onboardingFields.primaryColor,
    invitationCode: invitationCodeSchema.nullish(),
    aftoken: aftokenSchema.nullish(),
    acceptedTerms: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    // Draft resume: every other field is optional — `formData` gets replaced
    // wholesale by the already-validated draft further down the route.
    if (data.resumeFromDraft === true) return;

    const requiredFields = [
      "email",
      "name",
      "businessName",
      "subdomain",
      "templateId",
    ] as const;
    for (const field of requiredFields) {
      if (data[field] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} is required`,
          path: [field],
        });
      }
    }
  });

export type OnboardingRequestBody = z.infer<typeof onboardingRequestSchema>;
