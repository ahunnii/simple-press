"use client";

import { useEffect, useRef, useState } from "react";

import { OliveLeafMark } from "../shared/olive-leaf-mark";

/**
 * Event name any olive component dispatches on `window` after a successful
 * add-to-cart. Payload is `OliveCartAddedDetail`.
 *
 *   window.dispatchEvent(
 *     new CustomEvent(OLIVE_CART_ADDED_EVENT, { detail: { name: product.name } }),
 *   );
 *
 * Fire it AFTER `addItem(...)`, never before — the toast is a confirmation,
 * not an optimistic guess. The header's cart badge pulses off the cart count
 * itself and does not listen to this event, so a dispatch is never required
 * for the badge to animate.
 */
export const OLIVE_CART_ADDED_EVENT = "olive:cart-added";

export type OliveCartAddedDetail = {
  /** Product (and, when it matters, variant) name. Optional. */
  name?: string;
};

/** How long the card stays up before it starts leaving. */
const VISIBLE_MS = 2400;
/** Must match the exit transition on `.olive-toast` in globals.css. */
const EXIT_MS = 260;

type ToastItem = { id: number; name: string };

/**
 * "Every transition announced" — the add-to-bag confirmation. A small white
 * card bottom-right carrying the leaf rivet, the confirmation and the item's
 * name, up for 2.4s.
 *
 * Mounted once by `OliveLayout`. The live region wrapper is always in the DOM
 * so assistive tech announces the message when it appears rather than
 * announcing the region itself arriving.
 */
export function OliveToast() {
  const [item, setItem] = useState<ToastItem | null>(null);
  const [open, setOpen] = useState(false);
  const counter = useRef(0);

  useEffect(() => {
    const onAdded = (event: Event) => {
      const detail = (event as CustomEvent<OliveCartAddedDetail>).detail;
      const name = typeof detail?.name === "string" ? detail.name.trim() : "";
      counter.current += 1;
      setItem({ id: counter.current, name });
    };

    window.addEventListener(OLIVE_CART_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(OLIVE_CART_ADDED_EVENT, onAdded);
  }, []);

  // Keyed on the item id, so a second add while the first card is still up
  // replays the entrance instead of silently extending it.
  useEffect(() => {
    if (!item) return;

    setOpen(false);
    const frame = requestAnimationFrame(() => setOpen(true));
    const hide = setTimeout(() => setOpen(false), VISIBLE_MS);
    const clear = setTimeout(() => setItem(null), VISIBLE_MS + EXIT_MS);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [item]);

  return (
    <div className="olive-toast-region" role="status" aria-live="polite">
      {item ? (
        <div className="olive-toast" data-state={open ? "open" : "closed"}>
          <span
            className="flex items-center"
            style={{ color: "var(--olive-leaf)" }}
          >
            <OliveLeafMark size={18} />
          </span>
          <span className="min-w-0">
            <span
              className="block text-[0.875rem] leading-tight font-medium"
              style={{ color: "var(--olive-ink)" }}
            >
              Added to bag
            </span>
            {item.name ? (
              <span
                className="block truncate text-[0.8125rem] leading-snug"
                style={{ color: "var(--olive-ink-soft)" }}
              >
                {item.name}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
