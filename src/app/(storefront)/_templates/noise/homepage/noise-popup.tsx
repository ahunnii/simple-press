"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type NoisePopupProps = {
  popup: PopupConfig;
};

/**
 * The owner's popup (B2.4), printed on the same stock as the rest of noise:
 * a paper card with a hairline border, an italic serif heading and a mono
 * "stamp" CTA (reuses the existing `.vn-stamp`/`.vn-stamp-solid` scoped
 * classes — no new global CSS). The platform owns the behaviour (once per
 * session, focus trap, Escape, reduced motion, backdrop click); this file
 * owns only the print.
 *
 * Every string here belongs to the owner's popup configuration, so there is
 * nothing to field. The one exception is the button's fallback label: the
 * popup schema leaves `ctaLabel` optional with no default, so the template
 * supplies one rather than render a button with no accessible name (mirrors
 * olive/vii).
 */
export function NoisePopup({ popup }: NoisePopupProps) {
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
        <div
          className="border-foreground relative overflow-hidden border"
          style={{ background: "var(--vn-paper)", width: "min(92vw, 480px)" }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="vn-focus-on-dark absolute top-3 right-3 z-10 flex items-center justify-center transition-opacity hover:opacity-60"
            style={{
              color: "var(--vn-ink)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              minWidth: "44px",
              minHeight: "44px",
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {popup.mode === "image" && popup.imagePath ? (
            <div className="relative" style={{ aspectRatio: "4/3" }}>
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
            <div className="px-8 py-10">
              {heading ? (
                <h2
                  className="font-serif leading-tight tracking-tight italic"
                  style={{
                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
                    letterSpacing: "-0.02em",
                    color: "var(--vn-ink)",
                  }}
                >
                  {heading}
                </h2>
              ) : null}

              {hasText ? (
                <div
                  className="font-sans leading-relaxed"
                  style={{
                    marginTop: heading ? "16px" : 0,
                    fontSize: "14px",
                    color: "var(--vn-ink-soft)",
                    lineHeight: 1.8,
                  }}
                >
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              ) : null}

              {ctaUrl ? (
                external ? (
                  <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={close}
                    className="vn-stamp vn-stamp-solid mt-7 inline-flex"
                  >
                    {ctaLabel || "Learn more"}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                ) : (
                  <Link
                    href={ctaUrl}
                    onClick={close}
                    className="vn-stamp vn-stamp-solid mt-7 inline-flex"
                  >
                    {ctaLabel || "Learn more"}
                  </Link>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </PopupModal>
  );
}
