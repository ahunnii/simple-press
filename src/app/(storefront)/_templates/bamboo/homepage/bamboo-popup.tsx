"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { Button } from "~/components/ui/button";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type BambooPopupProps = {
  popup: PopupConfig;
};

/**
 * BambooPopup — business announcement popup for the bamboo homepage,
 * following the `default.homepage` popup pattern (`resolvePopup` +
 * `PopupModal`, gated on the `popups` flag by the caller —
 * `bamboo-homepage.tsx`). Show-once/dismiss, focus trapping, Esc-to-close and
 * focus-return all live in `PopupModal`; this component only supplies the
 * bamboo-styled card (cream surface, gold hairline, serif heading, forest
 * pill CTA), following `pollen/homepage/pollen-popup.tsx` and
 * `happy-bamboo/homepage/happy-bamboo-popup.tsx`.
 *
 * `PopupModal` is a plain fixed-position render, not a Radix portal (no
 * `createPortal`) — it mounts in place in the React tree, so it inherits the
 * `.bamboo` wrapper's tokens/fonts without needing a `container` prop (the
 * portal rule in docs/templates/bamboo/design.md only reaches Radix
 * Dialog/Sheet/Select/Popover).
 */
export function BambooPopup({ popup }: BambooPopupProps) {
  return (
    <PopupModal
      version={popup.version}
      ariaLabel={popup.heading ?? "Announcement"}
    >
      {(close) => (
        <div className="relative w-[min(92vw,480px)] overflow-hidden rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream)] shadow-xl">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label="Close popup"
            className="absolute top-3 right-3 z-10 rounded-full text-[var(--bam-forest)]/60 hover:bg-[var(--bam-cream-deep)] hover:text-[var(--bam-forest-deep)]"
          >
            <X aria-hidden="true" />
          </Button>

          {popup.mode === "image" ? (
            <>
              {popup.imagePath && (
                <div className="relative aspect-4/3 w-full bg-[var(--bam-cream-deep)]">
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
                    <p className="text-foreground mb-3.5 font-serif text-lg font-bold tracking-tight">
                      {popup.heading}
                    </p>
                  )}
                  {popup.ctaUrl && (
                    <BambooPopupCta
                      href={popup.ctaUrl}
                      label={popup.ctaLabel ?? "Learn more"}
                      onClose={close}
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 pt-10">
              {popup.heading && (
                <p className="text-foreground mb-3 font-serif text-xl font-bold tracking-tight">
                  {popup.heading}
                </p>
              )}

              {popup.content !== null && (
                <div className="text-muted-foreground text-sm leading-relaxed">
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              )}

              {popup.ctaUrl && (
                <div className="mt-5">
                  <BambooPopupCta
                    href={popup.ctaUrl}
                    label={popup.ctaLabel ?? "Learn more"}
                    onClose={close}
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

function BambooPopupCta({
  href,
  label,
  onClose,
}: {
  href: string;
  label: string;
  onClose: () => void;
}) {
  const isExternal = /^https?:\/\//i.test(href);
  const className =
    "group inline-flex items-center gap-2.5 rounded-full bg-[var(--bam-forest)] px-6 py-2.5 text-sm font-semibold tracking-wider text-[var(--bam-cream)] uppercase transition-colors hover:bg-[var(--bam-forest-deep)]";

  if (isExternal) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer" onClick={onClose}>
        {label}
        <ArrowRight
          className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClose}>
      {label}
      <ArrowRight
        className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}
