import Image from "next/image";

import { listItemAttr } from "~/lib/preview/section-attrs";

import {
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
} from "../shared";

export type GlovePromiseItem = {
  id: string;
  /** Index in the saved list (editor row targeting). */
  index: number;
  icon: string;
  title: string;
  detail: string;
};

type GloveHomePromiseProps = {
  items: GlovePromiseItem[];
  sectionAttrs?: Record<string, string>;
};

/** A quiet row of store promises with small purple icons. */
export function GloveHomePromise({
  items,
  sectionAttrs,
}: GloveHomePromiseProps) {
  if (items.length === 0) return null;
  return (
    <GloveSection
      aria-label="Our promises"
      sectionAttrs={sectionAttrs}
      padded={false}
      className="py-10 md:py-14"
    >
      <GloveRevealGroup threshold={0}>
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 sm:grid-cols-3 lg:grid-cols-5 [&>li:last-child:nth-child(odd)]:col-span-2 sm:[&>li:last-child:nth-child(odd)]:col-span-1">
          {items.map((item, i) => (
            <li
              key={item.id}
              className="glove-reveal-item flex flex-col items-center text-center"
              style={gloveRevealItemStyle(i)}
              {...listItemAttr("glove.homepage.promise-list", item.index)}
            >
              <div className="flex h-[72px] items-center justify-center">
                {item.icon ? (
                  <Image
                    src={item.icon}
                    alt=""
                    width={80}
                    height={72}
                    unoptimized
                    className="h-auto max-h-[72px] w-auto max-w-[84px]"
                  />
                ) : null}
              </div>
              <p className="glove-display mt-3 text-[16px] leading-snug font-semibold text-[var(--glove-ink)]">
                {item.title}
              </p>
              {item.detail ? (
                <p className="glove-body mt-1 text-[14px] leading-snug text-[var(--glove-muted)]">
                  {item.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </GloveRevealGroup>
    </GloveSection>
  );
}
