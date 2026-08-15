import type { DefaultAboutPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";

/**
 * Coop About page — pixel-exact transcription of
 * `building-clone/src/app/new-page-2/page.tsx` (data-cid n35–n77), minus
 * the chrome (header/mobile menu/footer are rendered by `CoopLayout`).
 *
 * `resolveFields` is imported from the template root (`_templates/coop/index.ts`
 * per the field-conventions.md pattern). This page's own field keys are
 * registered in `./index.ts` (`coopAboutData`); the root aggregator merges
 * them in once wired up, at which point this component resolves real owner
 * values (until then it renders each field's own `defaultValue`, which is
 * the exact clone copy — nothing here is "broken" in the interim).
 *
 * Structural notes (see docs/templates/coop/build/reports/B-phase3.md for the
 * full rationale):
 * - The page has no distinct hero/title block in the source — the FIRST
 *   heading in DOM order (intro paragraph 1) is promoted from <h3> to <h1>
 *   per the port rules' "one h1 per page" requirement. Classes are
 *   byte-identical to the clone; only the tag name changed.
 * - The page background is `--coop-surface` (#fafafa) via the
 *   `.coop-surface-page` modifier class (chrome-provided), applied on a
 *   full-width wrapper so it reaches the page edges, matching the clone's
 *   `<body class="cn0">` (which sets this at the document level).
 * - All `[animation-name:anim-opacity-*]` classes from the source are
 *   stripped (dead code — never emitted in the rendered ground truth).
 * - Every invisible spacer div and before:/after: clearfix chain is kept
 *   verbatim; they carry the source's exact vertical rhythm.
 * - Every classless CMS-block scaffolding div the clone wraps around each
 *   text/figure node (n43/n44, n49/n50, n60/n61, n64/n65, n71, n74/n75) is
 *   also kept, per docs/templates/coop/build/reports/B-phase3.5.md — a
 *   Phase 3.5 review fix (Phase 3 had collapsed them). `box-content` is
 *   dropped from all of them per the template-wide convention established
 *   in `coop-header.tsx`/`coop-footer.tsx`/`coop-homepage.tsx` (Tailwind's
 *   default border-box sizing renders identically here — none of these
 *   wrappers combine an own width/height with own padding/border).
 */

const FIELD_KEYS = [
  "coop.about.intro-paragraph-1",
  "coop.about.intro-paragraph-2",
  "coop.about.statement",
  "coop.about.portrait-image",
  "coop.about.portrait-caption",
  "coop.about.founding-text",
  "coop.about.cooperative-text",
] as const;

const LABEL_HEADING_CLASS =
  "block text-center text-sm leading-[0.9375rem] tracking-[0.42px] whitespace-pre-wrap uppercase text-[var(--coop-color-002)] [font-family:var(--font-coop-label)]";

export function CoopAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, [...FIELD_KEYS]);

  const introParagraph1 = f["coop.about.intro-paragraph-1"] ?? "";
  const introParagraph2 = f["coop.about.intro-paragraph-2"] ?? "";
  const statement = f["coop.about.statement"] ?? "";
  const portraitImage =
    f["coop.about.portrait-image"] ?? "/templates/coop/images/9d43af51d9a2.jpg";
  const portraitCaption = f["coop.about.portrait-caption"] ?? "";
  const foundingText = f["coop.about.founding-text"] ?? "";
  const cooperativeText = f["coop.about.cooperative-text"] ?? "";

  return (
    <div className="coop-surface-page block">
      <section
        aria-label="About"
        {...sectionGroupAttr("about", "main")}
        className="max-coop-md:px-5 max-coop-md:py-15 coop-md:max-coop-lg:px-9 coop-md:max-coop-lg:py-30 mx-auto block max-w-425 px-[10.9375rem] py-[7.8125rem]"
      >
        <div className="block">
          {/* Clone n37 — three-column row: left spacer / paragraphs 1+2 / right spacer */}
          <div className="max-coop-md:h-auto coop-md:max-coop-lg:h-[419.3px] coop-2xl:h-[303.1px] -mx-[1.0625rem] block h-[375.7px] before:table before:h-0 before:w-0 before:content-[''] after:table after:h-0 after:w-0 after:content-['']">
            <div className="max-coop-md:float-none max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:w-[182.5px] coop-2xl:w-86.5 float-left block w-[15.0625rem]">
              <div className="max-coop-md:hidden relative clear-both block px-[1.0625rem]">
                <div className="max-coop-md:hidden invisible block h-8.5 overflow-hidden" />
              </div>
            </div>

            <div className="max-coop-md:float-none max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:w-[22.8125rem] coop-2xl:w-173 float-left block w-120.5">
              <div className="max-coop-md:pt-[1.0625rem] relative block px-[1.0625rem] pb-[1.0625rem]">
                {/* Clone n43/n44 — classless CMS-block scaffolding divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <h1
                      {...fieldAttr("coop.about.intro-paragraph-1")}
                      className={LABEL_HEADING_CLASS}
                    >
                      {introParagraph1}
                    </h1>
                  </div>
                </div>
              </div>

              <div className="max-coop-md:hidden relative clear-both block p-[1.0625rem]">
                <div className="max-coop-md:hidden invisible block h-8.5 overflow-hidden" />
              </div>

              <div className="relative block p-[1.0625rem]">
                {/* Clone n49/n50 — classless CMS-block scaffolding divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <h3
                      {...fieldAttr("coop.about.intro-paragraph-2")}
                      className={LABEL_HEADING_CLASS}
                    >
                      {introParagraph2}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="max-coop-md:hidden relative clear-both block p-[1.0625rem]">
                <div className="max-coop-md:hidden invisible block h-8.5 overflow-hidden" />
              </div>
            </div>

            <div className="max-coop-md:float-none max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:w-[182.5px] coop-2xl:w-86.5 float-left block w-[15.0625rem]">
              <div className="max-coop-md:hidden relative clear-both block px-[1.0625rem]">
                <div className="max-coop-md:hidden invisible block h-8.5 overflow-hidden" />
              </div>
            </div>
          </div>

          {/* Clone n57 — centered statement, portrait figure, founding/structure text */}
          <div className="max-coop-md:h-auto coop-md:max-coop-lg:h-[3299.7px] -mx-[1.0625rem] block h-[205.325rem] before:table before:h-0 before:w-0 before:content-[''] after:table after:h-0 after:w-0 after:content-['']">
            <div className="max-coop-md:float-none float-left block w-full">
              <div className="max-coop-md:mx-0 max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:mx-[3.8rem] coop-md:max-coop-lg:w-[608.3px] coop-2xl:mx-[230.7px] coop-2xl:w-[57.6625rem] relative mx-[160.7px] block w-[40.1625rem] p-[1.0625rem]">
                {/* Clone n60/n61 — classless CMS-block scaffolding divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <h3
                      {...fieldAttr("coop.about.statement")}
                      className={LABEL_HEADING_CLASS}
                    >
                      {statement}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="relative clear-both block p-[1.0625rem]">
                {/* Clone n64/n65 — classless CMS-block scaffolding divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <figure className="max-coop-md:mx-0 coop-md:max-coop-lg:mx-[3.5625rem] coop-2xl:mx-96 mx-43.5 block max-w-145.5">
                      <div className="relative block overflow-hidden text-center leading-0">
                        <div
                          className="max-coop-md:pb-[110.5125rem] relative block overflow-hidden pb-[192rem]"
                          style={{
                            maskImage:
                              "-webkit-radial-gradient(center, var(--coop-background), var(--coop-clr-1))",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- matches other coop images.
                              No `srcSet`/`sizes` here: those were hardcoded to the ORIGINAL clone
                              photo's responsive variants, so browsers kept selecting a clone-owned
                              file over an owner-uploaded `src` (srcSet always wins when it matches
                              `sizes`). We have no way to derive equivalent width variants for an
                              arbitrary owner upload, so this renders the single `src` at all sizes —
                              same tradeoff `stackBAssetFor` already makes for gallery photo swaps. */}
                          <img
                            className="absolute top-0 left-0 block aspect-[auto_582/3072] h-full w-full overflow-clip object-cover"
                            alt=""
                            height="3072"
                            src={portraitImage}
                            width="582"
                          />
                        </div>
                      </div>

                      <figcaption className="block pt-4.5">
                        {/* Clone n71 — classless CMS-block scaffolding div, kept for exact hierarchy */}
                        <div className="block">
                          <p
                            {...fieldAttr("coop.about.portrait-caption")}
                            className="block text-xs leading-[1.25rem] whitespace-pre-wrap"
                          >
                            {portraitCaption}
                          </p>
                        </div>
                      </figcaption>
                    </figure>
                  </div>
                </div>
              </div>

              <div className="max-coop-md:mx-0 max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:mx-[3.8rem] coop-md:max-coop-lg:w-[608.3px] coop-2xl:mx-[230.7px] coop-2xl:w-[57.6625rem] relative mx-[160.7px] block w-[40.1625rem] p-[1.0625rem]">
                {/* Clone n74/n75 — classless CMS-block scaffolding divs, kept for exact hierarchy */}
                <div className="block">
                  <div className="block">
                    <h3
                      {...fieldAttr("coop.about.founding-text")}
                      className={`mb-3.5 ${LABEL_HEADING_CLASS}`}
                    >
                      {foundingText}
                    </h3>
                    <h3
                      {...fieldAttr("coop.about.cooperative-text")}
                      className={`mt-[0.9375rem] ${LABEL_HEADING_CLASS}`}
                    >
                      {cooperativeText}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
