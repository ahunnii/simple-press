"use client";

import type { FormEvent, ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useNewsletterSignup } from "~/hooks/use-newsletter-signup";
import { NewsletterConsentNote } from "~/app/(storefront)/_components/newsletter/newsletter-consent-note";
import { NewsletterHoneypot } from "~/app/(storefront)/_components/newsletter/newsletter-honeypot";

import { GloveButton } from "./glove-button";
import { GloveInput } from "./glove-input";

export type GloveNewsletterFormProps = {
  /**
   * Where the form sits.
   * - `footer`: in the white footer's contact column (heading matches the
   *   other footer column headings).
   * - `band`: on the homepage mist band.
   */
  variant: "footer" | "band";
  /**
   * Unique per instance: the band and the footer both render on the homepage,
   * so ids (label, status, heading) must not collide.
   */
  idPrefix: string;
  /** Store privacy policy path; falls back to the platform policy. */
  privacyHref?: string;
  /** Optional heading rendered above the form (the band supplies its own). */
  heading?: ReactNode;
  /** Optional line under the heading. */
  body?: ReactNode;
  /** Submit button label. Default "Subscribe". */
  buttonLabel?: string;
  /** Template field key behind `buttonLabel`, for visual-editor click-to-edit. */
  buttonLabelField?: string;
};

/**
 * Real newsletter sign-up for the glove template (double opt-in).
 *
 * Renders nothing when email marketing is off for the store: no fake success
 * and no "coming soon" (the glove brief forbids pretending to subscribe
 * anyone). Success means "we sent a confirmation email", so the copy says
 * "Check your inbox", never "You're subscribed".
 *
 * reCAPTCHA is warmed on first focus of the email field, not on mount, so the
 * footer instance does not load Google's script on every page view.
 */
export function GloveNewsletterForm({
  variant,
  idPrefix,
  privacyHref,
  heading,
  body,
  buttonLabel = "Subscribe",
  buttonLabelField,
}: GloveNewsletterFormProps) {
  const newsletter = useNewsletterSignup({ warm: "interaction" });

  if (!newsletter.enabled || newsletter.status === "disabled") return null;

  const inFooter = variant === "footer";
  const emailId = `${idPrefix}-email`;
  const statusId = `${idPrefix}-status`;
  const headingId = `${idPrefix}-heading`;
  const submitting = newsletter.isSubmitting;
  const hasError = newsletter.status === "error" && !!newsletter.error;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const value = new FormData(e.currentTarget).get("email");
    const email = typeof value === "string" ? value.trim() : "";
    if (!email) return;
    void newsletter.submit({ email });
  };

  return (
    <div className="glove-newsletter">
      {heading ? (
        <h2
          id={headingId}
          className={
            inFooter
              ? "glove-footer-heading"
              : "glove-display text-[18px] leading-[1.3] font-semibold text-[var(--glove-primary)]"
          }
        >
          {heading}
        </h2>
      ) : null}
      {body ? (
        <p
          className={cn(
            "glove-body max-w-[44ch] leading-[1.6] text-[var(--glove-text)]",
            inFooter ? "mt-5 text-[14px]" : "mt-2 text-[15px]",
          )}
        >
          {body}
        </p>
      ) : null}

      {newsletter.isSuccess ? null : (
        <form
          onSubmit={handleSubmit}
          aria-labelledby={heading ? headingId : undefined}
          aria-label={heading ? undefined : "Newsletter sign-up"}
          aria-busy={submitting}
          className={cn(
            "relative flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-end",
            (!!heading || !!body) && "mt-4",
          )}
        >
          <NewsletterHoneypot inputRef={newsletter.honeypotRef} />
          <div className="min-w-0 flex-1">
            <label
              htmlFor={emailId}
              className="glove-body mb-1.5 block text-[14px] leading-[1.4] font-medium text-[var(--glove-ink)]"
            >
              Email address
            </label>
            <GloveInput
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              aria-describedby={hasError ? statusId : undefined}
              onFocus={newsletter.warmCaptcha}
              onChange={newsletter.warmCaptcha}
            />
          </div>
          <GloveButton
            type="submit"
            size="md"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              "Sending…"
            ) : buttonLabelField ? (
              <span {...fieldAttr(buttonLabelField)}>{buttonLabel}</span>
            ) : (
              buttonLabel
            )}
          </GloveButton>
        </form>
      )}

      {/* Persistent live region: it exists before the text changes so screen
          readers announce both the confirmation and any error. */}
      <div id={statusId} aria-live="polite" className="glove-body">
        {newsletter.isSuccess ? (
          <p className="mt-4 text-[16px] leading-[1.5] font-medium text-[var(--glove-ink)]">
            Check your inbox to confirm your subscription.
          </p>
        ) : hasError ? (
          <p className="mt-3 text-[14px] leading-[1.5] text-[var(--glove-alert)]">
            {newsletter.error}
          </p>
        ) : null}
      </div>

      <NewsletterConsentNote
        className="glove-body mt-3 text-[13px] leading-[1.5] text-[var(--glove-muted)]"
        privacyHref={privacyHref}
        showRecaptcha
      />
    </div>
  );
}
