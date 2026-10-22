"use client";

import type { FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import type { useNewsletterSignup } from "~/hooks/use-newsletter-signup";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { NewsletterConsentNote } from "~/app/(storefront)/_components/newsletter/newsletter-consent-note";
import { NewsletterHoneypot } from "~/app/(storefront)/_components/newsletter/newsletter-honeypot";

type Props = {
  /** The section's `useNewsletterSignup` state — one instance per band. */
  newsletter: ReturnType<typeof useNewsletterSignup>;
  /** Unique per instance; prefixes the input, status and heading ids. */
  idPrefix: string;
  /** Id of the band's heading, named by the form's `aria-labelledby`. */
  headingId?: string;
  /** The submit's accessible name ("Join"). Never printed — the arrow is. */
  buttonLabel: string;
  buttonLabelField?: string;
  /** Store privacy policy path; falls back to the platform policy. */
  privacyHref?: string;
};

/**
 * The Inner Circle form — an ivory email box with a square espresso arrow
 * submit attached flush to its right edge (52px tall, as on the board),
 * printed on the espresso band (or a scrimmed photograph).
 *
 * Real double opt-in through the shared `useNewsletterSignup` hook: success
 * means "we sent a confirmation email", so the copy says "Check your inbox",
 * never "You're subscribed". reCAPTCHA is warmed on first focus, not on
 * mount. Errors and the confirmation land in a persistent `aria-live`
 * region, and the field points at it while it holds an error.
 *
 * Never put this inside a reveal: a form that is still `visibility`-hidden
 * mid-transition can have its submit cancelled by the browser.
 */
export function OliveNewsletterForm({
  newsletter,
  idPrefix,
  headingId,
  buttonLabel,
  buttonLabelField,
  privacyHref,
}: Props) {
  const emailId = `${idPrefix}-email`;
  const statusId = `${idPrefix}-status`;
  const submitting = newsletter.isSubmitting;
  const hasError = newsletter.status === "error" && !!newsletter.error;
  const label = buttonLabel.trim() || "Join";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const value = new FormData(event.currentTarget).get("email");
    const email = typeof value === "string" ? value.trim() : "";
    if (!email) return;
    void newsletter.submit({ email });
  };

  return (
    <div className="olive-newsletter-form-wrap">
      {newsletter.isSuccess ? null : (
        <form
          onSubmit={handleSubmit}
          aria-labelledby={headingId}
          aria-label={headingId ? undefined : "Email sign-up"}
          aria-busy={submitting}
          className="olive-newsletter-form"
        >
          <NewsletterHoneypot inputRef={newsletter.honeypotRef} />
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="Your email address"
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? statusId : undefined}
            onFocus={newsletter.warmCaptcha}
            onChange={newsletter.warmCaptcha}
            className="olive-newsletter-input"
          />
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting || undefined}
            className="olive-newsletter-submit"
          >
            <span
              className="sr-only"
              {...(buttonLabelField ? fieldAttr(buttonLabelField) : {})}
            >
              {label}
            </span>
            {submitting ? (
              <span
                aria-hidden="true"
                className="olive-newsletter-spinner animate-spin motion-reduce:animate-none"
              />
            ) : (
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
            )}
          </button>
        </form>
      )}

      {/* Persistent live region: it exists before the text changes so screen
          readers announce both the confirmation and any error. */}
      <div id={statusId} aria-live="polite" className="olive-newsletter-status">
        {newsletter.isSuccess ? (
          <p className="olive-h3">Check your inbox to confirm.</p>
        ) : hasError ? (
          <p className="olive-newsletter-error">{newsletter.error}</p>
        ) : null}
      </div>

      <NewsletterConsentNote
        className="olive-newsletter-consent"
        privacyHref={privacyHref}
        showRecaptcha
      />
    </div>
  );
}
