import Image from "next/image";
import Link from "next/link";

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

type SledgeCollectionCardProps = {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  count: number;
  /** Compact layout for “More Collections” rails */
  compact?: boolean;
};

export function SledgeCollectionCard({
  name,
  slug,
  description,
  imageUrl,
  count,
  compact = false,
}: SledgeCollectionCardProps) {
  const countLabel = `${count} ${count === 1 ? "piece" : "pieces"}`;

  return (
    <div className="group relative">
      <Link
        href={`/collections/${slug}`}
        className="sledge-collection-img relative block w-full overflow-hidden rounded-2xl"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            sizes={
              compact
                ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            }
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--sl-green)]">
            <svg
              viewBox="0 0 100 140"
              className="absolute inset-0 h-full w-full p-[10%]"
              aria-hidden="true"
            >
              <path
                d={getCategorySilhouette(name)}
                fill="var(--sl-cream)"
                opacity="0.9"
              />
            </svg>
          </div>
        )}

        <div className="sledge-badge-default absolute top-2.5 left-2.5 px-1.5 py-1 font-sans text-[10px] tracking-[0.18em] whitespace-nowrap uppercase">
          {countLabel}
        </div>
      </Link>

      <div className={compact ? "sledge-collection-meta-compact" : "sledge-collection-meta"}>
        <h3 className={compact ? "sledge-collection-name-compact" : "sledge-collection-name"}>
          <Link
            href={`/collections/${slug}`}
            className="font-serif transition-opacity hover:opacity-60"
          >
            {name}
          </Link>
        </h3>

        {!compact && description && (
          <p className="sl-eyebrow mt-1.5 line-clamp-2 font-sans text-sm leading-relaxed">
            {description}
          </p>
        )}

        <span aria-hidden="true" className="sledge-collection-cta">View collection →</span>
      </div>
    </div>
  );
}
