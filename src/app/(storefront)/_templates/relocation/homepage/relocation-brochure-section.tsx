import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { RelocationReveal } from "../shared/relocation-reveal";

/**
 * The brochure CTA is an external PDF and therefore has to open in a new tab.
 * `RelocationPillButton` deliberately exposes no `target`, so the pill shape is
 * reproduced here on a plain anchor — same tokens, same `.relocation-hover-fade`
 * micro-interaction, so a theme change still recolours it.
 */
const PILL_CLASS =
  "relocation-hover-fade inline-block cursor-pointer rounded-[var(--relocation-radius)] border-2 border-solid border-[var(--relocation-paper)] bg-[var(--relocation-terracotta)] px-6 py-[0.5625rem] text-center [font-family:var(--font-relocation-display)] text-[1.0625rem] leading-5 tracking-[0.45px] text-[var(--relocation-paper)]";

/**
 * Homepage §9 — the brochure band (design.md → Homepage): a grey full-bleed
 * band with "Preparing for your move?" on the left and the FMCSA
 * "Ready to Move" brochure link on the right.
 */
export function RelocationBrochureSection({
  customFields,
}: {
  customFields: unknown;
}) {
  const f = resolveFields(customFields, [
    "relocation.homepage.brochure-heading",
    "relocation.homepage.brochure-body",
    "relocation.homepage.brochure-cta-label",
    "relocation.homepage.brochure-cta-url",
  ]);

  const ctaLabel = f["relocation.homepage.brochure-cta-label"] ?? "";
  const ctaUrl = f["relocation.homepage.brochure-cta-url"] ?? "";

  return (
    <section
      {...sectionGroupAttr("homepage", "brochure")}
      aria-labelledby="relocation-brochure-heading"
      className="w-full bg-[var(--relocation-card)] py-14 min-[1025px]:py-21"
    >
      <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
        <div className="grid gap-8 min-[1025px]:grid-cols-2 min-[1025px]:items-center min-[1025px]:gap-16">
          <RelocationReveal>
            <h2
              id="relocation-brochure-heading"
              {...fieldAttr("relocation.homepage.brochure-heading")}
              className="[font-family:var(--font-relocation-display)] text-[2.8125rem] leading-[3rem] font-semibold text-balance text-[var(--relocation-charcoal)] min-[1025px]:text-[4rem] min-[1025px]:leading-[4.25rem]"
            >
              {f["relocation.homepage.brochure-heading"] ?? ""}
            </h2>
          </RelocationReveal>

          <RelocationReveal>
            <p
              {...fieldAttr("relocation.homepage.brochure-body")}
              className="[font-family:var(--font-relocation-body)] text-[1.1875rem] leading-[1.875rem] font-medium tracking-[-0.19px] text-[var(--relocation-ink)] min-[1025px]:text-[1.4375rem] min-[1025px]:leading-[2.25rem] min-[1025px]:tracking-[-0.23px]"
            >
              {f["relocation.homepage.brochure-body"] ?? ""}
            </p>

            {ctaLabel !== "" && ctaUrl !== "" ? (
              <div className="mt-6">
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={PILL_CLASS}
                >
                  <span
                    {...fieldAttr("relocation.homepage.brochure-cta-label")}
                  >
                    {ctaLabel}
                  </span>
                </a>
              </div>
            ) : null}
          </RelocationReveal>
        </div>
      </div>
    </section>
  );
}
