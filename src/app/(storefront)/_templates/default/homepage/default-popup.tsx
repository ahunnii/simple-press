"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import type { PopupConfig } from "~/lib/validators/site-banner";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PopupModal } from "~/components/site-banner/popup-modal";

type DefaultPopupProps = {
  popup: PopupConfig;
};

export function DefaultPopup({ popup }: DefaultPopupProps) {
  return (
    <PopupModal
      version={popup.version}
      ariaLabel={popup.heading ?? "Announcement"}
    >
      {(close) => (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e8e8e8",
            borderRadius: "var(--radius)",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)",
            width: "min(92vw, 500px)",
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
              top: "12px",
              right: "12px",
              zIndex: 1,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#0a0a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              minWidth: "36px",
              minHeight: "36px",
              opacity: 0.45,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.45";
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {popup.mode === "image" ? (
            /* ── Image mode ─────────────────────────────────────────── */
            <>
              {popup.imagePath && (
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 3",
                    width: "100%",
                    background: "#f6f6f6",
                  }}
                >
                  <Image
                    src={popup.imagePath}
                    alt={popup.imageAlt ?? ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 600px) 92vw, 500px"
                  />
                </div>
              )}

              {(popup.heading ?? popup.ctaUrl) && (
                <div style={{ padding: "20px 24px 24px" }}>
                  {popup.heading && (
                    <p
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#0a0a0a",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.3,
                        marginBottom: popup.ctaUrl ? "14px" : 0,
                      }}
                    >
                      {popup.heading}
                    </p>
                  )}

                  {popup.ctaUrl && (
                    <DefaultCtaLink
                      href={popup.ctaUrl}
                      label={popup.ctaLabel ?? "Learn more"}
                      onClick={close}
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            /* ── Text mode ───────────────────────────────────────────── */
            <div style={{ padding: "40px 24px 24px" }}>
              {popup.heading && (
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "#0a0a0a",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                    marginBottom: "12px",
                  }}
                >
                  {popup.heading}
                </p>
              )}

              {popup.content !== null && (
                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.65,
                    color: "#6b6b6b",
                  }}
                >
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              )}

              {popup.ctaUrl && (
                <div style={{ marginTop: "20px" }}>
                  <DefaultCtaLink
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

function DefaultCtaLink({
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
    gap: "6px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#0a0a0a",
    textDecoration: "none",
    borderBottom: "1px solid currentColor",
    paddingBottom: "2px",
    transition: "opacity 0.15s",
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
        {label} <span aria-hidden="true">→</span>
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} style={ctaStyle} onClick={onClick}>
      {label} <span aria-hidden="true">→</span>
    </Link>
  );
}
