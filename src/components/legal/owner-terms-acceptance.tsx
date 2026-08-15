"use client";

import { Checkbox } from "~/components/ui/checkbox";

/**
 * The acceptance checkbox shown on the two owner-facing paths that create a
 * store: the `/platform/signup` wizard and `/platform/claim/[code]`.
 *
 * Two shapes, because the two relationships are separate:
 *
 * - `includePlatformTerms` — the platform Terms of Service + Privacy Policy,
 *   which attach to the ACCOUNT. Shown only where the account itself is being
 *   created (or where an existing account has no recorded acceptance yet, i.e.
 *   `User.termsAcceptedAt` is null). Never shown to someone whose acceptance is
 *   already on file, so we never re-record what they already agreed to.
 * - Seller & Merchant Agreement + Acceptable Use Policy — always shown, because
 *   these attach to the STORE (`BusinessMembership`) and are agreed per store.
 *
 * The checkbox is deliberately NOT `required`: Radix's `CheckboxPrimitive.Root`
 * renders its own hidden bubble input, so a native `required` throws the browser
 * validation balloon and can only be intercepted with a capture-phase `invalid`
 * listener (see `src/components/auth/additional-field.tsx`). Callers validate on
 * submit instead and pass `error` back in. Either way the checkbox is only ever
 * a UI affordance — the binding check is server-side in `/api/onboarding` and
 * `/api/claim`.
 */
export type OwnerTermsAcceptanceProps = {
  /** DOM id for the checkbox; must be unique on the page. */
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Also cover the platform Terms of Service + Privacy Policy (account terms). */
  includePlatformTerms: boolean;
  disabled?: boolean;
  /** Inline error, rendered under the label when the caller blocks submit. */
  error?: string | null;
  /**
   * Platform domain used to build absolute policy URLs. Defaults to
   * `NEXT_PUBLIC_PLATFORM_DOMAIN` — the policies live on the platform domain
   * and must resolve from a subdomain or custom domain too.
   */
  platformDomain?: string;
};

export function OwnerTermsAcceptance({
  id = "owner-terms-acceptance",
  checked,
  onCheckedChange,
  includePlatformTerms,
  disabled,
  error,
  platformDomain,
}: OwnerTermsAcceptanceProps) {
  const domain =
    platformDomain ?? process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "";
  const baseUrl = domain ? `https://${domain}` : "";

  const policyLink = (slug: string, label: string) => (
    <a
      href={`${baseUrl}/platform/policies/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-2 hover:no-underline"
    >
      {label}
    </a>
  );

  const errorId = `${id}-error`;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <label htmlFor={id} className="block text-sm leading-relaxed">
            {includePlatformTerms ? (
              <>
                I agree to the SimplePress{" "}
                {policyLink("terms-of-service", "Terms of Service")} and{" "}
                {policyLink("privacy-policy", "Privacy Policy")}, and, as the
                owner of this store, to the{" "}
                {policyLink("seller-merchant", "Seller & Merchant Agreement")}{" "}
                and {policyLink("acceptable-use", "Acceptable Use Policy")}.
              </>
            ) : (
              <>
                As the owner of this store, I agree to the SimplePress{" "}
                {policyLink("seller-merchant", "Seller & Merchant Agreement")}{" "}
                and {policyLink("acceptable-use", "Acceptable Use Policy")}.
              </>
            )}
          </label>
          {error ? (
            <p id={errorId} className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
