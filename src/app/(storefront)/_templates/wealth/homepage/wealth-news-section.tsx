import type { WealthNewsItem } from "./wealth-homepage-news";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLink } from "../shared/wealth-link";
import { WealthSection } from "../shared/wealth-section";

type Props = {
  heading: string;
  items: WealthNewsItem[];
};

/**
 * In the News — centered bold-italic heading, then stacked external press
 * links with muted source/date citations underneath. `items` always has at
 * least one row (see `toWealthNewsRows`'s fallback), so no empty state is
 * needed here.
 */
export function WealthNewsSection({ heading, items }: Props) {
  return (
    <WealthSection sectionAttrs={sectionGroupAttr("homepage", "news")}>
      <div className="mx-auto max-w-2xl">
        <h2
          className="mb-[var(--wealth-rhythm)] text-center"
          style={{
            fontFamily: "var(--font-wealth-sub)",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "21px",
            lineHeight: 1.4,
            letterSpacing: "0.21px",
            color: "var(--wealth-ink)",
            margin: 0,
          }}
        >
          <span {...fieldAttr("wealth.homepage.news-heading")}>{heading}</span>
        </h2>

        <ul className="mt-[var(--wealth-rhythm)] space-y-[var(--wealth-rhythm)]">
          {items.map((item, i) => (
            <li key={`${item.url}-${i}`}>
              <WealthLink href={item.url} className="block">
                {item.title}
              </WealthLink>
              {item.source ? (
                <p className="mt-1 text-sm text-[var(--wealth-muted)]">
                  {item.source}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </WealthSection>
  );
}
