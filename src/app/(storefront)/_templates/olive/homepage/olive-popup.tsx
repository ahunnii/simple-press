"use client";

import Image from "next/image";
import { X } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { PopupConfig } from "~/lib/validators/site-banner";
import { PopupModal } from "~/components/site-banner/popup-modal";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { OliveButton } from "../shared";

type Props = {
  popup: PopupConfig;
};

/**
 * The owner's popup, printed on the house stock: a square ivory sheet with a
 * hairline edge, an optional photograph, a Bodoni heading and the espresso
 * `solid` button with its drawn arrow. It is floating UI, so it may take the
 * template's one soft shadow. The platform owns the behaviour (once per
 * session, focus trap, Escape, reduced motion); this file owns only the print.
 *
 * Every string here belongs to the owner's popup configuration, so there is
 * nothing to field. The one exception is the button's fallback label: the
 * popup schema leaves `ctaLabel` optional with no default, so the template
 * supplies one rather than render a button with no accessible name (the
 * Default template does the same).
 */
export function OlivePopup({ popup }: Props) {
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
          className="relative w-[min(92vw,32rem)] overflow-hidden"
          style={{
            backgroundColor: "var(--olive-ivory)",
            border: "1px solid var(--olive-hairline)",
            boxShadow: "var(--olive-shadow)",
            color: "var(--olive-espresso)",
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="olive-icon-btn absolute top-1 right-1 z-10"
            style={{ backgroundColor: "var(--olive-ivory)" }}
          >
            <X aria-hidden="true" size={18} strokeWidth={1.5} />
          </button>

          {popup.mode === "image" && popup.imagePath ? (
            <div
              className="relative aspect-[4/3] w-full"
              style={{ backgroundColor: "var(--olive-sand)" }}
            >
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
            <div
              className="flex flex-col items-start gap-5"
              style={{ padding: "clamp(1.75rem, 5vw, 2.5rem)" }}
            >
              {heading ? (
                <p className="olive-h3 pr-8" style={{ fontSize: "1.75rem" }}>
                  {heading}
                </p>
              ) : null}

              {hasText && popup.content ? (
                <div className="olive-body">
                  <TiptapRenderer content={popup.content as TiptapJSON} />
                </div>
              ) : null}

              {ctaUrl ? (
                // `OliveButton` renders an anchor here, and an anchor takes no
                // onClick from that API — so the dismissal is recorded from the
                // bubbled click instead. Keyboard activation of a link fires the
                // same click event, so this covers both.
                <span className="contents" onClick={close}>
                  <OliveButton
                    variant="solid"
                    arrow
                    href={ctaUrl}
                    className="mt-1"
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                  >
                    {ctaLabel.length > 0 ? ctaLabel : "Take a look"}
                  </OliveButton>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </PopupModal>
  );
}
