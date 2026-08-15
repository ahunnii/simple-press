import { cn } from "~/lib/utils";

/**
 * Circular photo "porthole" — the template's second visual signature after the
 * wave (design.md → Identity / Shared component inventory).
 *
 * The clone masked these with a broken two-arc SVG `clipPath`; per design.md
 * deviation #7 the template uses `border-radius: 50%` on an overflow-hidden
 * wrapper instead, so the crop is resolution-independent and never collapses.
 */
export function RelocationCircleImage({
  src,
  alt,
  size,
  className,
  eager = false,
}: {
  src: string;
  alt: string;
  /** Rendered diameter in px — also the intrinsic width/height on the <img>. */
  size: number;
  className?: string;
  /** Set for above-the-fold hero photos so they are not lazy-loaded. */
  eager?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-full overflow-hidden rounded-full",
        className,
      )}
      style={{ width: `${size}px` }}
    >
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        className="block h-full w-full object-cover"
      />
    </div>
  );
}
