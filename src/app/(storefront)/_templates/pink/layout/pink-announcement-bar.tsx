"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type PinkAnnouncementBarProps = {
  banner: BannerConfig;
};

/**
 * PinkArt's announcement bar renders the platform-wide site banner — the same
 * owner-configured `SiteContent.bannerConfig` every other template uses, gated
 * by the `banners` feature flag and resolved in `pink-layout.tsx` via
 * `resolveBanner`. Owners set the copy, link and colors in the admin, not in
 * template fields, so a banner configured once shows up on whatever template
 * the business is running.
 *
 * Styling is pink's: a flat rose bar with square edges, `13px`/500 at `.06em`,
 * centered, with the owner's optional color overrides winning when set.
 */
export function PinkAnnouncementBar({ banner }: PinkAnnouncementBarProps) {
  const linkUrl = banner.linkUrl?.trim() ?? "";
  const trimmedLabel = banner.linkLabel?.trim();
  const linkLabel =
    trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : "Shop →";
  const isExternal = /^https?:\/\//i.test(linkUrl);

  const linkClass =
    "shrink-0 text-[13px] font-semibold tracking-[0.06em] underline underline-offset-2 transition-opacity hover:opacity-80";

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          data-announcement-bar
          className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 py-2.5 text-center md:px-10"
          style={{
            background: banner.bgColor ?? "var(--pink-rose)",
            color: banner.textColor ?? "var(--pink-on-accent)",
          }}
        >
          {banner.content != null && (
            <div className="text-[13px] font-medium tracking-[0.06em]">
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="inline"
              />
            </div>
          )}

          {linkUrl &&
            (isExternal ? (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {linkLabel}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link href={linkUrl} className={linkClass}>
                {linkLabel}
              </Link>
            ))}

          <BannerDismissButton
            dismiss={dismiss}
            className="absolute top-1/2 right-3 -translate-y-1/2 opacity-70 transition-opacity hover:opacity-100"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
