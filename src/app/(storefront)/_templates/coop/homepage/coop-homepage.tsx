import type { DefaultHomepageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { CoopParallaxBackground } from "../shared/coop-parallax-background";

/**
 * Homepage — exact port of `building-clone/src/app/page.tsx` main content
 * (data-cid n48–n63): the full-viewport parallax hero (id "introduction")
 * and the empty white spacer band (id "new-page"). Chrome (header/footer,
 * n1–n45 / n64+) is rendered by `CoopLayout` and is out of scope here.
 *
 * The clone's hero statement is marked up as an `<h2>` beneath an empty
 * `<h3>` overline slot. Per design.md's semantics rule, the statement is
 * promoted to `<h1>` here (visually identical — heading tags inherit all
 * type styles from the token classes) so the page has exactly one `<h1>`;
 * every class stays byte-identical to the clone otherwise.
 *
 * Purely-decorative wrapper divs with no classes beyond `block` (clone
 * data-cid n50/n54/n55/n61) and the invisible spacer (n60) are kept for
 * exact hierarchy/spacing per design.md Port rule 9. `box-content` is
 * dropped throughout, matching the convention already established by
 * `coop-header.tsx`/`coop-footer.tsx` (Tailwind's default border-box sizing
 * renders identically for these box-model values).
 */
export function CoopHomepage({ business }: DefaultHomepageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "coop.homepage.hero-image",
    "coop.homepage.hero-image-alt",
    "coop.homepage.hero-overline",
    "coop.homepage.hero-statement",
  ]);

  // || is intentional so an empty saved/unmerged value also falls back to the real cloned asset
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const heroImage =
    f["coop.homepage.hero-image"] ||
    "/templates/coop/images/web_background.webp";
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
  const heroImageAlt = f["coop.homepage.hero-image-alt"] ?? "";
  const heroOverline = f["coop.homepage.hero-overline"] ?? "";
  const heroStatement = f["coop.homepage.hero-statement"] ?? "";

  return (
    <>
      <section
        {...sectionGroupAttr("homepage", "hero")}
        id="introduction"
        className="max-coop-md:h-[33.725rem] max-coop-md:min-h-[33.725rem] coop-md:max-coop-lg:h-[51.2rem] coop-md:max-coop-lg:min-h-[51.2rem] coop-2xl:h-216 coop-2xl:min-h-216 relative flex h-[750.5px] min-h-160 overflow-hidden text-[var(--coop-background)]"
      >
        <CoopParallaxBackground src={heroImage} alt={heroImageAlt} />

        <div className="max-coop-md:mt-0 max-coop-md:h-[33.725rem] max-coop-md:px-5 max-coop-md:py-15 coop-md:max-coop-lg:h-[40.825rem] coop-md:max-coop-lg:px-9 coop-md:max-coop-lg:py-30 coop-2xl:h-174.5 coop-2xl:py-60 relative z-2 mx-auto mt-41.5 flex h-[584.5px] max-w-425 flex-col justify-center px-[10.9375rem] py-45">
          <div className="block">
            <div className="max-coop-md:h-auto coop-md:max-coop-lg:h-[263.5px] coop-2xl:h-[146.5px] -mx-[1.0625rem] block h-[224.5px] before:table before:h-0 before:w-0 before:content-[''] after:table after:h-0 after:w-0 after:content-['']">
              <div className="max-coop-md:[float:initial] max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:w-[41.825rem] coop-2xl:w-[1268.7px] float-left block w-[883.7px]">
                <div className="max-coop-md:py-[1.0625rem] relative block px-[1.0625rem]">
                  <div className="block">
                    <div className="block">
                      <h3
                        {...fieldAttr("coop.homepage.hero-overline")}
                        className="mb-3.5 block [font-family:var(--font-coop-label)] text-sm leading-[0.9375rem] tracking-[0.42px] whitespace-pre-wrap uppercase before:inline-block before:h-0 before:w-0 before:content-['']"
                      >
                        {heroOverline}
                      </h3>
                      <h1
                        {...fieldAttr("coop.homepage.hero-statement")}
                        className="max-coop-md:text-[1.75rem] max-coop-md:leading-7 max-coop-md:tracking-[-0.01px] mt-[0.9375rem] block [font-family:var(--font-coop-heading)] text-[2.4375rem] leading-[2.4375rem] tracking-[-0.78px] whitespace-pre-wrap"
                      >
                        {heroStatement}
                      </h1>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-coop-md:[float:initial] max-coop-md:w-[23.0625rem] coop-md:max-coop-lg:w-[3.8rem] coop-2xl:w-[115.3px] float-left block w-[80.3px]">
                <div className="max-coop-md:hidden relative clear-both block px-[1.0625rem]">
                  <div
                    aria-hidden="true"
                    className="max-coop-md:hidden invisible block h-8.5 overflow-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="-mx-[1.0625rem] block before:table before:h-0 before:w-0 before:content-[''] after:table after:h-0 after:w-0 after:content-['']" />
          </div>
        </div>
      </section>

      {isSectionVisible(customFields, "coop", "homepage.band") && (
        <section
          {...sectionGroupAttr("homepage", "band")}
          id="new-page"
          className="relative block overflow-hidden bg-[var(--coop-background)]"
        >
          <div className="max-coop-md:h-30 max-coop-md:px-5 max-coop-md:py-15 coop-md:max-coop-lg:px-9 mx-auto block h-37.5 max-w-425 px-[10.9375rem] py-[4.6875rem]" />
        </section>
      )}
    </>
  );
}
