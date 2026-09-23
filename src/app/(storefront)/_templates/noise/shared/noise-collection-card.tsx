import Image from "next/image";
import Link from "next/link";

import { cn } from "~/lib/utils";

/* ─── Category silhouettes ───────────────────────────────────────────────
   Shared fallback artwork for collections without a cover image. Used to
   be duplicated between the collections index and detail pages. */
const SILHOUETTES: Record<string, string> = {
  wrap: "M30 10 Q50 0 70 10 Q80 30 75 50 Q90 70 80 100 Q70 130 50 130 Q30 130 20 100 Q10 70 25 50 Q20 30 30 10 Z",
  dress: "M40 8 L60 8 L62 25 L75 50 L82 130 L18 130 L25 50 L38 25 Z",
  coat: "M35 8 L65 8 L80 28 L88 60 L84 130 L62 130 L60 75 L50 130 L40 75 L38 130 L16 130 L12 60 L20 28 Z",
  scarf:
    "M15 25 Q35 18 50 30 Q65 42 85 28 L88 35 Q70 55 50 45 Q30 35 18 50 Z M50 40 L42 130 L58 130 Z",
  default: "M35 8 L65 8 L80 28 L88 130 L12 130 L20 28 Z",
};

function getCategorySilhouette(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("wrap")) return SILHOUETTES.wrap!;
  if (lower.includes("dress") || lower.includes("skirt"))
    return SILHOUETTES.dress!;
  if (lower.includes("coat") || lower.includes("jacket"))
    return SILHOUETTES.coat!;
  if (lower.includes("scarf")) return SILHOUETTES.scarf!;
  return SILHOUETTES.default!;
}

/**
 * True when `src` is a real, owner-supplied image. Several platform fields
 * ship `/placeholder.svg` as their default, so a bare truthiness check would
 * render the platform's grey placeholder instead of the template's own
 * silhouette fallback.
 */
function hasNoiseImage(src: string | null | undefined): boolean {
  return (
    typeof src === "string" &&
    src.trim().length > 0 &&
    src !== "/placeholder.svg"
  );
}

export type NoiseCollectionCardData = {
  name: string;
  slug: string;
  imageUrl: string | null;
  _count?: { collectionProducts: number };
};

type NoiseCollectionCardProps = {
  collection: NoiseCollectionCardData;
  index: number;
  /** Index-page cards are "4/3" (default); the detail page's "more
   *  collections" grid uses "4/5". */
  aspect?: "4/3" | "4/5";
  /** Renders the "01" `vn-cat-num` + a text item count instead of the
   *  image-panel count stamp. Default false. */
  showNumber?: boolean;
  sizes?: string;
  /** Extra classes on the root `Link`. */
  className?: string;
};

/**
 * NoiseCollectionCard — shared between the collections index, the collection
 * detail page's "more collections" grid, and the homepage collections
 * showcase. Two visual variants, chosen by `aspect`/`showNumber`:
 *  - index (4/3, count stamp on the image, "View →" in the meta row)
 *  - detail "more collections" (4/5, numbered, count as text in the meta row)
 * Both draw the cover image when set, falling back to the steel gradient +
 * category silhouette otherwise. No description — this card never shows one.
 */
export function NoiseCollectionCard({
  collection,
  index,
  aspect = "4/3",
  showNumber = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
  className,
}: NoiseCollectionCardProps) {
  const count = collection._count?.collectionProducts;
  const hasImage = hasNoiseImage(collection.imageUrl);

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className={cn(
        "vn-cat-card group border-foreground flex flex-col overflow-hidden border",
        className,
      )}
      style={{ background: "var(--vn-paper)" }}
    >
      {/* Image panel — cover image when set, else steel gradient + silhouette */}
      <div
        className="border-foreground relative overflow-hidden border-b"
        style={{
          aspectRatio: aspect === "4/5" ? "4/5" : "4/3",
          background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
        }}
      >
        {hasImage ? (
          <Image
            src={collection.imageUrl!}
            alt={collection.name}
            fill
            sizes={sizes}
            className="object-cover object-top transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <svg
            viewBox="0 0 100 140"
            className="absolute inset-0 h-full w-full"
            style={{ padding: aspect === "4/5" ? "10%" : "8%" }}
            aria-hidden="true"
          >
            <path
              d={getCategorySilhouette(collection.name)}
              fill="var(--vn-bone)"
              opacity={aspect === "4/5" ? 0.9 : 0.85}
            />
          </svg>
        )}

        {/* Count stamp — index variant only; the detail variant shows the
            count as text in the meta row instead. */}
        {!showNumber && count !== undefined && (
          <div
            className="absolute top-3 right-3 px-2 py-1 font-mono text-[9.5px] tracking-[0.18em] uppercase"
            style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
          >
            {count} {count === 1 ? "item" : "items"}
          </div>
        )}
      </div>

      {/* Meta */}
      {showNumber ? (
        <div className="vn-cat-meta flex flex-col gap-1 px-3.5 py-3.5">
          <span className="vn-cat-num font-mono text-[10px] tracking-[0.22em] text-(--vn-steel) uppercase transition-colors duration-200">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className="vn-cat-name font-serif leading-[1.15] text-(--vn-ink) italic transition-colors duration-200"
            style={{
              fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
              letterSpacing: "-0.01em",
            }}
          >
            {collection.name}
          </span>
          {count !== undefined && (
            <span className="vn-cat-count font-mono text-[10px] tracking-[0.18em] text-(--vn-ink-soft) uppercase transition-colors duration-200">
              {count} {count === 1 ? "piece" : "pieces"}
            </span>
          )}
        </div>
      ) : (
        <div className="vn-cat-meta flex items-end justify-between gap-3 px-4 py-4">
          <span
            className="vn-cat-name block font-serif leading-[1.1] text-(--vn-ink) italic transition-colors duration-200 group-hover:text-(--vn-bone)"
            style={{
              fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)",
              letterSpacing: "-0.01em",
            }}
          >
            {collection.name}
          </span>
          <span className="vn-cat-count flex-shrink-0 font-mono text-[9.5px] tracking-[0.18em] text-(--vn-steel-mist) uppercase transition-colors duration-200">
            View →
          </span>
        </div>
      )}
    </Link>
  );
}
