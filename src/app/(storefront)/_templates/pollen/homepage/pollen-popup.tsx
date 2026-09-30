"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type PollenPopupProps = {
  popup: PopupConfig;
};

/**
 * PollenPopup — business announcement popup for the pollen homepage,
 * following the `default.homepage` popup pattern (`resolvePopup` +
 * `PopupModal`, gated on the `popups` flag by the caller). Pollen has no
 * CSS custom properties, so this uses the template's existing hex palette
 * (`#2a351f` ink, `#215935` / `#1a4729` green buttons, `#4c566a` muted body
 * text, `#e5e8e0` hairline) instead of tokens.
 */
export function PollenPopup({ popup }: PollenPopupProps) {
  return (
    <PopupModal
      version={popup.version}
      ariaLabel={popup.heading ?? "Announcement"}
    >
      {(close) => (
        <div className="relative w-[min(92vw,480px)] overflow-hidden rounded-xl border border-[#e5e8e0] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
          <button
            type="button"
            onClick={close}
            aria-label="Close popup"
            className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/85 text-[#2a351f] opacity-70 backdrop-blur-sm transition-opacity hover:opacity-100"
          >
            <X className="size-4" aria-hidden="true" />
          </button>

          {popup.mode === "image" ? (
            <>
              {popup.imagePath && (
                <div className="relative aspect-4/3 w-full bg-[#f5f2ee]">
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
                <div className="p-6">
                  {popup.heading && (
                    <p className="mb-3.5 text-lg font-bold text-[#2a351f]">
                      {popup.heading}
                    </p>
                  )}
                  {popup.ctaUrl && (
                    <PollenPopupCta
                      href={popup.ctaUrl}
                      label={popup.ctaLabel ?? "Learn more"}
                      onClick={close}
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 pt-10">
              {popup.heading && (
                <p className="mb-3 text-xl font-bold text-[#2a351f]">
                  {popup.heading}
                </p>
              )}

              {popup.content !== null && (
                <div className="text-sm leading-relaxed text-[#4c566a]">
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              )}

              {popup.ctaUrl && (
                <div className="mt-5">
                  <PollenPopupCta
                    href={popup.ctaUrl}
                    label={popup.ctaLabel ?? "Learn more"}
                    onClick={close}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PopupModal>
  );
}

function PollenPopupCta({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  const isExternal = /^https?:\/\//i.test(href);
  const className =
    "inline-flex items-center gap-2 rounded-full bg-[#215935] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a4729]";

  if (isExternal) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
      >
        {label} <span aria-hidden="true">→</span>
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {label} <span aria-hidden="true">→</span>
    </Link>
  );
}
