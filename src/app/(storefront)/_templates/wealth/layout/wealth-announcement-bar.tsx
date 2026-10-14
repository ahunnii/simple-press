"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type WealthAnnouncementBarProps = {
  banner: BannerConfig;
};

/**
 * Primary-green bar, white Titillium text, centered, dismissible (design.md
 * Chrome "Redesign" — `.wealth-announce`). Sits ABOVE the sticky header and
 * scrolls away with the page. The platform banner's own fields drive it
 * (`resolveBanner`); the caller renders this only when one is configured,
 * so it is hidden when unset. Owner color overrides (bgColor / textColor)
 * still win over the green.
 */
export function WealthAnnouncementBar({ banner }: WealthAnnouncementBarProps) {
  const isExternal = banner.linkUrl
    ? /^https?:\/\//i.test(banner.linkUrl)
    : false;

  const overrideStyle: React.CSSProperties = {
    ...(banner.bgColor ? { background: banner.bgColor } : {}),
    ...(banner.textColor ? { color: banner.textColor } : {}),
  };

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="wealth-announce"
          role="region"
          aria-label="Announcement"
          data-announcement-bar
          style={overrideStyle}
        >
          <div className="wealth-container wealth-announce__inner">
            {banner.content !== null ? (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="wealth-announce__text"
              />
            ) : null}

            {banner.linkUrl ? (
              isExternal ? (
                <a href={banner.linkUrl} target="_blank" rel="noreferrer">
                  {banner.linkLabel ?? "Learn More"}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              ) : (
                <Link href={banner.linkUrl}>
                  {banner.linkLabel ?? "Learn More"}
                </Link>
              )
            ) : null}

            <BannerDismissButton
              dismiss={dismiss}
              className="wealth-announce__close"
            />
          </div>
        </div>
      )}
    </DismissibleBanner>
  );
}
