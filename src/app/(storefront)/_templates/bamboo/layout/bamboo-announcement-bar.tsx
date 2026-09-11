"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type BambooAnnouncementBarProps = {
  banner: BannerConfig;
};

/**
 * BambooAnnouncementBar — the forest-deep strip above the header.
 *
 * Content, link and dismissal come from the merchant's banner config
 * (`siteContent.bannerConfig`, resolved server-side by `resolveBanner`), the
 * same source every other template's bar reads — not from template fields.
 * `DismissibleBanner` keys dismissal on the config's version string, so
 * re-saving the banner in the admin re-shows it to everyone.
 *
 * Owner-picked bgColor/textColor still win over the bamboo tint when set:
 * that override is part of the shared banner contract.
 */
export function BambooAnnouncementBar({ banner }: BambooAnnouncementBarProps) {
  const linkUrl = banner.linkUrl?.trim() ?? "";
  const trimmedLabel = banner.linkLabel?.trim();
  const linkLabel =
    trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : "Shop now";
  const isExternal = /^https?:\/\//i.test(linkUrl);

  const linkClass =
    "ml-2 inline-block font-medium text-[var(--bam-gold-soft)] underline underline-offset-4 transition-colors hover:text-[var(--bam-cream)]";

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="relative border-b border-[var(--bam-gold-soft)]/20 bg-[var(--bam-forest-deep)] px-4 py-2.5 pr-12 text-center text-sm tracking-wide text-[var(--bam-gold-soft)]"
          style={{
            ...(banner.bgColor ? { backgroundColor: banner.bgColor } : {}),
            ...(banner.textColor ? { color: banner.textColor } : {}),
          }}
        >
          <div className="mx-auto max-w-4xl leading-relaxed">
            {banner.content != null && (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="inline [&_p]:inline"
              />
            )}
            {linkUrl &&
              (isExternal ? (
                <a
                  href={linkUrl}
                  className={linkClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkLabel}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              ) : (
                <Link href={linkUrl} className={linkClass}>
                  {linkLabel}
                </Link>
              ))}
          </div>
          <BannerDismissButton
            dismiss={dismiss}
            className="absolute top-1/2 right-3 -translate-y-1/2 opacity-70 transition-opacity hover:opacity-100"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
