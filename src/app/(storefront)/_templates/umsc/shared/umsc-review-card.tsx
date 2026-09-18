import { Star } from "lucide-react";

type Props = {
  quote: string;
  name: string;
  /** e.g. "Google review", "Verified buyer". */
  source?: string;
};

/** UmscReviewCard — cream card, 5 gold stars, quote, name, source line. */
export function UmscReviewCard({ quote, name, source }: Props) {
  return (
    <figure className="flex flex-col gap-4 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-6">
      <div aria-hidden="true" className="flex gap-1 text-[var(--umsc-gold)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="size-[15px]"
            fill="currentColor"
            strokeWidth={0}
          />
        ))}
      </div>
      <blockquote className="umsc-serif m-0 text-[19px] leading-[1.4] text-[var(--umsc-ink)]">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
        <span className="font-semibold text-[var(--umsc-ink)]">{name}</span>
        {source && <> &middot; {source}</>}
      </figcaption>
    </figure>
  );
}
