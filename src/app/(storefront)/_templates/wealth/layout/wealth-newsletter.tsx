"use client";

import { useState } from "react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthInput } from "../shared/wealth-input";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthSectionHeading } from "../shared/wealth-section-heading";

type WealthNewsletterProps = {
  heading: string;
  body: string;
  privacyNote: string;
  /** Shown in the honest-fallback status message once submitted. */
  generalInquiriesEmail: string;
};

/**
 * Footer newsletter form. There is no newsletter/marketing-subscribe backend
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
    <div
      {...sectionGroupAttr("global", "newsletter")}
      className="p-[var(--wealth-rhythm)]"
      style={{ background: "rgba(0,0,0,.05)" }}
    >
      <WealthSectionHeading {...fieldAttr("wealth.global.newsletter-heading")}>
        {heading}
      </WealthSectionHeading>
      <p
        {...fieldAttr("wealth.global.newsletter-body")}
        className="mt-2 mb-[var(--wealth-rhythm)]"
        style={{ color: "var(--wealth-ink)" }}
      >
        {body}
      </p>

      {submitted ? (
        <p role="status" style={{ color: "var(--wealth-success)" }}>
          Newsletter sign-ups are coming soon — email us at{" "}
          <a
            href={`mailto:${generalInquiriesEmail}`}
            className="wealth-link"
          >
            {generalInquiriesEmail}
          </a>{" "}
          to be added to the list.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="wealth-newsletter-first" className="sr-only">
                First Name
              </label>
              <WealthInput
                id="wealth-newsletter-first"
                name="firstName"
                type="text"
                placeholder="First Name"
                required
              />
            </div>
            <div className="flex-1">
              <label htmlFor="wealth-newsletter-last" className="sr-only">
                Last Name
              </label>
              <WealthInput
                id="wealth-newsletter-last"
                name="lastName"
                type="text"
                placeholder="Last Name"
                required
              />
            </div>
          </div>

          <label htmlFor="wealth-newsletter-email" className="sr-only">
            Email
          </label>
          <WealthInput
            id="wealth-newsletter-email"
            name="email"
            type="email"
            placeholder="Email"
            required
          />

          <div>
            <WealthLedgeButton type="submit" variant="accent">
              Sign Up
            </WealthLedgeButton>
          </div>

          <p
            {...fieldAttr("wealth.global.newsletter-privacy")}
            className="text-sm"
            style={{ color: "var(--wealth-muted)" }}
          >
            {privacyNote}
          </p>
        </form>
      )}
    </div>
  );
}
