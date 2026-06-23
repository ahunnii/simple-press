"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type HappyBambooAnnouncementBarProps = {
  banner: BannerConfig;
};

export function HappyBambooAnnouncementBar({
  banner,
}: HappyBambooAnnouncementBarProps) {
  const linkUrl = banner.linkUrl?.trim() ?? "";
  const trimmedLabel = banner.linkLabel?.trim();
  const linkLabel =
    trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : "Shop now";
  const isExternal = /^https?:\/\//i.test(linkUrl);

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="relative border-b border-emerald-900/10 bg-emerald-950/90 px-4 py-2.5 text-center text-sm text-white"
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
            {linkUrl && (
              <>
                {isExternal ? (
                  <a
                    href={linkUrl}
                    className="ml-2 inline-block font-medium text-emerald-200 underline underline-offset-2 hover:text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {linkLabel}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                ) : (
                  <Link
                    href={linkUrl}
                    className="ml-2 inline-block font-medium text-emerald-200 underline underline-offset-2 hover:text-white"
                  >
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
