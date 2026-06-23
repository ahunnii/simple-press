"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type SledgeAnnouncementBarProps = {
  banner: BannerConfig;
};

export function SledgeAnnouncementBar({ banner }: SledgeAnnouncementBarProps) {
  const linkUrl = banner.linkUrl?.trim() ?? "";
  const trimmedLabel = banner.linkLabel?.trim();
  const linkLabel =
    trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : "Shop →";
  const isExternal = /^https?:\/\//i.test(linkUrl);

  const linkClassName =
    "ml-3 inline-flex shrink-0 items-center font-sans text-xs tracking-[0.16em] text-[var(--sl-coral)] uppercase underline underline-offset-[3px] transition-opacity hover:opacity-70";

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="sl-announcement-bar relative"
          style={{
            ...(banner.bgColor ? { backgroundColor: banner.bgColor } : {}),
            ...(banner.textColor ? { color: banner.textColor } : {}),
          }}
        >
          <div className="text-center font-sans text-xs leading-relaxed tracking-[0.12em] uppercase">
            {banner.content != null && (
              <TiptapRenderer
                content={banner.content as TiptapJSON}
                className="inline text-white/[0.92] [&_p]:inline"
              />
            )}
            {linkUrl && (
              <>
                {isExternal ? (
                  <a
                    href={linkUrl}
                    className={linkClassName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {linkLabel}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                ) : (
                  <Link href={linkUrl} className={linkClassName}>
                    {linkLabel}
                  </Link>
                )}
              </>
            )}
          </div>
          <BannerDismissButton
            dismiss={dismiss}
            className="absolute top-1/2 right-3 -translate-y-1/2 opacity-60 transition-opacity hover:opacity-100"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
