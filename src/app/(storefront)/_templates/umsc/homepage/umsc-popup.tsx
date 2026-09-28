"use client";

import Image from "next/image";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { cn } from "~/lib/utils";

import { UmscButton } from "../shared/umsc-button";

type Props = {
  popup: PopupConfig;
};

/**
 * UmscPopup — the owner's announcement popup (design.md doesn't spec this
 * band directly; B2.4 requires it wired on every template that ships
 * `resolvePopup`). Printed in umsc's own stock: a paper card with a hairline
 * border, the short gold rule that hands off every dark→light section
 * transition elsewhere in the template, a Marcellus heading, Work Sans body
 * and a gold pill CTA (reused `UmscButton`). `PopupModal` owns the behavior
 * — once-per-session, focus trap, Esc, backdrop click, reduced motion; this
 * file owns only the print (pollen/noise/olive reference pattern).
 *
 * Every string here belongs to the owner's popup configuration (Content →
 * Popups), so there are no template fields to declare. The one exception is
 * the CTA's fallback label: the popup schema leaves `ctaLabel` optional with
 * no default, so the template supplies one rather than render a pill with no
 * accessible name (matches default/olive/noise/vii).
 */
export function UmscPopup({ popup }: Props) {
  const heading = (popup.heading ?? "").trim();
  const ctaUrl = (popup.ctaUrl ?? "").trim();
  const ctaLabel = (popup.ctaLabel ?? "").trim();
  const hasText = popup.mode === "text" && popup.content !== null;
  const hasBody = heading.length > 0 || ctaUrl.length > 0 || hasText;
  const external = /^https?:\/\//i.test(ctaUrl);

  return (
    <PopupModal
      version={popup.version}
      ariaLabel={heading.length > 0 ? heading : "Announcement"}
    >
      {(close) => (
        <div className="relative w-[min(92vw,480px)] overflow-hidden border border-[var(--umsc-line)] bg-[var(--umsc-white)]">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-2 right-2 z-10 flex size-11 items-center justify-center text-[var(--umsc-ink)] transition-opacity hover:opacity-60"
          >
            <X className="size-4" aria-hidden="true" />
          </button>

          {popup.mode === "image" && popup.imagePath ? (
            <div className="relative aspect-[4/3] w-full bg-[var(--umsc-cream)]">
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
            <div className="p-8 pt-10">
              <div
                aria-hidden="true"
                className="mb-6 h-px w-12 bg-[var(--umsc-gold)]"
              />

              {heading ? (
                <p className="umsc-serif text-[26px] leading-[1.2] font-normal text-[var(--umsc-ink)]">
                  {heading}
                </p>
              ) : null}

              {hasText && popup.content ? (
                <div
                  className={cn(
                    "umsc-sans text-[15px] leading-[1.6] text-[var(--umsc-muted)]",
                    heading ? "mt-3" : undefined,
                  )}
                >
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              ) : null}

              {ctaUrl ? (
                // UmscButton's link variant takes no onClick, so the popup's
                // dismissal is recorded from the bubbled click instead — a
                // keyboard activation of the link fires the same click event,
                // so this covers both pointer and keyboard (olive precedent).
                <span className="mt-7 inline-block" onClick={close}>
                  <UmscButton
                    variant="gold"
                    href={ctaUrl}
                    external={external}
                    showArrow={false}
                  >
                    {ctaLabel.length > 0 ? ctaLabel : "Learn more"}
                  </UmscButton>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </PopupModal>
  );
}
