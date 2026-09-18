"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type DreamPlatformBannerProps = {
  banner: BannerConfig;
};

/**
 * Renders the platform site-banner feature (`resolveBanner`) in `dream`'s
 * ink-band/gold-soft topbar chrome — port of `wealth/layout/wealth-announcement-bar.tsx`
 * onto the `.dream-topbar*` classes instead of inline `--wealth-*` styles.
 * `DreamLayout` renders this INSTEAD OF `DreamTopbar` when a platform banner
 * is configured (platform banner takes priority over the `dream.global.
 * announcement-*` fields); otherwise `DreamTopbar` remains field-driven.
 * `banner.bgColor`/`textColor` overrides win when set, exactly like wealth.
 */
export function DreamPlatformBanner({ banner }: DreamPlatformBannerProps) {
  const isExternal = banner.linkUrl
    ? /^https?:\/\//i.test(banner.linkUrl)
    : false;

  const rowStyle: React.CSSProperties = {
    ...(banner.bgColor ? { background: banner.bgColor } : {}),
    ...(banner.textColor ? { color: banner.textColor } : {}),
  };

  const linkStyle: React.CSSProperties | undefined = banner.textColor
    ? { color: banner.textColor }
    : undefined;

  return (
    <DismissibleBanner version={banner.version} className="dream-topbar">
      {(dismiss) => (
        <div className="dream-topbar-row" style={rowStyle}>
          <div className="dream-topbar-text [&_p]:m-0">
            {banner.content !== null && (
              <TiptapRenderer content={banner.content as TiptapJSON} />
            )}
          </div>

          {banner.linkUrl ? (
            isExternal ? (
              <a
                href={banner.linkUrl}
                className="dream-topbar-link"
                style={linkStyle}
                target="_blank"
                rel="noopener noreferrer"
              >
                {banner.linkLabel ?? "Learn More"}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link
                href={banner.linkUrl}
                className="dream-topbar-link"
                style={linkStyle}
              >
                {banner.linkLabel ?? "Learn More"}
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
