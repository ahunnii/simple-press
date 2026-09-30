"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type PollenAnnouncementBarProps = {
  banner: BannerConfig;
};

const linkClassName =
  "shrink-0 text-sm font-semibold whitespace-nowrap underline underline-offset-[3px] transition-opacity hover:opacity-80";

/**
 * Platform announcement bar (Content → Banner & popup) in pollen's palette.
 * Rendered as the top row of the fixed `PollenHeader`; the owner's banner
 * colours, when set, override the template defaults.
 */
export function PollenAnnouncementBar({ banner }: PollenAnnouncementBarProps) {
  const linkUrl = banner.linkUrl?.trim() ?? "";
  const trimmedLabel = banner.linkLabel?.trim();
  const linkLabel =
    trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : "Learn more";
  const isExternal = /^https?:\/\//i.test(linkUrl);

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          data-announcement-bar
          className="grid min-h-10 grid-cols-[1fr_auto_auto] items-center gap-3 bg-[#2a351f] py-2 pr-3 pl-5 text-white"
          style={{
            ...(banner.bgColor ? { backgroundColor: banner.bgColor } : {}),
            ...(banner.textColor ? { color: banner.textColor } : {}),
          }}
        >
          <div className="text-center text-sm leading-snug">
            {banner.content !== null && (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="[&_p]:m-0"
              />
            )}
          </div>

          {linkUrl ? (
            isExternal ? (
              <a
                href={linkUrl}
                className={linkClassName}
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkLabel} →
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link href={linkUrl} className={linkClassName}>
                {linkLabel} →
              </Link>
            )
          ) : (
            <span />
          )}

          <BannerDismissButton
            dismiss={dismiss}
            className="flex items-center justify-center rounded p-1.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
