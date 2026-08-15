import type { DefaultFooterTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";

/**
 * Clone footer (data-cid n64–n84), transcribed verbatim: `--coop-color-004`
 * background, centered social nav (Instagram + Facebook), and a trailing
 * invisible spacer that preserves the clone's exact footer height. The
 * clone's purely-decorative zero-height float/clearfix scaffolding around
 * the nav (`footerBlocksTop/Middle/Bottom`, all empty) is not reproduced —
 * it contributes 0px by construction (empty floated children + `before/
 * after: table w-0 h-0` clearfix), so dropping it changes nothing visually.
 */
export function CoopFooter({ business }: DefaultFooterTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "coop.global.footer.instagramLabel",
    "coop.global.footer.instagramUrl",
    "coop.global.footer.facebookLabel",
    "coop.global.footer.facebookUrl",
  ]);

  const instagramLabel = f["coop.global.footer.instagramLabel"] ?? "Instagram";
  const instagramUrl =
    f["coop.global.footer.instagramUrl"] ??
    "https://www.instagram.com/buildingcooperatively";
  const facebookLabel = f["coop.global.footer.facebookLabel"] ?? "Facebook";
  const facebookUrl =
    f["coop.global.footer.facebookUrl"] ??
    "https://www.facebook.com/Building.Cooperatively/";

  return (
    <footer
      {...sectionGroupAttr("global", "branding")}
      className="block bg-[var(--coop-color-004)]"
      role="contentinfo"
    >
      <div className="max-coop-md:p-5 coop-md:max-coop-lg:p-9 mx-auto max-w-425 px-[10.9375rem] py-[7.8125rem]">
        <nav
          className="-mr-3.5 block py-5 text-center [font-family:var(--font-coop-label)] text-sm leading-[1.8125rem] font-bold tracking-[0.7px] uppercase"
          aria-label="Social links"
        >
          <div className="inline">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="coop-footer-link inline-block cursor-pointer pr-3.5 text-[var(--coop-background)]"
              {...fieldAttr("coop.global.footer.instagramLabel")}
            >
              {instagramLabel}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="coop-footer-link inline-block cursor-pointer pr-3.5 text-[var(--coop-background)]"
              {...fieldAttr("coop.global.footer.facebookLabel")}
            >
              {facebookLabel}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>
        </nav>

        {/* pt-5 wrapper + invisible h-8.5 spacer — clone's exact trailing
            footer spacing (data-cid n78/n84); width/centering are irrelevant
            since the block is invisible. */}
        <div className="pt-5">
          <div
            aria-hidden="true"
            className="invisible block h-8.5 overflow-hidden"
          />
        </div>
      </div>
    </footer>
  );
}
