import Link from "next/link";
import { Mail, Phone, Truck } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { GLOVE_FIELD_KEYS } from "./index";

type GloveTopBarProps = {
  supportEmail?: string | null;
  phoneNumber?: string | null;
  /** Field value; blank hides the link. */
  trackLabel: string;
  trackHref: string;
};

/**
 * Purple contact strip (desktop only; the parent hides it below 1024px).
 * Email and phone come from Settings and each hides when unset.
 */
export function GloveTopBar({
  supportEmail,
  phoneNumber,
  trackLabel,
  trackHref,
}: GloveTopBarProps) {
  const email = supportEmail?.trim();
  const phone = phoneNumber?.trim();
  const showTrack = trackLabel.trim().length > 0;
  if (!email && !phone && !showTrack) return null;

  return (
    <div className="glove-topbar">
      <div className="glove-container flex h-[var(--glove-topbar-h)] items-center justify-between gap-6">
        <ul className="m-0 flex list-none items-center gap-6 p-0">
          {email ? (
            <li>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2"
              >
                <Mail className="size-4" aria-hidden="true" />
                {email}
              </a>
            </li>
          ) : null}
          {phone ? (
            <li>
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-2"
              >
                <Phone className="size-4" aria-hidden="true" />
                {phone}
              </a>
            </li>
          ) : null}
        </ul>
        {showTrack ? (
          <Link href={trackHref} className="inline-flex items-center gap-2">
            <Truck className="size-[18px]" aria-hidden="true" />
            <span {...fieldAttr(GLOVE_FIELD_KEYS.trackLabel)}>
              {trackLabel}
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
