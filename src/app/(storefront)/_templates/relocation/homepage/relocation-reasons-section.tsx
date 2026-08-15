import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { getListFieldValue } from "~/lib/template-fields";

import { DEFAULT_RELOCATION_REASONS } from ".";
import { resolveFields } from "..";
import {
  RelocationReveal,
  RelocationRevealGroup,
} from "../shared/relocation-reveal";
import { RelocationSectionHeading } from "../shared/relocation-section-heading";
import { toRelocationIconRows } from "./rows";

/**
 * Homepage §6 — "3 GREAT REASONS TO CHOOSE HANDY" (design.md → Homepage):
 * terracotta heading over three centred icon + title + copy columns.
 */
export function RelocationReasonsSection({
  customFields,
}: {
  customFields: unknown;
}) {
  const f = resolveFields(customFields, [
    "relocation.homepage.reasons-heading",
  ]);

  const rows = toRelocationIconRows(
    getListFieldValue(customFields, "relocation.homepage.reasons-list"),
    DEFAULT_RELOCATION_REASONS,
  );

  return (
    <section
      {...sectionGroupAttr("homepage", "reasons")}
      aria-labelledby="relocation-reasons-heading"
      className="w-full bg-[var(--relocation-paper)] py-14 min-[1025px]:py-21"
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <RelocationReveal>
          <RelocationSectionHeading
            id="relocation-reasons-heading"
            fieldAttrs={fieldAttr("relocation.homepage.reasons-heading")}
            className="whitespace-pre-line"
          >
            {f["relocation.homepage.reasons-heading"] ?? ""}
          </RelocationSectionHeading>
        </RelocationReveal>

        {rows.length > 0 ? (
          <RelocationRevealGroup className="mt-12 grid gap-12 min-[572px]:grid-cols-2 min-[1025px]:mt-16 min-[1025px]:grid-cols-3 min-[1025px]:gap-16">
            {rows.map((row, i) => (
              <div
                key={`${row.title}-${i}`}
                className="relocation-reveal-item flex flex-col items-center text-center"
                style={{ ["--i" as string]: Math.min(i, 7) }}
              >
                {row.image !== "" ? (
                  <img
                    src={row.image}
                    alt={row.alt}
                    width={240}
                    height={190}
                    loading="lazy"
                    decoding="async"
                    className="mb-6 block h-[7rem] w-auto max-w-full object-contain min-[1025px]:h-[8.375rem]"
                  />
                ) : null}

                <h3 className="[font-family:var(--font-relocation-display)] text-[1.1875rem] leading-[1.875rem] font-semibold text-[var(--relocation-ink)] min-[1025px]:text-[1.4375rem] min-[1025px]:leading-[2.25rem]">
                  {row.title}
                </h3>

                {row.text !== "" ? (
                  <p className="mt-4 [font-family:var(--font-relocation-body)] text-base leading-[1.625rem] font-medium text-[var(--relocation-ink)] min-[1025px]:text-[1.125rem] min-[1025px]:leading-[1.8125rem]">
                    {row.text}
                  </p>
                ) : null}
              </div>
            ))}
          </RelocationRevealGroup>
        ) : null}
      </div>
    </section>
  );
}
