import Link from "next/link";

import { NEWSLETTER_CONSENT_WORDING } from "~/lib/marketing/consent-wording";
import { cn } from "~/lib/utils";

type Props = {
  className?: string;
  /**
   * Store privacy policy path (`/<slug>`) when the store has published one.
   * Falls back to the platform policy, the same route the footers use.
   */
  privacyHref?: string;
};

const PLATFORM_PRIVACY_HREF = "/platform/policies/privacy-policy";

/**
 * Consent line under a newsletter sign-up: what happens next, plus a link to
 * the privacy policy. Text inherits color from the template (no color set
 * here), so `className` controls size, spacing and opacity per template.
 */
export function NewsletterConsentNote({ className, privacyHref }: Props) {
  return (
    <p className={cn("text-sm", className)}>
      {NEWSLETTER_CONSENT_WORDING}{" "}
      <Link href={privacyHref ?? PLATFORM_PRIVACY_HREF} className="underline">
        Privacy policy
      </Link>
    </p>
  );
}
