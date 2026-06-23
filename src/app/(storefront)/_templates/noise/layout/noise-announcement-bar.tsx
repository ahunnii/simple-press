"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type NoiseAnnouncementBarProps = {
  banner: BannerConfig;
};

export function NoiseAnnouncementBar({ banner }: NoiseAnnouncementBarProps) {
  const linkUrl = banner.linkUrl?.trim() ?? "";
  const trimmedLabel = banner.linkLabel?.trim();
  const linkLabel =
    trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : "Shop →";
  const isExternal = /^https?:\/\//i.test(linkUrl);

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="vn-topbar"
          data-announcement-bar
          style={{
            ...(banner.bgColor ? { backgroundColor: banner.bgColor } : {}),
            ...(banner.textColor ? { color: banner.textColor } : {}),
          }}
        >
          <div className="font-mono text-[11px] tracking-[0.22em] uppercase">
            {banner.content != null && (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="inline"
              />
            )}
          </div>
          {linkUrl && (
            <>
              {isExternal ? (
                <a
                  href={linkUrl}
                  className="ml-4 font-mono text-[10px] tracking-[0.18em] uppercase underline underline-offset-2 transition-opacity hover:opacity-70"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkLabel}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              ) : (
                <Link
                  href={linkUrl}
                  className="ml-4 font-mono text-[10px] tracking-[0.18em] uppercase underline underline-offset-2 transition-opacity hover:opacity-70"
                >
                  {linkLabel}
                </Link>
              )}
            </>
          )}
          <BannerDismissButton
            dismiss={dismiss}
            className="ml-auto shrink-0 opacity-60 transition-opacity hover:opacity-100"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
