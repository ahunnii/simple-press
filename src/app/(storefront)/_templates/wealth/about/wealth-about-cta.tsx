import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLink } from "../shared/wealth-link";

type Props = {
  label: string;
  url: string;
};

/** Quiet closing wealth-link to Contact. Hideable (about.cta). */
export function WealthAboutCta({ label, url }: Props) {
  if (!label.trim()) return null;

  return (
    <section
      aria-label="Contact link"
      {...sectionGroupAttr("about", "cta")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[720px] px-[var(--wealth-gutter)] text-center">
        <WealthLink href={url || "/contact"}>
          <span {...fieldAttr("wealth.about.cta-label")}>{label}</span>
        </WealthLink>
      </div>
    </section>
  );
}
