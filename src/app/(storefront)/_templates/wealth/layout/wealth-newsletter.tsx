"use client";

import { useState } from "react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthInput } from "../shared/wealth-input";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";

type WealthNewsletterProps = {
  heading: string;
  body: string;
  privacyNote: string;
  /** Shown in the honest-fallback status message once submitted. */
  generalInquiriesEmail: string;
};

/**
 * Footer Subscribe column (forest block): italic PT Sans heading, First /
 * Last / Email on square fields, SIGN UP sage ledge (on-dark ledge), "We
 * respect your privacy." There is no newsletter/marketing-subscribe backend
 * wired up for this template yet (no public tRPC procedure persists the
 * address anywhere), so — following `elegant/homepage/elegant-newsletter.tsx`'s
 * honest-fallback pattern — submitting never fakes success. It tells the
 * visitor plainly that sign-ups aren't open yet and gives them a real email
 * to use instead.
 */
export function WealthNewsletter({
  heading,
  body,
  privacyNote,
  generalInquiriesEmail,
}: WealthNewsletterProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
          {generalInquiriesEmail ? (
            <>
              Newsletter sign-ups are coming soon — email us at{" "}
              <a href={`mailto:${generalInquiriesEmail}`}>
                {generalInquiriesEmail}
              </a>{" "}
              to be added to the list.
            </>
          ) : (
            "Newsletter sign-ups are coming soon. Please check back."
          )}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="wealth-form"
          aria-label="Newsletter sign-up"
        >
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
            <WealthLedgeButton type="submit" variant="accent" onDark>
              Sign Up
            </WealthLedgeButton>
          </div>
        </form>
      )}

      {privacyNote ? (
        <p
          {...fieldAttr("wealth.global.newsletter-privacy")}
          className="wealth-footer__privacy"
        >
          {privacyNote}
        </p>
      ) : null}
    </div>
  );
}
