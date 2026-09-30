"use client";

import Image from "next/image";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";

type DreamPopupProps = {
  popup: PopupConfig;
};

/**
 * The owner's announcement popup (baseline B2.4), printed in dream's own
 * voice: a paper card (hairline gold border, `--dream-radius-card`,
 * `--dream-shadow-card`) with an Italiana `h3` heading and an ink-pill CTA.
 * The platform owns the accessible behaviour — dialog role, focus trap +
 * return, Escape, once-per-session, reduced motion (`PopupModal`, see
 * `~/components/site-banner/popup-modal.tsx`); this file owns only the
 * print, same division of labor as `OlivePopup`/`PollenPopup`.
 *
 * Every string here is the owner's own popup configuration (site banner
 * settings, not a template field) — nothing to field. The one exception is
 * the CTA's fallback label: the popup schema leaves `ctaLabel` optional with
 * no default, so the template supplies one rather than ship a pill with no
 * accessible name.
 */
export function DreamPopup({ popup }: DreamPopupProps) {
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
          className="relative w-[min(92vw,30rem)] overflow-hidden rounded-[var(--dream-radius-card)] border border-[var(--dream-line)] bg-[var(--dream-white)]"
          style={{ boxShadow: "var(--dream-shadow-card)" }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border border-[var(--dream-line)] bg-[var(--dream-paper)] text-[var(--dream-ink)] transition-opacity hover:opacity-70"
          >
            <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>

          {popup.mode === "image" && popup.imagePath ? (
            <div className="relative aspect-4/3 w-full bg-[var(--dream-sky)]">
              <Image
                src={popup.imagePath}
                alt={popup.imageAlt ?? ""}
                fill
                sizes="(max-width: 600px) 92vw, 30rem"
                className="object-cover"
              />
            </div>
          ) : null}

          {hasBody ? (
            <div className="flex flex-col items-start gap-4 p-8">
              {heading ? (
                <DreamHeading as="h3">{heading}</DreamHeading>
              ) : null}

              {hasText && popup.content ? (
                <div className="max-w-[46ch] text-[15px] leading-relaxed text-[var(--dream-soft)] [&_a]:text-[var(--dream-rose)] [&_a]:underline [&_a]:underline-offset-2 [&_p+p]:mt-3">
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              ) : null}

              {ctaUrl ? (
                // `DreamButton`'s link variant takes no `onClick` (it renders
                // a Next `Link`/anchor), so the dismissal is recorded from
                // the bubbled click on this wrapper instead — keyboard
                // activation of a link fires the same click event, so this
                // covers both. Same technique as `OlivePopup`.
                <span className="contents" onClick={close}>
                  <DreamButton href={ctaUrl} variant="primary">
                    {ctaLabel.length > 0 ? ctaLabel : "Take a look"}
                  </DreamButton>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </PopupModal>
  );
}
