"use client";

import Link from "next/link";

import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";

type DreamTopbarProps = {
  text: string;
  linkLabel?: string;
  linkUrl?: string;
};

/**
 * 34px ink band, gold-soft text, dismissible (design.md "Chrome › Topbar").
 * Driven by the `dream.global.announcement-*` fields — `DreamLayout`
 * resolves them and passes the result in. This is the fallback path: when
 * the platform site-banner feature (`resolveBanner`) has a banner
 * configured, `DreamLayout` renders `DreamPlatformBanner` here instead.
 * Renders nothing when `text` is blank; dismissal persists per exact
 * text value (`DismissibleBanner`'s `version`), so an owner editing the
 * copy naturally re-shows it to viewers who dismissed the old text.
 */
export function DreamTopbar({ text, linkLabel, linkUrl }: DreamTopbarProps) {
  if (!text) return null;

  const isExternal = linkUrl ? /^https?:\/\//i.test(linkUrl) : false;

  return (
    <DismissibleBanner version={text} className="dream-topbar">
      {(dismiss) => (
        <div className="dream-topbar-row">
          <p className="dream-topbar-text">{text}</p>

          {linkUrl && linkLabel ? (
            isExternal ? (
              <a
                href={linkUrl}
                className="dream-topbar-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkLabel}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link href={linkUrl} className="dream-topbar-link">
                {linkLabel}
              </Link>
            )
          ) : (
            <span />
          )}

          <BannerDismissButton
            dismiss={dismiss}
            className="dream-topbar-dismiss"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
