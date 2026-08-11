import type { RelocationIconRow } from ".";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { getListFieldValue } from "~/lib/template-fields";

import { DEFAULT_RELOCATION_SERVICES } from ".";
import { toRelocationIconRows } from "./rows";
import { RelocationRevealGroup } from "../shared/relocation-reveal";

/**
 * Homepage §3 — the illustrated service rows (design.md → Homepage).
 *
 * The screenshot lays these out as TWO columns of icon-left / copy-right rows,
 * the first column carrying the first three services and the second the
 * remaining two — not as full-width alternating rows. The split is computed
 * here rather than left to CSS columns so the distribution is deterministic
 * (CSS multi-column balances by height, which would reshuffle the moment an
 * owner edits a blurb) and so the single-column mobile stack keeps the source's
 * 1-2-3-4-5 reading order.
 */
function ServiceRow({ row, index }: { row: RelocationIconRow; index: number }) {
  return (
    <div
      className="relocation-reveal-item flex items-center gap-5 min-[1025px]:gap-7"
      style={{ ["--i" as string]: Math.min(index, 7) }}
    >
      {row.image !== "" ? (
        <img
          src={row.image}
          alt={row.alt}
          width={140}
          height={140}
          loading="lazy"
          decoding="async"
          className="block w-[6rem] shrink-0 object-contain min-[1025px]:w-[8.3125rem]"
        />
      ) : null}

      <div className="min-w-0">
        <h3 className="[font-family:var(--font-relocation-display)] text-[1.5rem] leading-[1.9rem] font-semibold text-[var(--relocation-red)] min-[1025px]:text-[1.6875rem] min-[1025px]:leading-[2.1rem]">
          {row.title}
        </h3>
        {row.text !== "" ? (
          <p className="mt-3 [font-family:var(--font-relocation-body)] text-base leading-[1.625rem] font-bold text-[var(--relocation-ink)] min-[1025px]:mt-4 min-[1025px]:text-[1.125rem] min-[1025px]:leading-[1.8125rem]">
            {row.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RelocationServicesSection({
  customFields,
}: {
  customFields: unknown;
}) {
  const rows = toRelocationIconRows(
    getListFieldValue(customFields, "relocation.homepage.services-list"),
    DEFAULT_RELOCATION_SERVICES,
  );

  if (rows.length === 0) return null;

  const splitAt = Math.ceil(rows.length / 2);
  const leftColumn = rows.slice(0, splitAt);
  const rightColumn = rows.slice(splitAt);

  return (
    <section
      {...sectionGroupAttr("homepage", "services")}
      aria-label="What we do"
      className="w-full bg-[var(--relocation-paper)] py-14 min-[1025px]:py-21"
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <RelocationRevealGroup className="grid gap-y-12 min-[1025px]:grid-cols-2 min-[1025px]:gap-x-16">
          <div className="flex flex-col gap-12">
            {leftColumn.map((row, i) => (
              <ServiceRow key={`${row.title}-${i}`} row={row} index={i} />
            ))}
          </div>

          {rightColumn.length > 0 ? (
            <div className="flex flex-col gap-12">
              {rightColumn.map((row, i) => (
                <ServiceRow
                  key={`${row.title}-${splitAt + i}`}
                  row={row}
                  index={splitAt + i}
                />
              ))}
            </div>
          ) : null}
        </RelocationRevealGroup>
      </div>
    </section>
  );
}
