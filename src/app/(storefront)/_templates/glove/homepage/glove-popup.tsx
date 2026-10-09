"use client";

import Image from "next/image";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { GloveButton } from "../shared";

type GlovePopupProps = {
  popup: PopupConfig;
};

/**
 * The owner's homepage popup, dressed in glove tokens. The platform owns the
 * behavior (once per session, focus trap, Escape, reduced motion); this file
 * owns only the look. Every string belongs to the owner's popup settings; the
 * button's fallback label is structural microcopy.
 */
export function GlovePopup({ popup }: GlovePopupProps) {
  const heading = (popup.heading ?? "").trim();
  const ctaUrl = (popup.ctaUrl ?? "").trim();
  const ctaLabel = (popup.ctaLabel ?? "").trim();
  const hasText = popup.mode === "text" && popup.content !== null;
  const hasBody = heading.length > 0 || ctaUrl.length > 0 || hasText;
  const external = /^https?:\/\//i.test(ctaUrl);

  return (
    <PopupModal
      version={popup.version}
      ariaLabel={heading.length > 0 ? heading : "Notice"}
    >
      {(close) => (
        <div className="glove-body relative w-[min(92vw,32rem)] overflow-hidden rounded-[var(--glove-radius-panel)] bg-[var(--glove-paper)] text-[var(--glove-text)] shadow-[var(--glove-shadow-md)]">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-2 right-2 z-10 flex size-11 items-center justify-center rounded-full bg-[var(--glove-paper)] text-[var(--glove-ink)] shadow-[var(--glove-shadow-sm)]"
          >
            <X aria-hidden="true" className="size-4" />
          </button>

          {popup.mode === "image" && popup.imagePath ? (
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={popup.imagePath}
                alt={popup.imageAlt ?? ""}
                fill
                sizes="(max-width: 600px) 92vw, 32rem"
                className="object-cover"
              />
            </div>
          ) : null}

          {hasBody ? (
            <div className="flex flex-col items-start gap-4 p-6 md:p-8">
              {heading ? (
                <p className="glove-display text-[22px] leading-snug font-medium text-[var(--glove-ink)]">
                  {heading}
                </p>
              ) : null}
              {hasText && popup.content ? (
                <div className="text-[15px] leading-relaxed">
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              ) : null}
              {ctaUrl ? (
                // The link takes no onClick from `GloveButton`, so the
                // dismissal is recorded from the bubbled click instead.
                <span className="contents" onClick={close}>
                  <GloveButton href={ctaUrl} external={external} size="md">
                    {ctaLabel.length > 0 ? ctaLabel : "Take a look"}
                  </GloveButton>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </PopupModal>
  );
}
