import type { TemplateListRow } from "~/lib/template-fields";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscHeading } from "../shared/umsc-heading";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  values: TemplateListRow[];
};

/**
 * UmscAboutValues — design.md "About #4": three columns separated by
 * hairlines (NOT icon cards). Hideable (about.values).
 */
export function UmscAboutValues({ heading, values }: Props) {
  if (values.length === 0) return null;

  return (
    <UmscSection
      tone="paper"
      aria-label="Our values"
      sectionAttrs={sectionGroupAttr("about", "values")}
    >
      {heading && (
        <UmscHeading
          as="h2"
          fieldKey="umsc.about.values-heading"
          className="mb-10"
        >
          {heading}
        </UmscHeading>
      )}
      <UmscRevealGroup className="grid grid-cols-1 divide-y divide-[var(--umsc-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {values.slice(0, 4).map((value, i) => {
          const title = typeof value.title === "string" ? value.title : "";
          const body = typeof value.body === "string" ? value.body : "";
          return (
            <div
              key={value._id ?? `${title}-${i}`}
              className="umsc-reveal-item flex flex-col gap-3 px-0 py-8 sm:px-10 sm:py-0 first:sm:pl-0 last:sm:pr-0"
              style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
            >
              <h3 className="umsc-serif m-0 text-[22px] leading-[1.15] text-[var(--umsc-ink)]">
                {title}
              </h3>
              {body && (
                <p className="umsc-sans m-0 max-w-[42ch] text-[15px] leading-[1.7] text-[var(--umsc-muted)]">
                  {body}
                </p>
              )}
            </div>
          );
        })}
      </UmscRevealGroup>
    </UmscSection>
  );
}
