import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

type Props = {
  coops: TemplateListRow[];
};

/**
 * Co-op logo grid: square cells, logos object-contain, links out, quiet
 * hover (opacity transition, no transforms — matches design.md's hover
 * register). Hideable (testimonials.coops).
 */
export function WealthTestimonialsCoops({ coops }: Props) {
  if (coops.length === 0) return null;

  return (
    <section
      aria-label="Supported co-op logos"
      {...sectionGroupAttr("testimonials", "coops")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[var(--wealth-container)] px-[var(--wealth-gutter)]">
        <ul className="grid list-none grid-cols-2 gap-[var(--wealth-gutter)] sm:grid-cols-3 md:grid-cols-4">
          {coops.map((coop, i) => {
            const logo = typeof coop.logo === "string" ? coop.logo : "";
            const name = typeof coop.name === "string" ? coop.name : "";
            const url = typeof coop.url === "string" ? coop.url : "";
            const isExternal = /^https?:\/\//i.test(url);

            const tile = (
              <div className="relative aspect-square w-full bg-[var(--wealth-surface)]">
                {logo ? (
                  <Image
                    src={logo}
                    alt={name ? `${name} logo` : ""}
                    fill
                    sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-contain p-[var(--wealth-gutter)]"
                  />
                ) : null}
              </div>
            );

            return (
              <li key={coop._id ?? i}>
                {url ? (
                  <a
                    href={url}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="block transition-opacity duration-100 ease-in-out hover:opacity-70 focus-visible:opacity-70"
                    aria-label={name || undefined}
                  >
                    {tile}
                  </a>
                ) : (
                  tile
                )}
                {name ? (
                  <p className="mt-2 text-center text-sm">{name}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
