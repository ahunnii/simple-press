"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { Button } from "~/components/ui/button";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type HappyBambooPopupProps = {
  popup: PopupConfig;
};

/**
 * HappyBambooPopup — business announcement popup for the happy-bamboo
 * homepage, following the `default.homepage` popup pattern (`resolvePopup` +
 * `PopupModal`, gated on the `popups` flag by the caller — see
 * `happy-bamboo-homepage.tsx`). Show-once/dismiss, focus trapping and
 * Esc-to-close all live in `PopupModal`; this component only supplies the
 * happy-bamboo–styled card (rounded surface, serif heading, primary CTA)
 * following `pollen/homepage/pollen-popup.tsx`.
 */
export function HappyBambooPopup({ popup }: HappyBambooPopupProps) {
  return (
    <PopupModal
      version={popup.version}
      ariaLabel={popup.heading ?? "Announcement"}
    >
      {(close) => (
        <div className="border-border bg-card relative w-[min(92vw,480px)] overflow-hidden rounded-2xl border shadow-xl">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label="Close popup"
            className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-3 right-3 z-10 rounded-full"
          >
            <X aria-hidden="true" />
          </Button>

          {popup.mode === "image" ? (
            <>
              {popup.imagePath && (
                <div className="bg-muted relative aspect-4/3 w-full">
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
                    <p className="text-foreground mb-3.5 font-serif text-lg font-bold">
                      {popup.heading}
                    </p>
                  )}
                  {popup.ctaUrl && (
                    <HappyBambooPopupCta
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
                <p className="text-foreground mb-3 font-serif text-xl font-bold">
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
                  <HappyBambooPopupCta
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

function HappyBambooPopupCta({
  href,
  label,
  onClose,
}: {
  href: string;
  label: string;
  onClose: () => void;
}) {
  const isExternal = /^https?:\/\//i.test(href);

  if (isExternal) {
    return (
      <Button asChild>
        <a href={href} target="_blank" rel="noreferrer" onClick={onClose}>
          {label}
          <span aria-hidden="true">→</span>
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      </Button>
    );
  }

  return (
    <Button asChild>
      <Link href={href} onClick={onClose}>
        {label}
        <span aria-hidden="true">→</span>
      </Link>
    </Button>
  );
}
