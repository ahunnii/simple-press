"use client";

import Image from "next/image";

import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";

import { PINK_SCOPE_CLASS } from "../layout/pink-scope";
import {
  hasCustomImage,
  PinkImageFallback,
} from "../shared/pink-image-fallback";

/**
 * `EventFlierLightbox` renders through a Radix portal onto `document.body`,
 * which sits OUTSIDE the `.pink` wrapper `PinkLayout` puts the page in — so
 * every `var(--pink-*)` resolves to nothing and the template's
 * `border-radius: 0` reset (`.pink *`) never reaches the panel. Re-applying
 * the scope class on the panel is the same fix `pink-cart-drawer.tsx` uses for
 * its Sheet. `rounded-none` is still needed on the panel itself: the reset
 * only covers DESCENDANTS of `.pink`, and `DialogContent` ships `rounded-lg`.
 *
 * Owner theme presets (`resolveThemeVars`) are set as inline vars on the
 * layout root and can't follow the portal — the lightbox is a plain frame
 * around a full-bleed image, so it falls back to the base palette rather than
 * carrying a second copy of the theme.
 */
const LIGHTBOX_PANEL_CLASS = `${PINK_SCOPE_CLASS} rounded-none border-[var(--pink-line)] bg-[var(--pink-white)] shadow-none`;

type Props = {
  /** `Event.coverImage` — null/blank renders the template's own fallback. */
  src: string | null | undefined;
  /** Event name. Fliers carry words, so this is never decorative. */
  name: string;
  /** CSS `aspect-ratio` for the frame. Fliers are portrait, hence 3:4. */
  aspect?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * The flier frame shared by the `/events` cards and the homepage
 * `homepage.upcoming` band.
 *
 * This is the ONLY `"use client"` part of either surface: it exists so the
 * pages themselves can stay server components (and keep running
 * `resolveFields` / `isSectionVisible` on the server) while the lightbox
 * trigger still ships its handler.
 *
 * When there is no flier the frame renders `PinkImageFallback` with NO
 * lightbox trigger — an empty dialog would be a keyboard trap for no payoff,
 * and the fallback carries no alt text of its own (the card's heading already
 * names the event).
 */
export function PinkEventFlier({
  src,
  name,
  aspect = "3 / 4",
  sizes,
  priority = false,
  className,
}: Props) {
  const frameClassName = `relative w-full overflow-hidden${
    className ? ` ${className}` : ""
  }`;
  const frameStyle = {
    aspectRatio: aspect,
    background: "var(--pink-panel)",
  } satisfies React.CSSProperties;

  const flier = src ?? "";
  if (!hasCustomImage(flier)) {
    return (
      <div className={frameClassName} style={frameStyle}>
        <PinkImageFallback surface="paper" className="absolute inset-0" />
      </div>
    );
  }

  return (
    <EventFlierLightbox
      src={flier}
      alt={name}
      panelClassName={LIGHTBOX_PANEL_CLASS}
      closeLabel="Close flier"
    >
      <div className={frameClassName} style={frameStyle}>
        <Image
          src={flier}
          alt={name}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      </div>
    </EventFlierLightbox>
  );
}
