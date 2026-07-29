"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { PinkBadge } from "../shared/pink-badge";
import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkFilterChips } from "../shared/pink-filter-chips";
import { PinkReveal } from "../shared/pink-reveal";

export type PinkServiceCard = {
  id: string;
  href: string;
  imageUrl: string | null;
  name: string;
  description: string | null;
  priceLabel: string | null;
  durationLabel: string | null;
  category: string | null;
  isOneToOne: boolean;
};

type Props = {
  cards: PinkServiceCard[];
  headingSuffix: string;
  audienceOneLabel: string;
  audienceGroupLabel: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCtaLabel: string;
  emptyCtaHref: string;
};

const ALL_FILTER_ID = "all";

/**
 * Client-side filterable services grid (design.md → "services.grid"):
 * a hairline chip row built from the distinct `ServiceItem.category` values
 * present, above a 3-column card grid. Each card shows a 4:3 image, an
 * audience badge, then a `border-top` block with name + priceLabel on one
 * baseline, description, and a duration meta line.
 */
export function PinkServicesGrid({
  cards,
  headingSuffix,
  audienceOneLabel,
  audienceGroupLabel,
  emptyHeading,
  emptyBody,
  emptyCtaLabel,
  emptyCtaHref,
}: Props) {
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const card of cards) {
      if (card.category) seen.add(card.category);
    }
    return Array.from(seen);
  }, [cards]);

  const [activeCategory, setActiveCategory] = useState<string>(ALL_FILTER_ID);

  const visibleCards =
    activeCategory === ALL_FILTER_ID
      ? cards
      : cards.filter((card) => card.category === activeCategory);

  if (cards.length === 0) {
    return (
      <PinkEmptyState
        heading={emptyHeading}
        body={emptyBody}
        ctaLabel={emptyCtaLabel}
        ctaHref={emptyCtaHref}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h2
          className="pink-display"
          style={{
            fontSize: "clamp(26px, 2.8vw, 38px)",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          {cards.length} {headingSuffix}
        </h2>

        {categories.length > 0 && (
          <PinkFilterChips
            aria-label="Filter by category"
            activeId={activeCategory}
            onSelect={setActiveCategory}
            items={[
              { id: ALL_FILTER_ID, label: "All" },
              ...categories.map((c) => ({ id: c, label: c })),
            ]}
          />
        )}
      </div>

      {visibleCards.length === 0 ? (
        <PinkEmptyState
          heading={emptyHeading}
          body={emptyBody}
          ctaLabel={emptyCtaLabel}
          ctaHref={emptyCtaHref}
        />
      ) : (
        <div className="grid grid-cols-1 gap-[28px] sm:grid-cols-2 lg:grid-cols-3">
          {visibleCards.map((card, i) => (
            <PinkReveal key={card.id} index={i % 6} as="article">
              <Link href={card.href} className="group flex flex-col">
                <div
                  className="pink-lift relative block overflow-hidden"
                  style={{ aspectRatio: "4 / 3", background: "var(--pink-panel)" }}
                >
                  <Image
                    src={card.imageUrl ?? "/placeholder.svg"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <span className="absolute top-2.5 left-2.5">
                    <PinkBadge tone={card.isOneToOne ? "ink" : "rose"}>
                      {card.isOneToOne ? audienceOneLabel : audienceGroupLabel}
                    </PinkBadge>
                  </span>
                </div>

                <div
                  className="mt-3 flex items-baseline justify-between gap-3 pt-3"
                  style={{ borderTop: "1px solid var(--pink-ink)" }}
                >
                  <span
                    className="pink-display truncate text-[17px]"
                    style={{ fontWeight: 600, color: "var(--pink-ink)" }}
                  >
                    {card.name}
                  </span>
                  {card.priceLabel && (
                    <span
                      className="shrink-0 text-[15px] font-medium"
                      style={{ color: "var(--pink-ink)" }}
                    >
                      {card.priceLabel}
                    </span>
                  )}
                </div>

                {card.description && (
                  <p
                    className="mt-2 line-clamp-2 text-[15px] leading-[1.6]"
                    style={{ color: "var(--pink-muted)" }}
                  >
                    {card.description}
                  </p>
                )}

                {(card.durationLabel ?? card.category) && (
                  <p className="pink-label mt-2">
                    {[card.durationLabel, card.category].filter(Boolean).join(" · ")}
                  </p>
                )}
              </Link>
            </PinkReveal>
          ))}
        </div>
      )}
    </div>
  );
}
