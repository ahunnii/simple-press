import { UmscAccordion, UmscAccordionItem } from "../shared/umsc-accordion";
import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscSection } from "../shared/umsc-section";

export type UmscFaqRow = {
  id: string;
  question: string;
  answer: string;
};

type Props = {
  heading: string;
  lede: string;
  allLabel: string;
  allUrl: string;
  items: UmscFaqRow[];
  sectionAttrs?: Record<string, string>;
};

/**
 * UmscFaqSection (homepage.faq) — cream; h2 "Good to know." + lede +
 * "All questions →" left column; right: first three `api.faq.list()` items
 * in `UmscAccordion` (first one open). The parent hides this section
 * entirely when there are no FAQ items yet, in addition to the owner's
 * visibility toggle (design.md "Homepage → Questions").
 */
export function UmscFaqSection({
  heading,
  lede,
  allLabel,
  allUrl,
  items,
  sectionAttrs,
}: Props) {
  return (
    <UmscSection
      tone="cream"
      aria-labelledby="umsc-faq-heading"
      sectionAttrs={sectionAttrs}
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <UmscHeading
            as="h2"
            id="umsc-faq-heading"
            fieldKey="umsc.homepage.faq-heading"
          >
            {heading}
          </UmscHeading>
          {lede && (
            <UmscLede fieldKey="umsc.homepage.faq-lede" className="mt-4">
              {lede}
            </UmscLede>
          )}
          {allLabel && (
            <div className="mt-6">
              <UmscButton
                variant="link"
                href={allUrl}
                fieldKey="umsc.homepage.faq-all-label"
              >
                {allLabel}
              </UmscButton>
            </div>
          )}
        </div>

        <UmscAccordion>
          {items.map((item, i) => (
            <UmscAccordionItem
              key={item.id}
              title={item.question}
              defaultOpen={i === 0}
            >
              <p className="umsc-sans m-0 text-[15px] leading-[1.6] text-[var(--umsc-muted)]">
                {item.answer}
              </p>
            </UmscAccordionItem>
          ))}
        </UmscAccordion>
      </div>
    </UmscSection>
  );
}
