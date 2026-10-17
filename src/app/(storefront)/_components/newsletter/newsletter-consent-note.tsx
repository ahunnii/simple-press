import Link from "next/link";

import { NEWSLETTER_CONSENT_WORDING } from "~/lib/marketing/consent-wording";
import { cn } from "~/lib/utils";
import { RecaptchaDisclosure } from "~/components/inputs/recaptcha-field";

type Props = {
  className?: string;
  /**
   * Store privacy policy path (`/<slug>`) when the store has published one.
   * Falls back to the platform policy, the same route the footers use.
   */
  privacyHref?: string;
  /**
   * Render Google's reCAPTCHA attribution under the consent line. The badge is
   * hidden platform-wide, so any form that mints a token must show this; pass
   * it only when the form can actually submit.
   */
  showRecaptcha?: boolean;
};

const PLATFORM_PRIVACY_HREF = "/platform/policies/privacy-policy";

/**
 * Consent line under a newsletter sign-up: what happens next, plus a link to
 * the privacy policy. Text inherits color from the template (no color set
 * here), so `className` controls size, spacing and opacity per template. The
 * reCAPTCHA disclosure reuses the same `className` and inherits color/size.
 */
export function NewsletterConsentNote({
  className,
  privacyHref,
  showRecaptcha,
}: Props) {
  return (
    <>
      <p className={cn("text-sm", className)}>
        {NEWSLETTER_CONSENT_WORDING}{" "}
        <Link href={privacyHref ?? PLATFORM_PRIVACY_HREF} className="underline">
          Privacy policy
        </Link>
      </p>
      {showRecaptcha ? (
        <RecaptchaDisclosure inheritStyle className={className} />
      ) : null}
    </>
  );
}
