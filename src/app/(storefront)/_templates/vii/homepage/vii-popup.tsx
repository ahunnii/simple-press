"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type ViiPopupProps = {
  popup: PopupConfig;
};

export function ViiPopup({ popup }: ViiPopupProps) {
  return (
    <PopupModal
      version={popup.version}
      ariaLabel={popup.heading ?? "Announcement"}
    >
      {(close) => (
        <div
          style={{
            background: "var(--vii-paper)",
            border:
              "1px solid color-mix(in srgb, var(--vii-navy) 12%, transparent)",
            borderRadius: "var(--radius)",
            boxShadow:
              "0 24px 64px color-mix(in srgb, var(--vii-navy) 28%, transparent)",
            width: "min(92vw, 520px)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            aria-label="Close popup"
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              zIndex: 1,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--vii-navy)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              minWidth: "36px",
              minHeight: "36px",
              opacity: 0.6,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.6";
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {popup.mode === "image" ? (
            /* ── Image mode ─────────────────────────────────────────────── */
            <>
              {popup.imagePath && (
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 3",
                    width: "100%",
                  }}
                >
                  <Image
                    src={popup.imagePath}
                    alt={popup.imageAlt ?? ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 600px) 92vw, 520px"
                  />
                </div>
              )}

              {(popup.heading ?? popup.ctaUrl) && (
                <div style={{ padding: "24px 28px 28px" }}>
                  {popup.heading && (
                    <p
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: "20px",
                        fontWeight: 500,
                        color: "var(--vii-navy)",
                        letterSpacing: "0.01em",
                        lineHeight: 1.3,
                        marginBottom: popup.ctaUrl ? "16px" : 0,
                      }}
                    >
                      {popup.heading}
                    </p>
                  )}

                  {popup.ctaUrl && (
                    <CtaLink
                      href={popup.ctaUrl}
                      label={popup.ctaLabel ?? "Learn More"}
                      onClick={close}
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            /* ── Text mode ───────────────────────────────────────────────── */
            <div style={{ padding: "44px 28px 28px" }}>
              {popup.heading && (
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: "22px",
                    fontWeight: 500,
                    color: "var(--vii-navy)",
                    letterSpacing: "0.01em",
                    lineHeight: 1.3,
                    marginBottom: "16px",
                  }}
                >
                  {popup.heading}
                </p>
              )}

              {popup.content !== null && (
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    lineHeight: 1.65,
                    color: "var(--vii-ink-soft)",
                    letterSpacing: "0.02em",
                  }}
                >
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              )}

              {popup.ctaUrl && (
                <div style={{ marginTop: "24px" }}>
                  <CtaLink
                    href={popup.ctaUrl}
                    label={popup.ctaLabel ?? "Learn More"}
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

function CtaLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  const isExternal = /^https?:\/\//i.test(href);
  const ctaStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    fontFamily: "var(--font-sans)",
    fontSize: "11px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontWeight: 500,
    padding: "11px 22px",
    background: "var(--vii-copper-deep)",
    color: "var(--vii-paper)",
    textDecoration: "none",
    borderRadius: "var(--radius)",
    transition: "opacity 0.2s",
    whiteSpace: "nowrap",
  };

  if (isExternal) {
    return (
      <a
        href={href}
        style={ctaStyle}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
      >
        {label}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} style={ctaStyle} onClick={onClick}>
      {label}
    </Link>
  );
}
