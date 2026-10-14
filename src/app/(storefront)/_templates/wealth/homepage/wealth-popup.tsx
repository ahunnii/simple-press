"use client";

import Image from "next/image";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";

type Props = {
  popup: PopupConfig;
};

/**
 * WealthPopup: the owner's announcement popup (B2.4). Printed in wealth's own
 * materials: a paper card with square corners, a forest top rule and the hard
 * 2px-style sage "ledge" offset shadow, an italic Jost heading, Titillium body
 * and a sage ledge button. `PopupModal` owns the behavior (once per session,
 * focus trap, Esc, backdrop click, reduced motion); this file owns only the
 * print.
 *
 * Every string belongs to the owner's popup configuration (Content > Popups),
 * so there are no template fields to declare. The CTA's fallback label is the
 * one exception: the popup schema leaves `ctaLabel` optional, so the template
 * supplies one rather than render a button with no accessible name.
 */
export function WealthPopup({ popup }: Props) {
  const heading = (popup.heading ?? "").trim();
  const ctaUrl = (popup.ctaUrl ?? "").trim();
  const ctaLabel = (popup.ctaLabel ?? "").trim();
  const hasText = popup.mode === "text" && popup.content !== null;
  const hasBody = heading.length > 0 || ctaUrl.length > 0 || hasText;

  return (
    <PopupModal
      version={popup.version}
      ariaLabel={heading.length > 0 ? heading : "Announcement"}
    >
      {(close) => (
        <div
          className="wealth-on-paper relative w-[min(92vw,480px)] overflow-hidden"
          style={{
            background: "var(--wealth-paper)",
            color: "var(--wealth-ink)",
            borderTop: "3px solid var(--wealth-forest)",
            boxShadow: "6px 6px 0 0 var(--wealth-accent)",
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-2 right-2 z-10 flex size-11 items-center justify-center"
            style={{ color: "var(--wealth-btn-ink)" }}
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          {popup.mode === "image" && popup.imagePath ? (
            <div
              className="relative aspect-[4/3] w-full"
              style={{ background: "var(--wealth-surface)" }}
            >
              <Image
                src={popup.imagePath}
                alt={popup.imageAlt ?? ""}
                fill
                className="object-cover"
                sizes="(max-width: 600px) 92vw, 480px"
              />
            </div>
          ) : null}

          {hasBody ? (
            <div className="px-7 pt-10 pb-8">
              {heading ? (
                <p className="wealth-display m-0 pr-8">{heading}</p>
              ) : null}

              {hasText && popup.content ? (
                <div
                  className={heading ? "mt-4" : undefined}
                  style={{ color: "var(--wealth-ink)" }}
                >
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              ) : null}

              {ctaUrl ? (
                <div className="mt-7">
                  <WealthLedgeButton href={ctaUrl} onClick={close}>
                    {ctaLabel.length > 0 ? ctaLabel : "Learn more"}
                  </WealthLedgeButton>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </PopupModal>
  );
}
