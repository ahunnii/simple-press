"use client";

import { useState } from "react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useNewsletterSignup } from "~/hooks/use-newsletter-signup";
import { NewsletterHoneypot } from "~/app/(storefront)/_components/newsletter/newsletter-honeypot";
import { NewsletterConsentNote } from "~/app/(storefront)/_components/newsletter/newsletter-consent-note";

import { WealthInput } from "../shared/wealth-input";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";

type WealthNewsletterProps = {
  heading: string;
  body: string;
  privacyNote: string;
  /** No longer shown: the feature-off message no longer offers an email address. */
  generalInquiriesEmail?: string;
  /** Store privacy policy path; the footer passes the store's own page when published. */
  privacyHref?: string;
};

/**
 * Footer Subscribe column (forest block): italic PT Sans heading, First /
 * Last / Email on square fields, SIGN UP sage ledge (on-dark ledge), "We
 * respect your privacy."
 *
 * When email marketing is on, submitting goes through `useNewsletterSignup`
 * (double opt-in: success means "check your inbox"). When it is off, submitting
 * tells the visitor plainly that sign-ups aren't open yet and gives them a real
 * email to use instead, so it never fakes a sign-up.
 */
export function WealthNewsletter({
  heading,
  body,
  privacyNote,
  privacyHref,
}: WealthNewsletterProps) {
  // Fallback path only: set when email marketing is off for this store.
  const [submitted, setSubmitted] = useState(false);
  const newsletter = useNewsletterSignup();
  const fallback = !newsletter.enabled || newsletter.status === "disabled";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (fallback) {
      setSubmitted(true);
      return;
    }
    const data = new FormData(e.currentTarget);
    const text = (name: string) => {
      const value = data.get(name);
      return typeof value === "string" ? value.trim() : "";
    };
    void newsletter.submit({
      email: text("email"),
      firstName: text("firstName"),
      lastName: text("lastName"),
    });
  };

  return (
    <div {...sectionGroupAttr("global", "newsletter")}>
      {heading ? (
        <h2
          {...fieldAttr("wealth.global.newsletter-heading")}
          className="wealth-footer__subscribe-title"
        >
          {heading}
        </h2>
      ) : null}
      {body ? (
        <p
          {...fieldAttr("wealth.global.newsletter-body")}
          className="wealth-footer__subscribe-body"
        >
          {body}
        </p>
      ) : null}

      {submitted ? (
        <p role="status" className="wealth-footer__status">
          Newsletter sign-ups are coming soon — please check back.
        </p>
      ) : newsletter.isSuccess ? (
        <p role="status" className="wealth-footer__status">
          Check your inbox to confirm your subscription.
        </p>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="wealth-form"
            aria-label="Newsletter sign-up"
          >
            <NewsletterHoneypot inputRef={newsletter.honeypotRef} />
            <div>
              <label htmlFor="wealth-newsletter-first" className="sr-only">
                First Name
              </label>
              <WealthInput
                id="wealth-newsletter-first"
                name="firstName"
                type="text"
                placeholder="First Name"
                autoComplete="given-name"
                required
              />
            </div>
            <div>
              <label htmlFor="wealth-newsletter-last" className="sr-only">
                Last Name
              </label>
              <WealthInput
                id="wealth-newsletter-last"
                name="lastName"
                type="text"
                placeholder="Last Name"
                autoComplete="family-name"
                required
              />
            </div>
            <div className="wealth-form__full">
              <label htmlFor="wealth-newsletter-email" className="sr-only">
                Email Address
              </label>
              <WealthInput
                id="wealth-newsletter-email"
                name="email"
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                required
              />
            </div>
            <div className="wealth-form__full">
              <WealthLedgeButton
                type="submit"
                variant="accent"
                onDark
                disabled={newsletter.isSubmitting}
              >
                Sign Up
              </WealthLedgeButton>
            </div>
          </form>
          {newsletter.status === "error" && newsletter.error ? (
            <p role="alert" className="wealth-footer__status">
              {newsletter.error}
            </p>
          ) : null}
        </>
      )}

      {privacyNote ? (
        <p
          {...fieldAttr("wealth.global.newsletter-privacy")}
          className="wealth-footer__privacy"
        >
          {privacyNote}
        </p>
      ) : null}
      <NewsletterConsentNote
        className="wealth-footer__privacy"
        privacyHref={privacyHref}
      />
    </div>
  );
}
