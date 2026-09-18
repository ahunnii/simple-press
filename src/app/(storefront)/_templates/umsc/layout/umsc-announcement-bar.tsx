"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { BannerDismissButton } from "~/components/site-banner/dismissible-banner";

/**
 * Template-owned dismissal key. The shared `DismissibleBanner` persists under
 * ONE global key, which the platform banner (`UmscPlatformBanner`) already
 * uses — sharing it would make dismissing one bar un-dismiss the other. This
 * bar also renders on the server (no hydration gate) so the hero's
 * `calc(100svh - chrome)` first viewport doesn't shift when it mounts.
 */
const STORAGE_KEY = "umsc_announcement_dismissed";

type Props = {
  text: string;
  linkLabel: string;
  linkUrl: string;
};

/**
 * UmscAnnouncementBar — 34px black bar, dismissible, hidden when the text
 * field is blank (checked by the caller before rendering this component so
 * a fully-hidden bar never mounts). The dismissed state is keyed on the text
 * itself so editing the copy un-dismisses it for returning visitors.
 */
export function UmscAnnouncementBar({ text, linkLabel, linkUrl }: Props) {
  const isExternal = /^https?:\/\//i.test(linkUrl);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === text) setIsDismissed(true);
    } catch {
      // localStorage unavailable — keep the bar visible
    }
  }, [text]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // storage write failed — still dismiss in-memory
    }
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div role="region" aria-label="Announcement">
      <div className="umsc-announcement-bar umsc-sans grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-[var(--umsc-black)] px-4 py-2 text-[12px] text-[var(--umsc-cream-on-black)]">
        <p
          {...fieldAttr("umsc.global.announcement-text")}
          className="m-0 truncate text-center sm:text-left"
        >
          {text}
        </p>

        {linkLabel ? (
          isExternal ? (
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              {...fieldAttr("umsc.global.announcement-link-label")}
              className="shrink-0 font-semibold tracking-[0.06em] text-[var(--umsc-gold-soft)] underline underline-offset-[3px]"
            >
              {linkLabel}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          ) : (
            <Link
              href={linkUrl}
              {...fieldAttr("umsc.global.announcement-link-label")}
              className="shrink-0 font-semibold tracking-[0.06em] text-[var(--umsc-gold-soft)] underline underline-offset-[3px]"
            >
              {linkLabel}
            </Link>
          )
        ) : (
          <span />
        )}

        <BannerDismissButton
          dismiss={dismiss}
          className="-m-2.5 flex size-[44px] items-center justify-center text-[var(--umsc-cream-on-black)] opacity-70 hover:opacity-100"
        />
      </div>
    </div>
  );
}
