"use client";

import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { BannerConfig } from "~/lib/validators/site-banner";
import {
  BannerDismissButton,
  DismissibleBanner,
} from "~/components/site-banner/dismissible-banner";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  banner: BannerConfig;
};

/**
 * UmscPlatformBanner — the platform's owner-toggled admin banner
 * (`resolveBanner`/`BannerConfig`, configured in platform admin), rendered
 * in umsc's black/gold styling above the template's own field-driven
 * `UmscAnnouncementBar`. Distinct from that component: this one is
 * tiptap-rendered rich content, keyed on the banner's own `version` for
 * dismissal (vii's `ViiAnnouncementBar` pattern), and hides independently —
 * both can be shown, hidden, or dismissed on their own.
 */
export function UmscPlatformBanner({ banner }: Props) {
  const isExternal = banner.linkUrl
    ? /^https?:\/\//i.test(banner.linkUrl)
    : false;

  return (
    <DismissibleBanner version={banner.version}>
      {(dismiss) => (
        <div
          className="umsc-platform-banner umsc-sans grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-[var(--umsc-black)] px-4 py-2 text-[12px] text-[var(--umsc-cream-on-black)]"
          style={{
            ...(banner.bgColor ? { background: banner.bgColor } : {}),
            ...(banner.textColor ? { color: banner.textColor } : {}),
          }}
        >
          <div className="text-center sm:text-left [&_p]:m-0">
            {banner.content !== null && (
              <TiptapRenderer content={banner.content as TiptapJSON} />
            )}
          </div>

          {banner.linkUrl ? (
            isExternal ? (
              <a
                href={banner.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 font-semibold tracking-[0.06em] text-[var(--umsc-gold-soft)] underline underline-offset-[3px]"
                style={
                  banner.textColor ? { color: banner.textColor } : undefined
                }
              >
                {banner.linkLabel ?? "Learn More"}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : (
              <Link
                href={banner.linkUrl}
                className="shrink-0 font-semibold tracking-[0.06em] text-[var(--umsc-gold-soft)] underline underline-offset-[3px]"
                style={
                  banner.textColor ? { color: banner.textColor } : undefined
                }
              >
                {banner.linkLabel ?? "Learn More"}
              </Link>
            )
          ) : (
            <span />
          )}

          <BannerDismissButton
            dismiss={dismiss}
            className="-m-2.5 flex size-[44px] items-center justify-center text-[var(--umsc-cream-on-black)] opacity-70 hover:opacity-100"
          />
        </div>
      )}
    </DismissibleBanner>
  );
}
