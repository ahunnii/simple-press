"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type OliveAnnouncementBarProps = {
  banner: BannerConfig;
};

/**
 * The espresso strip above the header (design.md § First viewport): centred
 * ivory tracked caps, at least 36px tall. The message and its optional link
 * sit together in the centre column; the dismiss control balances an empty
 * column of the same width on the left so the copy stays truly centred.
 *
 * Wired to the shared banner system (`resolveBanner` in the layout +
 * `DismissibleBanner` here); the caller renders this only when a banner
 * actually resolved, so "no banner configured" renders nothing at all. An
 * owner who sets explicit banner colours overrides the ground and the ink —
 * the link follows the ink (owner's text colour, else on-dark), underlined.
 */
export function OliveAnnouncementBar({ banner }: OliveAnnouncementBarProps) {
  const isExternal = banner.linkUrl
    ? /^https?:\/\//i.test(banner.linkUrl)
    : false;

  const barStyle: React.CSSProperties = {
    ...(banner.bgColor ? { background: banner.bgColor } : {}),
    ...(banner.textColor ? { color: banner.textColor } : {}),
  };

  const linkStyle: React.CSSProperties | undefined = banner.textColor
    ? { color: banner.textColor }
    : undefined;

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="olive-announcement-bar"
          data-announcement-bar
          style={barStyle}
        >
          <span aria-hidden="true" />

          <div className="olive-announcement-copy">
            {banner.content !== null && (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="[&_p]:m-0"
              />
            )}

            {banner.linkUrl ? (
              isExternal ? (
                <a
                  href={banner.linkUrl}
                  className="olive-announcement-link"
                  style={linkStyle}
                  target="_blank"
                  rel="noreferrer"
                >
                  {banner.linkLabel ?? "Learn more"}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              ) : (
                <Link
                  href={banner.linkUrl}
                  className="olive-announcement-link"
                  style={linkStyle}
                >
                  {banner.linkLabel ?? "Learn more"}
                </Link>
              )
            ) : null}
          </div>

          <BannerDismissButton
            dismiss={dismiss}
            className="olive-announcement-dismiss"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
