import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

type Props = {
  /**
   * The event. Only the two fields the gate reads are required, so any
   * template's event shape (`events.getUpcomingPublic[number]`,
   * `events.getBySlug`) satisfies it structurally.
   */
  event: { externalUrl: string | null; linkQrEnabled: boolean };
  /** `SiteContent.logoUrl` — knocked out of the QR's center when present. */
  logoUrl?: string | null;
  /** `sm` → a 112px tile (cards, list rows), `lg` → 160px (detail pages). */
  size: "sm" | "lg";
  /** Replaces the default "Scan with your phone" line. */
  caption?: ReactNode;
  /** On the `<figure>`. */
  className?: string;
  /** On the `<figure>` — for template tokens a class can't express. */
  style?: CSSProperties;
  /** On the tile wrapping the QR. No border is applied by default. */
  tileClassName?: string;
  /** On the tile — e.g. `{ border: "1px solid var(--pink-line)" }`. */
  tileStyle?: CSSProperties;
  /** On the `<figcaption>`. */
  captionClassName?: string;
};

/**
 * The event's outbound link (`Event.externalUrl` — tickets, signup, Facebook)
 * rendered as a scannable QR code beside the link itself, so a shopper looking
 * at the events page on a screen or a tablet at the venue can carry it away on
 * their phone.
 *
 * **Gate:** renders `null` unless the owner turned the per-event
 * `linkQrEnabled` toggle on AND the event actually has an `externalUrl` — a QR
 * is meaningless without a destination, so the flag is inert on link-less
 * events.
 *
 * **Styling is entirely prop-driven.** This component owns only the gate and
 * the figure/tile/caption structure; every colour, border, radius and type
 * decision arrives from the call site. That is deliberate: it has to render
 * unchanged inside any template, so it must never reach for a template's own
 * tokens (`--pink-line`, `#e8e8e8`, …) — the same arrangement `BrandedQrCode`
 * itself uses, where the pink donate card passes its hairline as a `style`.
 *
 * No extra ARIA: the QR SVG is already `aria-hidden`, and the adjacent anchor
 * at every call site remains the accessible link to the same destination.
 *
 * Server component — `BrandedQrCode` is the `"use client"` leaf.
 */
export function EventLinkQr({
  event,
  logoUrl,
  size,
  caption,
  className,
  style,
  tileClassName,
  tileStyle,
  captionClassName,
}: Props) {
  if (!event.linkQrEnabled || !event.externalUrl) return null;

  return (
    <figure className={cn("flex items-center gap-4", className)} style={style}>
      <div
        className={cn("shrink-0 bg-white p-1.5", tileClassName)}
        style={tileStyle}
      >
        <BrandedQrCode
          value={event.externalUrl}
          logoUrl={logoUrl}
          className={size === "lg" ? "size-40" : "size-28"}
        />
      </div>
      <figcaption className={captionClassName}>
        {caption ?? "Scan with your phone"}
      </figcaption>
    </figure>
  );
}
