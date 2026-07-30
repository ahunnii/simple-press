"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type PinkPopupProps = {
  popup: PopupConfig;
};

/**
 * Homepage popup (F4, review 2026-07-29). Before this file existed, pink had
 * no popup component at all — `resolvePopup` was never called, so an owner
 * who enabled `popups` and configured one got nothing, on any surface.
 *
 * Reuses the shared `PopupModal` wrapper (`~/components/site-banner/popup-modal`)
 * that `default`/`vii` already use — once-per-session dismissal, focus trap,
 * Escape-to-close, reduced-motion-safe entrance, backdrop click. Only the
 * presentation below is pink's own: a dark ink panel with a hairline border
 * and square corners (design.md → Identity: "the chrome is near-black... a
 * single deep rose carries every action"; Typography: "border-radius: 0
 * everywhere"), not stock shadcn dialog chrome.
 */
export function PinkPopup({ popup }: PinkPopupProps) {
  return (
    <PopupModal
      version={popup.version}
      ariaLabel={popup.heading ?? "Announcement"}
    >
      {(close) => (
        <div
          className="pink-dark relative overflow-hidden"
          style={{
            background: "var(--pink-ink-panel)",
            border: "1px solid var(--pink-ink-line-strong)",
            width: "min(92vw, 480px)",
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close popup"
            className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center opacity-70 transition-opacity hover:opacity-100"
            style={{
              minWidth: "44px",
              minHeight: "44px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--pink-ink-body)",
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {popup.mode === "image" ? (
            <>
              {popup.imagePath && (
                <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
                  <Image
                    src={popup.imagePath}
                    alt={popup.imageAlt ?? ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 600px) 92vw, 480px"
                  />
                </div>
              )}
              {(popup.heading ?? popup.ctaUrl) && (
                <div className="p-7">
                  {popup.heading && (
                    <p
                      className="pink-display mb-4 text-[22px] font-semibold tracking-[-0.02em]"
                      style={{ color: "var(--pink-paper)" }}
                    >
                      {popup.heading}
                    </p>
                  )}
                  {popup.ctaUrl && (
                    <PinkPopupCta href={popup.ctaUrl} label={popup.ctaLabel ?? "See more"} onClick={close} />
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8">
              {popup.heading && (
                <p
                  className="pink-display mb-4 text-[24px] font-semibold tracking-[-0.02em]"
                  style={{ color: "var(--pink-paper)" }}
                >
                  {popup.heading}
                </p>
              )}
              {popup.content !== null && (
                <div className="text-[15px] leading-[1.7]" style={{ color: "var(--pink-ink-body)" }}>
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              )}
              {popup.ctaUrl && (
                <div className="mt-5">
                  <PinkPopupCta href={popup.ctaUrl} label={popup.ctaLabel ?? "See more"} onClick={close} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PopupModal>
  );
}

function PinkPopupCta({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  const isExternal = /^https?:\/\//i.test(href);

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="pink-btn pink-btn-solid" onClick={onClick}>
        {label}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className="pink-btn pink-btn-solid" onClick={onClick}>
      {label}
    </Link>
  );
}
