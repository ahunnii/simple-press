import type { UmscSocialLink } from "../shared/umsc-contact-details";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { umscTelHref } from "../shared/umsc-contact-details";
import { UmscGoogleReviewLink } from "../shared/umsc-google-review-link";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscSocialIcons } from "../shared/umsc-social-icons";

type Props = {
  heading: string;
  lines: { value: string; fieldKey: string }[];
  /** Settings → General phone (legacy saved field as fallback). */
  phone?: string;
  /** Settings → Business Hours, one row per line. */
  hoursRows: { label: string; value: string }[];
  /** Legacy saved hours text — only set when `hoursRows` is empty. */
  legacyHours?: string;
  /** Content → Branding social links (legacy saved URLs as fallback). */
  socials: UmscSocialLink[];
  googleReviewUrl: string;
};

/**
 * UmscContactAside — the sticky "What to expect" panel beside the form
 * (design.md "Contact #2"): three short lines, phone, hours, socials, and
 * the Google-review link. Every line hides itself when blank. Phone, hours
 * and socials come from Settings / Content → Branding via
 * `resolveUmscContactDetails`, so they carry no field attrs.
 */
export function UmscContactAside({
  heading,
  lines,
  phone,
  hoursRows,
  legacyHours,
  socials,
  googleReviewUrl,
}: Props) {
  const visibleLines = lines.filter((line) => line.value.trim().length > 0);
  const hasSocials = socials.length > 0;
  const hasHours = hoursRows.length > 0 || Boolean(legacyHours);

  return (
    <div className="border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-8">
      {heading && (
        <UmscHeading as="h3" fieldKey="umsc.contact.expect-heading">
          {heading}
        </UmscHeading>
      )}

      {visibleLines.length > 0 && (
        <ul className="umsc-sans mt-5 flex flex-col gap-3 text-[15px] leading-[1.6] text-[var(--umsc-muted)]">
          {visibleLines.map((line) => (
            <li
              key={line.fieldKey}
              {...fieldAttr(line.fieldKey)}
              className="flex gap-3"
            >
              <span
                aria-hidden="true"
                className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[var(--umsc-gold)]"
              />
              {line.value}
            </li>
          ))}
        </ul>
      )}

      {(Boolean(phone) || hasHours) && (
        <div className="umsc-sans mt-6 flex flex-col gap-2 border-t border-[var(--umsc-line)] pt-6 text-[14px] text-[var(--umsc-ink)]">
          {phone && (
            <a
              href={umscTelHref(phone)}
              className="font-semibold text-[var(--umsc-gold-ink)] no-underline hover:underline"
            >
              {phone}
            </a>
          )}
          {hoursRows.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[var(--umsc-muted)]">
              {hoursRows.map((row) => (
                <li key={row.label}>
                  {row.label}: {row.value}
                </li>
              ))}
            </ul>
          ) : legacyHours ? (
            <p className="m-0 text-[var(--umsc-muted)]">{legacyHours}</p>
          ) : null}
        </div>
      )}

      {(hasSocials || googleReviewUrl) && (
        <div className="mt-6 flex flex-col gap-4 border-t border-[var(--umsc-line)] pt-6">
          <UmscSocialIcons
            links={socials}
            linkClassName="-m-2 flex items-center justify-center p-2 text-[var(--umsc-ink)] hover:text-[var(--umsc-gold-ink)]"
          />
          <UmscGoogleReviewLink
            href={googleReviewUrl}
            className="text-[var(--umsc-ink)]"
          />
        </div>
      )}
    </div>
  );
}
