import { cn } from "~/lib/utils";

type Props = {
  src: string | null;
  /** Size/radius classes — e.g. `size-[88px] sm:size-[112px]`. */
  className?: string;
};

/**
 * Small hairline photo frame for cart / checkout line items. Decorative
 * (`alt=""`): the product name sits right beside it. Empty image slots get
 * a scaled-down version of `DreamImageFallback`'s look — the sky gradient
 * with the business mark — sized for a thumbnail (the shared fallback's
 * 220px min-height is meant for full photo frames).
 */
export function DreamLineThumb({ src, className }: Props) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border border-[var(--dream-line)] bg-[linear-gradient(180deg,var(--dream-sky)_0%,var(--dream-sky-deep)_100%)]",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- owner photo in a CSS-sized thumbnail; dream uses raw <img> like DreamPhoto
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative bundled mark, same raw <img> as DreamImageFallback */}
          <img
            src="/templates/dream/images/logo.webp"
            alt=""
            aria-hidden="true"
            className="w-1/2 max-w-12 object-contain opacity-35"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
