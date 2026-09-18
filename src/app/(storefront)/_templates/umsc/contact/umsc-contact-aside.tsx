import { fieldAttr } from "~/lib/preview/section-attrs";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

import { UmscGoogleReviewLink } from "../shared/umsc-google-review-link";
import { UmscHeading } from "../shared/umsc-heading";

type Props = {
  heading: string;
  lines: { value: string; fieldKey: string }[];
  phone: string;
  hours: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  googleReviewUrl: string;
};

/**
 * UmscContactAside — the sticky "What to expect" panel beside the form
 * (design.md "Contact #2"): three short lines, phone, hours, socials, and
 * the Google-review link. Every line hides itself when blank.
 */
export function UmscContactAside({
  heading,
  lines,
  phone,
  hours,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  googleReviewUrl,
}: Props) {
  const visibleLines = lines.filter((line) => line.value.trim().length > 0);
  const hasSocials = !!(instagramUrl || facebookUrl || tiktokUrl);

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

      {(phone || hours) && (
        <div className="umsc-sans mt-6 flex flex-col gap-2 border-t border-[var(--umsc-line)] pt-6 text-[14px] text-[var(--umsc-ink)]">
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="font-semibold text-[var(--umsc-gold-ink)] no-underline hover:underline"
            >
              {phone}
            </a>
          )}
          {hours && (
            <p
              {...fieldAttr("umsc.contact.hours")}
              className="m-0 text-[var(--umsc-muted)]"
            >
              {hours}
            </p>
          )}
        </div>
      )}

      {(hasSocials || googleReviewUrl) && (
        <div className="mt-6 flex flex-col gap-4 border-t border-[var(--umsc-line)] pt-6">
          {hasSocials && (
            <div className="flex gap-4">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  aria-label="Instagram"
                  className="-m-2 flex items-center justify-center p-2 text-[var(--umsc-ink)] hover:text-[var(--umsc-gold-ink)]"
                >
                  <InstagramIcon className="size-4" />
                </a>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  aria-label="Facebook"
                  className="-m-2 flex items-center justify-center p-2 text-[var(--umsc-ink)] hover:text-[var(--umsc-gold-ink)]"
                >
                  <FacebookIcon className="size-4" />
                </a>
              )}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  aria-label="TikTok"
                  className="-m-2 flex items-center justify-center p-2 text-[var(--umsc-ink)] hover:text-[var(--umsc-gold-ink)]"
                >
                  <TikTokIcon className="size-4" />
                </a>
              )}
            </div>
          )}
          <UmscGoogleReviewLink
            href={googleReviewUrl}
            className="text-[var(--umsc-ink)]"
          />
        </div>
      )}
    </div>
  );
}
